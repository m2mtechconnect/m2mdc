import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { CoPilotDockedPanel } from '@/components/copilot/CoPilotDockedPanel';

export function CoPilotPanel() {
  const { isOpen, setIsOpen } = useCoPilotContext();
  
  const handleClose = () => {
    console.log('[CoPilotPanel] Closing panel, isOpen:', isOpen);
    setIsOpen(false);
  };
  
  return (
    <CoPilotDockedPanel
      isOpen={isOpen}
      onClose={handleClose}
    />
  );
}
