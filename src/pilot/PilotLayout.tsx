/**
 * PR-0.1 Checkpoint B7.4E - PilotLayout.
 *
 * Route-specific shell for the controlled approved-user pilot. This
 * component intentionally does NOT import or initialize any of the
 * following excluded application capabilities:
 *   - src/components/Layout (shared production layout)
 *   - HealthBadges / useTokenRefresh / GlobalSearchBar
 *   - CoPilotPanel / CoPilotBubble / CoPilotProvider / CoPilotCommandProvider
 *   - ai-systems-unified / ops-overview / systems-delete / health
 *   - zapier-* / search-suggestions / copilot-* consumers
 *
 * Only imports: React, react-router-dom, i18n, the supabase auth SDK for
 * identity + sign-out, and local Tailwind primitives.
 */
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PilotLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header
        className="border-b border-border bg-card"
        role="banner"
        aria-label="AURA controlled pilot"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            to="/pilot/overview"
            className="font-semibold text-sm tracking-wide"
            aria-label="M2M AURA pilot overview"
          >
            M2M AURA <span className="text-muted-foreground">Pilot</span>
          </Link>
          <nav aria-label="Pilot navigation" className="flex items-center gap-4 text-sm">
            <NavLink
              to="/pilot/overview"
              className={({ isActive }) =>
                isActive
                  ? "text-primary underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Overview
            </NavLink>
            <span
              className="text-xs text-muted-foreground max-w-[16rem] truncate"
              aria-label="Signed-in identity"
              data-testid="pilot-user-email"
            >
              {email ?? "..."}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="text-sm px-3 py-1 rounded border border-border hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="pilot-signout"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6" role="main">
        <Outlet />
      </main>
      <footer className="border-t border-border text-xs text-muted-foreground py-3 text-center">
        Controlled pilot surface. Read-only. Displays only records visible under
        your account's row-level security scope.
      </footer>
    </div>
  );
}

export default PilotLayout;