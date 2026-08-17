import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import m2mLogo from "@/assets/m2m-logo.png";
import {
  HelpCircle,
  Menu,
  X,
  LogOut,
  Settings,
  Search,
  Sparkles,
} from "lucide-react";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { CoPilotPanel } from "@/components/copilot/CoPilotPanel";
import { useCoPilot } from "@/contexts/CoPilotContext";
import { HealthBadges } from "@/components/HealthBadges";
import { UserMenu } from "@/components/layout/UserMenu";
import { BuildVersion } from "@/components/BuildVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTourAutoStart } from "@/tours/useTourAutoStart";
import { useRBAC } from "@/contexts/RBACContext";
import {
  WORKSPACE_NAV,
  SUPPORT_NAV,
  isNavItemActive,
  visibleManageNav,
  navGroups,
} from "@/config/appNavigation";
import { OperatingStateBar } from "@/components/capability/OperatingStateBar";
import { useShellLayoutStore } from "@/stores/shellLayoutStore";
import {
  useAssistantLayoutStore,
  useAssistantPresentation,
} from "@/stores/assistantLayoutStore";
import { COPILOT } from "@/ux";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const fullBleed = useShellLayoutStore((s) => s.fullBleed);
  const pageOwnsOperatingState = useShellLayoutStore((s) => s.pageOwnsOperatingState);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isOpen, setIsOpen } = useCoPilot();
  const { can, loading: roleLoading } = useRBAC();
  const assistantPresentation = useAssistantPresentation();
  const assistantWidth = useAssistantLayoutStore((s) => s.width);
  // At desktop widths the assistant reflows the workspace instead of covering it.
  const assistantReflow = isOpen && assistantPresentation === 'docked';

  // Canonical information architecture. Workspaces are always visible;
  // authoring and administration collapse into a single Manage group.
  const workspaceNavigation = WORKSPACE_NAV;
  const manageNavigation = roleLoading ? [] : visibleManageNav(can);
  // DSX lifecycle grouping used by the mobile drawer.
  const drawerGroups = roleLoading ? [] : navGroups(can);
  const headerRef = useRef<HTMLElement>(null);

  // Auto-start tours based on route and user state
  useTourAutoStart();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    const handleToggle = () => setIsOpen(!isOpen);
    window.addEventListener('toggle-copilot', handleToggle);
    return () => window.removeEventListener('toggle-copilot', handleToggle);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`${fullBleed ? "h-screen overflow-hidden" : "min-h-screen"} flex flex-col bg-background transition-[padding] duration-200 motion-reduce:transition-none`}
      data-testid="app-shell"
      style={assistantReflow ? { paddingRight: assistantWidth } : undefined}
    >
      <GlobalSearchBar />
      
      {/* Top Navigation Bar */}
      <header 
        ref={headerRef}
        className={`sticky top-0 z-50 border-b bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur transition-shadow ${
          isScrolled ? 'shadow-md' : ''
        }`}
        role="navigation"
        aria-label="Primary navigation"
        data-testid="global-header"
      >
        <div className="mx-auto flex h-14 max-w-[1920px] items-center justify-between gap-3 px-3 sm:px-4 md:px-5 lg:px-6">
          {/* Brand, facility context and workspace navigation */}
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-5">
            <Link
              to="/dashboard"
              aria-label="Data Centre Twin Studio home"
              className="flex items-center flex-shrink-0 group"
            >
              <img 
                src={m2mLogo} 
                alt="Data Centre Twin Studio" 
                className="h-9 w-9 lg:h-10 lg:w-10 object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Workspace navigation: five destinations, always the same five. */}
            <nav
              className="hidden min-w-0 items-center gap-1 lg:flex xl:gap-1.5"
              aria-label="Workspaces"
              data-testid="primary-navigation"
            >
              {workspaceNavigation.map((item) => {
                const isActive = isNavItemActive(item, location.pathname);
                const tourId = item.href === '/' ? 'nav-dashboard' :
                  item.href === '/simulation' ? 'nav-simulation' : undefined;
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={`gap-2 rounded-md px-2.5 xl:px-3 text-[14px] font-medium transition-smooth min-h-[40px] ${
                          isActive
                            ? "bg-[hsl(var(--info)/0.10)] text-[hsl(var(--info-strong))] shadow-[inset_0_-2px_0_0_hsl(var(--info))]"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Link
                          to={item.href}
                          data-tour={tourId}
                          data-nav-item={item.name}
                          aria-label={item.fullName}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          {/* xl is 1536px here: labels only appear once there is room for them. */}
                          <span className="hidden whitespace-nowrap xl:inline">{item.name}</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {manageNavigation.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border mx-1" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 px-2.5 text-[14px] font-medium text-muted-foreground hover:text-foreground min-h-[40px]"
                        aria-label="Manage"
                        data-testid="manage-trigger"
                        data-nav-item="Manage"
                      >
                        <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                        <span className="hidden xl:inline">Manage</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64" data-testid="manage-menu">
                      {manageNavigation.map((item) => {
                        const isActive = isNavItemActive(item, location.pathname);
                        return (
                          <DropdownMenuItem key={item.name} asChild>
                            <Link
                              to={item.href}
                              className={`flex items-start gap-2 ${isActive ? 'text-primary' : ''}`}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              <span>
                                <span className="block text-sm">{item.fullName}</span>
                                <span className="block text-[11px] text-muted-foreground">{item.description}</span>
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </nav>
          </div>

          {/* Right Side Actions: Search, Assistant, Manage (in nav), Avatar. */}
          <div className="flex flex-shrink-0 items-center gap-1.5 lg:gap-2">
            {/* Search: full control on desktop, icon-only (labelled) on tablet. */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex gap-2 text-[13px] text-muted-foreground min-h-[38px] hover:bg-accent/10 transition-smooth"
              aria-label="Open command palette"
              onClick={() => {
                // Dispatch the same keyboard shortcut that GlobalSearchBar listens for
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                );
              }}
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden xl:inline">Search</span>
            </Button>

            {/* AURA Assistant */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isOpen ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2 min-h-[38px] text-[13px]"
                  data-testid="assistant-entry"
                  aria-label={isOpen ? `Close ${COPILOT.TITLE}` : `Open ${COPILOT.TITLE}`}
                  aria-expanded={isOpen}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden xl:inline">Assistant</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{COPILOT.TITLE} · {COPILOT.SUBTITLE}</p>
              </TooltipContent>
            </Tooltip>

            {/* User menu owns profile, language, help, preferences, sign out. */}
            <UserMenu />

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="xl:hidden min-h-[44px] min-w-[44px] hover:bg-accent/10 transition-smooth group"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-sheet"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 stroke-[1.5] transition-transform group-hover:rotate-90" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5 stroke-[1.5] transition-transform group-hover:scale-110" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Persistent operating-state bar (Stage 5 truth alignment) */}
      <OperatingStateBar srOnly={pageOwnsOperatingState} />

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="w-full sm:w-[400px] bg-card border-border overflow-y-auto"
          id="mobile-nav-sheet"
          aria-label="Mobile navigation menu"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <img src={m2mLogo} alt="" className="h-8 w-8" aria-hidden="true" />
              <span>Data Centre Twin Studio</span>
            </SheetTitle>
          </SheetHeader>

          {/* DSX lifecycle drawer: Overview, Design, Simulate, Operate,
              Govern, Support. Labels changed; every href is unchanged. */}
          <nav className="mt-6 space-y-1" aria-label="Mobile navigation">
            {drawerGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                data-nav-group={group.id}
                className={groupIndex === 0 ? "pb-4" : "pb-4 border-t border-border pt-4"}
              >
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h3>
                {group.items.map((item) => {
                  const isActive = isNavItemActive(item, location.pathname);
                  return (
                    <div key={item.href}>
                      <Button
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 min-h-[44px] text-base"
                      >
                        <Link
                          to={item.href}
                          data-nav-item={item.name}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                          {item.fullName}
                        </Link>
                      </Button>
                      {isActive && item.children?.length ? (
                        <div className="ml-6 mt-1 space-y-1 border-l border-border pl-2">
                          {item.children.map((child) => {
                            const childActive = isNavItemActive(child, location.pathname);
                            return (
                              <Button
                                key={child.href}
                                asChild
                                variant={childActive ? "secondary" : "ghost"}
                                size="sm"
                                className="w-full justify-start min-h-11 text-sm"
                              >
                                <Link
                                  to={child.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  aria-current={childActive ? "page" : undefined}
                                >
                                  {child.fullName}
                                </Link>
                              </Button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Mobile Sheet Footer - Sign Out */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main
        data-testid="page-content"
        className={
          fullBleed
            ? "flex-1 w-full min-h-0 overflow-hidden"
            : "flex-1 w-full mx-auto max-w-[1920px] px-3 sm:px-4 md:px-5 lg:px-6"
        }
      >
        {children}
      </main>

      {/* Footer */}
      <footer className={`border-t border-border bg-card/50 backdrop-blur-sm${fullBleed ? " hidden" : ""}`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 Data Centre Digital Twin Studio
              </p>
              <BuildVersion />
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/help" className="hover:text-foreground transition-smooth">
                Documentation
              </Link>
              <Link to="/compliance" className="hover:text-foreground transition-smooth">
                Compliance
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* AURA Assistant (single instance) */}
      <CoPilotPanel />
    </div>
  );
}
