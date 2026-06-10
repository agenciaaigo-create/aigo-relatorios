// Discovers Drive folder structure: root → clients → months → files
// POST body: { rootFolderId, clientFolderId?, monthFolderId? }
//   - rootFolderId only       → returns client subfolder list
//   - clientFolderId          → returns month subfolder list
//   - monthFolderId           → returns files in that month folder

const VIDEO_EXTS = new Set([".mp4",".mov",".avi",".mkv",".webm",".m4v"]);
const IMAGE_EXTS = new Set([".jpg",".jpeg",".png",".gif",".webp",".heic"]);

const PT_MONTHS = {
  janeiro:1, fevereiro:2, março:3, marco:3, abril:4, maio:5,
  junho:6, julho:7, agosto:8, setembro:9, outubro:10,
  novembro:11, dezembro:12,
};

function guessType(name) {
  const low = name.toLowerCase();
  if (low.includes("reel"))                          return "Reel";
  if (low.includes("story") || low.includes("storie")) return "Story";
  if (low.includes("carrossel") || low.includes("carousel")) return "Carrossel";
  if (low.includes("bts"))                           return "BTS";
  if (low.includes("feed") || low.includes("post"))  return "Post";
  const ext = low.slice(low.lastIndexOf("."));
  if (VIDEO_EXTS.has(ext)) return "Reel";
  if (IMAGE_EXTS.has(ext)) return "Post";
  return "Outro";
}

function isMediaFile(f) {
  const name = f.name.toLowerCase();
  const ext  = name.slice(name.lastIndexOf("."));
  return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext) ||
         f.mimeType?.startsWith("video/") || f.mimeType?.startsWith("image/");
}

function isVideoFile(f) {
  const name = f.name.toLowerCase();
  const ext  = name.slice(name.lastIndexOf("."));
  return VIDEO_EXTS.has(ext) || f.mimeType?.startsWith("video/");
}

// Tipo de uma "pasta de conteúdo" (ex: "01 dia dos namorados") com base no
// nome da pasta ou, na falta de pistas, nos arquivos que ela contém.
function guessTypeForGroup(name, mediaFiles) {
  const byName = guessType(name);
  if (byName !== "Outro") return byName;
  if (mediaFiles.some(isVideoFile)) return "Reel";
  if (mediaFiles.length > 1) return "Carrossel";
  return "Post";
}

function parseMonthFromName(name) {
  const low = name.toLowerCase().replace(/[^a-záéíóúãõç0-9]/g,"");
  // Try numeric: "06", "6"
  const numMatch = name.match(/(\d{1,2})/);
  if (numMatch) {
    const n = parseInt(numMatch[1]);
    if (n >= 1 && n <= 12) return n;
  }
  // Try Portuguese name
  for (const [word, num] of Object.entries(PT_MONTHS)) {
    if (low.includes(word.replace(/[^a-z]/g,""))) return num;
  }
  return null;
}

async function getAccessToken(email, privateKey) {
  const now    = Math.floor(Date.now() / 1000);
  const header = { alg:"RS256", typ:"JWT" };
  const claim  = {
    iss: email, scope:"https://www.googleapis.com/auth/drive.readonly",
    aud:"https://oauth2.googleapis.com/token", exp:now+3600, iat:now,
  };
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sigInput = `${b64(header)}.${b64(claim)}`;
  const pem = privateKey.replace(/\\n/g,"\n");
  const keyDer = Buffer.from(
    pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,""), "base64"
  );
  const key = await crypto.subtle.importKey(
    "pkcs8", keyDer, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, Buffer.from(sigInput));
  const jwt = `${sigInput}.${Buffer.from(sig).toString("base64url")}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams({ grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer", assertion:jwt }),
  });
  const json = await resp.json();
  if (!json.access_token) throw new Error("Token falhou: "+JSON.stringify(json));
  return json.access_token;
}

// mode: "folders" → só subpastas | "files" → só arquivos | "all" → tudo
async function listFolder(folderId, token, mode = "files") {
  const mimeFilter = mode === "folders"
    ? " and mimeType='application/vnd.google-apps.folder'"
    : mode === "files"
    ? " and mimeType!='application/vnd.google-apps.folder'"
    : "";
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false${mimeFilter}`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200&orderBy=name`;
  const resp = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } });
  const json = await resp.json();
  if (!resp.ok) {
    const base = json.error?.message || "Erro Drive API";
    throw new Error(`${base} [folderId usado: "${folderId || ""}"]`);
  }
  return json.files || [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error:"Método não permitido" });

  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) {
    return res.status(500).json({ error:"Credenciais do Google Drive não configuradas." });
  }

  const { rootFolderId, clientFolderId, monthFolderId } = req.body || {};

  try {
    const token = await getAccessToken(email, privateKey);

    // Mode 3: list content pieces inside a month folder.
    // Cada peça pode ser um arquivo solto (vídeo/imagem) OU uma subpasta
    // (ex: "01 dia dos namorados") contendo os arquivos daquele post.
    if (monthFolderId) {
      const items = await listFolder(monthFolderId, token, "all");
      const FOLDER_MIME = "application/vnd.google-apps.folder";

      const looseFiles = items
        .filter(f => f.mimeType !== FOLDER_MIME && isMediaFile(f))
        .map(f => ({ id:f.id, name:f.name, type:guessType(f.name), platform:"Instagram" }));

      const subfolders = items.filter(f => f.mimeType === FOLDER_MIME);
      const folderGroups = await Promise.all(subfolders.map(async f => {
        const inner = await listFolder(f.id, token, "files");
        const media = inner.filter(isMediaFile);
        if (media.length === 0) return null;
        return {
          id: f.id,
          name: f.name.trim(),
          type: guessTypeForGroup(f.name, media),
          platform: "Instagram",
          notes: `${media.length} arquivo(s)`,
        };
      }));

      const files = [...folderGroups.filter(Boolean), ...looseFiles];
      return res.status(200).json({ files, total:files.length });
    }

    // Mode 2: list month subfolders inside a client folder
    if (clientFolderId) {
      const folders = await listFolder(clientFolderId, token, "folders");
      const months = folders.map(f => ({
        id:   f.id,
        name: f.name,
        month: parseMonthFromName(f.name),
      }));
      return res.status(200).json({ months });
    }

    // Mode 1: list client subfolders from root
    if (rootFolderId) {
      const folders = await listFolder(rootFolderId, token, "folders");
      const clients = folders.map(f => ({ id:f.id, name:f.name }));
      return res.status(200).json({ clients });
    }

    return res.status(400).json({ error:"Forneça rootFolderId, clientFolderId ou monthFolderId." });

  } catch(e) {
    return res.status(500).json({ error:String(e.message||e) });
  }
}
