import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Inventory from "./Inventory";

const NAV_STYLE = {
  position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
  display: "flex", gap: 4, zIndex: 200,
  background: "rgba(7,1,15,.9)", backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,.1)", borderRadius: 100,
  padding: "5px 6px", boxShadow: "0 8px 32px rgba(0,0,0,.6)",
  fontFamily: "'Montserrat',sans-serif",
};

function Root() {
  const [page, setPage] = useState(() => {
    return sessionStorage.getItem("aigo-page") || "inventory";
  });

  function go(p) {
    setPage(p);
    sessionStorage.setItem("aigo-page", p);
  }

  return (
    <>
      {page === "reports"   && <App />}
      {page === "inventory" && <Inventory />}

      {/* Floating nav */}
      <div style={NAV_STYLE}>
        {[
          { id: "inventory", label: "📦 Estoque" },
          { id: "reports",   label: "📊 Relatórios" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => go(id)}
            style={{
              background: page === id ? "rgba(124,58,237,.35)" : "transparent",
              border: page === id ? "1px solid rgba(124,58,237,.55)" : "1px solid transparent",
              borderRadius: 100, padding: "7px 18px",
              color: page === id ? "#c084fc" : "rgba(255,255,255,.4)",
              fontWeight: page === id ? 700 : 500, fontSize: 12,
              fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
              transition: "all .18s", whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
