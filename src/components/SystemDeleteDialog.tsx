import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SystemDeleteDialogProps {
  open: boolean;
  systemName: string;
  systemStatus: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const SystemDeleteDialog = ({
  open,
  systemName,
  systemStatus,
  onConfirm,
  onCancel,
  isDeleting,
}: SystemDeleteDialogProps) => {
  const [confirmChecked, setConfirmChecked] = useState(false);

  const isRunning = systemStatus.toLowerCase() === 'active';

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmChecked(false);
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (!isRunning && confirmChecked) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete System?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {isRunning ? (
              <div className="text-destructive font-medium">
                ⚠️ Please stop the system before deleting.
              </div>
            ) : (
              <>
                <p>
                  Are you sure you want to delete <strong>{systemName}</strong>? This action cannot be undone.
                </p>
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="confirm-delete"
                    checked={confirmChecked}
                    onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                  />
                  <Label
                    htmlFor="confirm-delete"
                    className="text-sm font-normal leading-tight cursor-pointer"
                  >
                    Yes, I understand this will permanently remove this system and its data.
                  </Label>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {!isRunning && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!confirmChecked || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
