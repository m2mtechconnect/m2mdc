import { AOCGovernancePanel } from './AOCGovernancePanel';

interface AOCGovernanceTabProps {
  agentId: string;
}

export function AOCGovernanceTab({ agentId }: AOCGovernanceTabProps) {
  return (
    <div>
      <AOCGovernancePanel agentId={agentId} />
    </div>
  );
}
