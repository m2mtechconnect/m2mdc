import { ActiveTwinProvider } from '@/context/ActiveTwinContext';
import { RBACProvider } from '@/contexts/RBACContext';
import { CoPilotProvider } from '@/contexts/CoPilotContext';
import { CoPilotCommandProvider } from '@/contexts/CoPilotCommandContext';
import DataCentreTwin from './DataCentreTwin';

/**
 * Public read-only twin demo boundary.
 *
 * Operational providers are intentionally kept inside this lazy-loaded route
 * so the anonymous marketing landing does not initialize RBAC, twin state or
 * their data dependencies. The demo itself retains the contexts it inherited
 * from the former global application wrapper.
 */
export default function PublicDataCentreTwin() {
  return (
    <RBACProvider>
      <ActiveTwinProvider>
        <CoPilotProvider>
          <CoPilotCommandProvider>
            <DataCentreTwin />
          </CoPilotCommandProvider>
        </CoPilotProvider>
      </ActiveTwinProvider>
    </RBACProvider>
  );
}
