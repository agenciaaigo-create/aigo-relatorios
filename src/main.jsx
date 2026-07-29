import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Inventory from "./Inventory";

function Root() {
  const path = window.location.pathname;
  if (path.startsWith("/estoque")) return <Inventory />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
