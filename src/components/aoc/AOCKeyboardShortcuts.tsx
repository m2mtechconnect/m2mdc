import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface AOCKeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AOCKeyboardShortcuts({ open, onOpenChange }: AOCKeyboardShortcutsProps) {
  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['⌘', 'K'], description: 'Open command palette' },
        { keys: ['M'], description: 'Jump to metrics' },
        { keys: ['L'], description: 'Jump to activity logs' },
        { keys: ['T'], description: 'Jump to team collaboration' },
      ],
    },
    {
      category: 'Runtime Controls',
      items: [
        { keys: ['R'], description: 'Run agent' },
        { keys: ['P'], description: 'Pause agent' },
        { keys: ['S'], description: 'Stop agent' },
        { keys: ['⌘', 'R'], description: 'Restart agent' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['⌘', 'E'], description: 'Export data' },
        { keys: ['⌘', 'F'], description: 'Search/filter' },
        { keys: ['⌘', 'B'], description: 'Open in Builder' },
        { keys: ['?'], description: 'Show keyboard shortcuts' },
      ],
    },
    {
      category: 'General',
      items: [
        { keys: ['Esc'], description: 'Close dialogs' },
        { keys: ['⌘', 'Z'], description: 'Undo last action' },
        { keys: ['⌘', 'Shift', 'Z'], description: 'Redo action' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <Badge
                          key={keyIdx}
                          variant="outline"
                          className="font-mono text-xs px-2 py-1"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-accent/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 rounded border bg-muted">?</kbd> at any time to view these shortcuts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
