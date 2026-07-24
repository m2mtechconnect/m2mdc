/**
 * PR-0.1 Checkpoint B7.4E - Pilot shell.
 *
 * Mounts the PilotLayout and the two approved pilot routes. Rendered
 * *outside* the shared <Layout>, so none of the excluded application
 * providers, hooks or components are initialized here.
 */
import { Route, Routes, Navigate } from "react-router-dom";
import PilotLayout from "./PilotLayout";
import PilotOverview from "./PilotOverview";
import PilotAssetInspection from "./PilotAssetInspection";

export default function PilotShell() {
  return (
    <Routes>
      <Route element={<PilotLayout />}>
        <Route path="overview" element={<PilotOverview />} />
        <Route path="asset/:twinId" element={<PilotAssetInspection />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Route>
    </Routes>
  );
}