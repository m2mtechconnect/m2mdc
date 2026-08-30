/**
 * The shell status strip reads the workspace run store. It is therefore only
 * truthful on the Command Center, which consumes that same run authority.
 * Simulation/Blueprint own their record truth; control-plane, Evidence and
 * account routes must not inherit a stale facility or run from another page.
 */
export function routeUsesShellOperatingState(pathname: string): boolean {
  return pathname === '/' || pathname === '/dashboard';
}
