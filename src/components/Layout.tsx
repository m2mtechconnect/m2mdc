import { useState, useEffect, useRef } from "react";
import { SkipToContent, MAIN_CONTENT_ID } from '@/components/a11y/SkipToContent';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuraLogo } from "@/components/brand/AuraLogo";
import { Menu, X, LogOut, Settings, Search, Shield, Sparkles } from "lucide-react";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { LazyCoPilotPanel } from "@/components/copilot/LazyCoPilotPanel";
import { useCoPilot } from "@/contexts/CoPilotContext";
import { UserMenu } from "@/components/layout/UserMenu";
import { BuildVersion } from "@/components/BuildVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTourAutoStart } from "@/tours/useTourAutoStart";
import { useRBAC } from "@/contexts/RBACContext";
import {
  WORKSPACE_NAV,
  isNavItemActive,
  visibleGovernNav,
  visibleManageNav,
  navGroups,
} from "@/config/appNavigation";
import { OperatingStateBar } from "@/components/capability/OperatingStateBar";
import { useShellLayoutStore } from "@/stores/shellLayoutStore";
import { useDataset } from "@/data/dataset/DatasetProvider";
import {
  useAssistantLayoutStore,
  useAssistantPresentation,
} from "@/stores/assistantLayoutStore";
import { COPILOT } from "@/ux";
import { useAuraV2Theme } from "@/components/v2";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const fullBleed = useShellLayoutStore((s) => s.fullBleed);
  const { linkTo } = useDataset();
  const pageOwnsOperatingState = useShellLayoutStore((s) => s.pageOwnsOperatingState);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isOpen, setIsOpen } = useCoPilot();
  const { can, loading: roleLoading } = useRBAC();
  const assistantPresentation = useAssistantPresentation();
  const assistantWidth = useAssistantLayoutStore((s) => s.width);
  const assistantReflow = isOpen && assistantPresentation === 'docked';

  const workspaceNavigation = WORKSPACE_NAV;
  const manageNavigation = roleLoading ? [] : visibleManageNav(can);
  const governNavigation = roleLoading ? [] : visibleGovernNav(can);
  const manageActive = manageNavigation.some((item) => isNavItemActive(item, location.pathname));
  const governActive = governNavigation.some((item) => isNavItemActive(item, location.pathname));
  const drawerGroups = roleLoading ? [] : navGroups(can);
  const headerRef = useRef<HTMLElement>(null);

  useAuraV2Theme();
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
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`${fullBleed ? "h-screen overflow-hidden" : "min-h-screen"} flex flex-col v2-canvas transition-[padding] duration-200 motion-reduce:transition-none`}
      data-testid="app-shell"
      style={assistantReflow ? { paddingRight: assistantWidth } : undefined}
    >
      <SkipToContent />
      <GlobalSearchBar />

      <header
        ref={headerRef}
        className={`v2-appbar sticky top-0 z-50 transition-shadow ${
          isScrolled ? 'shadow-[0_8px_24px_-20px_hsl(214_30%_25%/0.55)]' : ''
        }`}
        role="navigation"
        aria-label="Primary navigation"
        data-testid="global-header"
      >
        <div className="mx-auto flex h-14 max-w-[1920px] items-center justify-between gap-3 px-3 sm:px-4 md:px-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-5">
            <Link
              to="/dashboard"
              aria-label="AURA Command Center - M2M"
              className="flex items-center flex-shrink-0 group"
            >
              <AuraLogo surface="light" className="hidden md:flex transition-transform group-hover:scale-[1.02]" />
              <AuraLogo surface="light" compact className="md:hidden" />
            </Link>

            <nav
              className="hidden min-w-0 items-center gap-1 lg:flex xl:gap-1.5"
              aria-label="Workspaces"
              data-testid="primary-navigation"
            >
              {workspaceNavigation.map((item) => {
                const isActive = isNavItemActive(item, location.pathname);
                const tourId = item.href === '/dashboard' ? 'nav-dashboard' :
                  item.href === '/simulation' ? 'nav-simulation' : undefined;
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={`v2-appbar-link gap-2 rounded-md px-3 text-[14px] font-medium transition-smooth min-h-[36px] ${
                          isActive ? "v2-appbar-link-active" : ""
                        }`}
                      >
                        <Link
                          to={linkTo(item.href)}
                          data-tour={tourId}
                          data-nav-item={item.name}
                          aria-label={item.fullName}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span className="hidden whitespace-nowrap lg:inline">{item.name}</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {(manageNavigation.length > 0 || governNavigation.length > 0) && (
                <div className="v2-appbar-divider h-4 w-px mx-1" aria-hidden="true" />
              )}

              {manageNavigation.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={manageActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`v2-appbar-link gap-2 px-2.5 rounded-md text-[14px] font-medium min-h-[36px] ${manageActive ? 'v2-appbar-link-active' : ''}`}
                      aria-label="Manage"
                      data-testid="manage-trigger"
                      data-nav-item="Manage"
                    >
                      <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                      <span className="hidden lg:inline">Manage</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72" data-testid="manage-menu">
                    {manageNavigation.map((item) => {
                      const isActive = isNavItemActive(item, location.pathname);
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            to={linkTo(item.href)}
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
              )}

              {governNavigation.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={governActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`v2-appbar-link gap-2 px-2.5 rounded-md text-[14px] font-medium min-h-[36px] ${governActive ? 'v2-appbar-link-active' : ''}`}
                      aria-label="Govern"
                      data-testid="govern-trigger"
                      data-nav-item="Govern"
                    >
                      <Shield className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                      <span className="hidden lg:inline">Govern</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72" data-testid="govern-menu">
                    {governNavigation.map((item) => {
                      const isActive = isNavItemActive(item, location.pathname);
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            to={linkTo(item.href)}
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
              )}
            </nav>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5 lg:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="v2-appbar-action hidden lg:flex gap-2 text-[14px] min-h-[38px] transition-smooth"
              aria-label="Open command palette"
              onClick={() => {
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                );
              }}
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden xl:inline">Search</span>
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="v2-appbar-action gap-2 min-h-[38px] text-[14px]"
                  data-testid="assistant-entry"
                  data-active={isOpen ? 'true' : undefined}
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

            <UserMenu />

            <Button
              variant="ghost"
              size="sm"
              className="xl:hidden min-h-[44px] min-w-[44px] text-[hsl(var(--v2-header-fg))] hover:bg-[hsl(var(--v2-header-elevated))] transition-smooth group"
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

      <OperatingStateBar srOnly={pageOwnsOperatingState} />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-full sm:w-[400px] bg-card border-border overflow-y-auto"
          id="mobile-nav-sheet"
          aria-label="Mobile navigation menu"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AuraLogo surface="light" />
            </SheetTitle>
          </SheetHeader>

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
                          to={linkTo(item.href)}
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
                                  to={linkTo(child.href)}
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

      <main
        id={MAIN_CONTENT_ID}
        data-testid="page-content"
        className={
          fullBleed
            ? "flex-1 w-full min-w-0 min-h-0 overflow-hidden"
            : "flex-1 w-full min-w-0 mx-auto max-w-[1920px] px-3 sm:px-4 md:px-5 lg:px-6"
        }
      >
        {children}
      </main>

      <footer className={`border-t border-border bg-card/50 backdrop-blur-sm${fullBleed ? " hidden" : ""}`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-sm text-muted-foreground">© 2026 M2M AURA</p>
              <BuildVersion />
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/help" className="hover:text-foreground transition-smooth">
                Learning Hub
              </Link>
              <Link
                to="/dsx/evidence-beta/sustainability/sovereignty"
                className="hover:text-foreground transition-smooth"
              >
                Governance evidence
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <LazyCoPilotPanel />
    </div>
  );
}
