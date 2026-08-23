import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./styles/simulation-v2.css";
import "./i18n/config";
import { stampBuildFingerprint } from "./lib/buildFingerprint";

// Deployment verification reads these attributes off <html>.
stampBuildFingerprint();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
