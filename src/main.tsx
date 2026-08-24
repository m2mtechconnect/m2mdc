import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./styles/simulation-v2.css";
import "./i18n/config";
import { stampBuildFingerprint } from "./lib/buildFingerprint";
import { startRuntimeMonitoring } from "./monitoring/runtimeMonitoring";

// Deployment verification reads these attributes off <html>.
stampBuildFingerprint();

// External delivery is fail-closed and remains disabled unless an explicit
// public analytics configuration is supplied at build time.
startRuntimeMonitoring();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
