import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Inventory from "./Inventory";
import Financeiro from "./Financeiro";

// VITE_APP=financeiro → site publicado só com o financeiro (link separado)
const SOMENTE_FINANCEIRO = import.meta.env.VITE_APP === "financeiro";

function Root() {
  const path = window.location.pathname;
  if (SOMENTE_FINANCEIRO || path.startsWith("/financeiro")) return <Financeiro />;
  if (path.startsWith("/estoque")) return <Inventory />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
