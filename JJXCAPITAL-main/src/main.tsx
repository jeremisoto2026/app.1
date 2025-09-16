import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css"; // puedes crear un css básico o dejarlo vacío

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);