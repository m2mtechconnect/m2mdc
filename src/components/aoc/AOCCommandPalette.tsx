import { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  Settings,
  Bell,
  Users,
  BarChart3,
  Zap,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AOCCommandPaletteProps {
  agentId: string;
  onAction: (action: string) => void;
}

export function AOCCommandPalette({ agentId, onAction }: AOCCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (value: string) => {
    setOpen(false);
    onAction(value);
    toast({
      title: '⚡ Action Executed',
      description: `${value} completed`,
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Runtime Controls">
          <CommandItem onSelect={() => handleSelect('run')}>
            <Play className="mr-2 h-4 w-4" />
            <span>Run Agent</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              R
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('pause')}>
            <Pause className="mr-2 h-4 w-4" />
            <span>Pause Agent</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              P
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('stop')}>
            <Square className="mr-2 h-4 w-4" />
            <span>Stop Agent</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              S
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('restart')}>
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>Restart Agent</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect('view-metrics')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>View Metrics</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              M
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('view-logs')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>View Activity Logs</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              L
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('view-team')}>
            <Users className="mr-2 h-4 w-4" />
            <span>View Team Activity</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              T
            </kbd>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleSelect('export-logs')}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export Activity Logs</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('export-metrics')}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export Performance Metrics</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('configure-alerts')}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Configure Alerts</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('optimize')}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Run Performance Analysis</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => handleSelect('settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Agent Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
