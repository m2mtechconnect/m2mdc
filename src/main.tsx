import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./styles/simulation-v2.css";
import "./styles/recharts-containment.css";
import "./i18n/config";
import { stampBuildFingerprint } from "./lib/buildFingerprint";
import { startRuntimeMonitoring } from "./monitoring/runtimeMonitoring";
import { resolveRuntimeMonitoringConfig } from "./monitoring/observabilityBootstrap";

// Deployment verification reads these attributes off <html>.
stampBuildFingerprint();

// External delivery is fail-closed: the adapter activates only when the
// governed observability-config endpoint declares a configured provider.
// No provider keys exist in the browser; events relay through the backend.
void resolveRuntimeMonitoringConfig().then((config) => startRuntimeMonitoring(config));

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
