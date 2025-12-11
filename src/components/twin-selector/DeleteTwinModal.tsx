/**
 * Delete Twin Modal - Confirmation dialog for deleting a data centre twin
 * Requires exact name match for safety
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteTwinModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  twinName: string;
  twinId: string;
  onConfirmDelete: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteTwinModal({
  isOpen,
  onOpenChange,
  twinName,
  twinId,
  onConfirmDelete,
  isDeleting = false,
}: DeleteTwinModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  
  const isNameMatch = confirmationText.trim().toLowerCase() === twinName.toLowerCase();
  
  const handleClose = () => {
    setConfirmationText('');
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!isNameMatch) return;
    await onConfirmDelete();
    setConfirmationText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-destructive">Delete Data Centre Twin?</DialogTitle>
          </div>
          <DialogDescription className="pt-3 text-sm leading-relaxed">
            This action will <span className="font-medium text-foreground">permanently delete</span> this twin, 
            including all scenarios, KPIs, workflows, and simulation history. 
            <span className="font-medium text-destructive"> This cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Twin info card */}
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
            <p className="text-sm font-medium">{twinName}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {twinId.slice(0, 8)}...</p>
          </div>
          
          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-sm">
              Type <span className="font-mono font-bold text-foreground">{twinName}</span> to confirm:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Enter twin name to confirm"
              className={cn(
                "transition-colors",
                confirmationText.length > 0 && !isNameMatch && "border-warning focus-visible:ring-warning"
              )}
              disabled={isDeleting}
            />
            {confirmationText.length > 0 && !isNameMatch && (
              <p className="text-xs text-warning">Name doesn't match. Please type exactly: {twinName}</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={!isNameMatch || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Twin
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
