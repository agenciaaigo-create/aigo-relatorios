import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Inventory from "./Inventory";
import Financeiro from "./Financeiro";

// VITE_APP=financeiro → site separado, só com o financeiro (o site de relatórios não o inclui)
const SOMENTE_FINANCEIRO = import.meta.env.VITE_APP === "financeiro";

function Root() {
  const path = window.location.pathname;
  if (SOMENTE_FINANCEIRO) return <Financeiro />;
  if (path.startsWith("/estoque")) return <Inventory />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
