import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Ctrl', 'H'], description: 'Open help' },
      { keys: ['Ctrl', '/'], description: 'Toggle AURA Assistant' },
      { keys: ['←', '→'], description: 'Navigate between steps' },
    ],
  },
  {
    category: 'Builder',
    items: [
      { keys: ['Ctrl', 'S'], description: 'Save progress' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'Enter'], description: 'Continue to next step' },
    ],
  },
  {
    category: 'Workflow Editor',
    items: [
      { keys: ['Delete'], description: 'Delete selected node' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate node' },
      { keys: ['Escape'], description: 'Deselect all' },
    ],
  },
];

export const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these shortcuts to navigate and work faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-smooth"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                    <div className="flex gap-1">
                      {item.keys.map((key, index) => (
                        <span key={index} className="flex items-center gap-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {key}
                          </Badge>
                          {index < item.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Press <Badge variant="outline" className="font-mono text-xs mx-1">?</Badge> to toggle this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
};
