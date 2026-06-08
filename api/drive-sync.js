// Google Drive folder listing for content inventory sync
// Required env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY

const VIDEO_EXTS  = new Set([".mp4",".mov",".avi",".mkv",".webm",".m4v"]);
const IMAGE_EXTS  = new Set([".jpg",".jpeg",".png",".gif",".webp",".heic"]);

function guessType(name) {
  const low = name.toLowerCase();
  if (low.includes("reel"))     return "Reel";
  if (low.includes("story"))    return "Story";
  if (low.includes("carrossel") || low.includes("carousel")) return "Carrossel";
  if (low.includes("bts"))      return "BTS";
  if (low.includes("feed") || low.includes("post")) return "Post";
  const ext = low.slice(low.lastIndexOf("."));
  if (VIDEO_EXTS.has(ext))  return "Reel";
  if (IMAGE_EXTS.has(ext))  return "Post";
  return "Outro";
}

async function getAccessToken(email, privateKey) {
  const now    = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim  = {
    iss: email, scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now,
  };

  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sigInput = `${b64(header)}.${b64(claim)}`;

  // Import RSA key and sign
  const pem = privateKey.replace(/\\n/g, "\n");
  const keyDer = Buffer.from(
    pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ""),
    "base64"
  );
  const key = await crypto.subtle.importKey(
    "pkcs8", keyDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key,
    Buffer.from(sigInput)
  );
  const jwt = `${sigInput}.${Buffer.from(sig).toString("base64url")}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await resp.json();
  if (!json.access_token) throw new Error("Falha ao obter token: " + JSON.stringify(json));
  return json.access_token;
}

async function listDriveFiles(folderId, accessToken) {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message || "Erro ao listar Drive");
  return json.files || [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { folderId } = req.body || {};
  if (!folderId) {
    return res.status(400).json({ error: "folderId é obrigatório" });
  }

  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return res.status(500).json({
      error: "Credenciais do Google Drive não configuradas. Adicione GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY nas variáveis de ambiente do Vercel.",
    });
  }

  try {
    const token = await getAccessToken(email, privateKey);
    const raw   = await listDriveFiles(folderId, token);

    const files = raw
      .filter(f => {
        const name = f.name.toLowerCase();
        const ext  = name.slice(name.lastIndexOf("."));
        return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext) ||
               f.mimeType?.startsWith("video/") || f.mimeType?.startsWith("image/");
      })
      .map(f => ({
        id:       f.id,
        name:     f.name,
        type:     guessType(f.name),
        platform: "Instagram",
        mimeType: f.mimeType,
      }));

    return res.status(200).json({ files, total: files.length });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
