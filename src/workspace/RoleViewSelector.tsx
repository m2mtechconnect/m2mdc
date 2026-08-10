import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_VIEWS, useWorkspaceStore, type RoleView } from './workspaceStore';

const ORDER: RoleView[] = ['engineer', 'operator', 'executive', 'compliance'];

export function RoleViewSelector() {
  const roleView = useWorkspaceStore((s) => s.roleView);
  const setRoleView = useWorkspaceStore((s) => s.setRoleView);

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="workspace-role-view" className="text-[11px] text-muted-foreground">
        View
      </label>
      <Select value={roleView} onValueChange={(v) => setRoleView(v as RoleView)}>
        <SelectTrigger id="workspace-role-view" className="h-8 w-[9.5rem] text-xs" aria-label="Role view">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card">
          {ORDER.map((role) => (
            <SelectItem key={role} value={role} className="text-xs">
              {ROLE_VIEWS[role].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}