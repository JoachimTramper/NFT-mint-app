// --- Node shims: MOET boven alle andere imports staan ---
import { Buffer } from "buffer";
import process from "process";

// Zet ze op window als ze er nog niet zijn
// (voorkomt dubbele-definitie in dev/hot-reload)
(window as any).Buffer = (window as any).Buffer ?? Buffer;
(window as any).process = (window as any).process ?? process;

// --- Jouw bestaande imports ---
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
