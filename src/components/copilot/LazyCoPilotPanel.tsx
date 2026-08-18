/**
 * Optional-feature boundary for the AURA Assistant panel.
 *
 * The panel (chat surface, structured responses, resize logic) is not part
 * of the synchronous shell core: it is fetched the first time the user
 * opens the assistant. It renders as a sibling of the route outlet with
 * its own Suspense boundary, so it can never suspend route content.
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import { useCoPilotContext } from '@/contexts/CoPilotContext';

const CoPilotPanel = lazy(() =>
  import('@/components/copilot/CoPilotPanel').then((m) => ({ default: m.CoPilotPanel })),
);

export function LazyCoPilotPanel() {
  const { isOpen } = useCoPilotContext();
  // Once opened, keep it mounted so panel state survives close/open.
  const [everOpened, setEverOpened] = useState(false);
  useEffect(() => {
    if (isOpen) setEverOpened(true);
  }, [isOpen]);

  if (!everOpened) return null;
  return (
    <Suspense fallback={null}>
      <CoPilotPanel />
    </Suspense>
  );
}

export default LazyCoPilotPanel;
