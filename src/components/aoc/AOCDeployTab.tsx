import { AOCEnvironmentPipeline } from './AOCEnvironmentPipeline';
import { AOCCloudDeployments } from './AOCCloudDeployments';
import { AOCVersionHistory } from './AOCVersionHistory';

interface AOCDeployTabProps {
  agentId: string;
  currentVersion: string;
}

export function AOCDeployTab({ agentId, currentVersion }: AOCDeployTabProps) {
  return (
    <div className="space-y-6">
      <AOCEnvironmentPipeline agentId={agentId} currentVersion={currentVersion} />
      <AOCCloudDeployments agentId={agentId} />
      <AOCVersionHistory agentId={agentId} />
    </div>
  );
}
