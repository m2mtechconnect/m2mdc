import { BuilderIntegrationsHub } from "./BuilderIntegrationsHub";

interface ConnectStepProps {
  systemId: string | null;
}

export function ConnectStep({ systemId }: ConnectStepProps) {
  return (
    <div className="space-y-6">
      <BuilderIntegrationsHub systemId={systemId} />
    </div>
  );
}
