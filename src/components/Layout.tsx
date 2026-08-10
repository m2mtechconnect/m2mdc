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
  Command,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { CoPilotPanel } from "@/components/copilot/CoPilotPanel";
import { useCoPilot } from "@/contexts/CoPilotContext";
import { HealthBadges } from "@/components/HealthBadges";
import { UserMenu } from "@/components/layout/UserMenu";
import { BuildVersion } from "@/components/BuildVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DataCentreSelector } from "@/components/twin-selector";
import { HelpMenu } from "@/components/header/HelpMenu";
import { useTourAutoStart } from "@/tours/useTourAutoStart";
import { useRBAC } from "@/contexts/RBACContext";
import {
  WORKSPACE_NAV,
  isNavItemActive,
  visibleManageNav,
} from "@/config/appNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OperatingStateBar } from "@/components/capability/OperatingStateBar";
import { useShellLayoutStore } from "@/stores/shellLayoutStore";
import {
  useAssistantLayoutStore,
  useAssistantPresentation,
} from "@/stores/assistantLayoutStore";
import { COPILOT } from "@/ux";
import { MessagesSquare } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const fullBleed = useShellLayoutStore((s) => s.fullBleed);
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
      className="min-h-screen flex flex-col bg-background transition-[padding] duration-200 motion-reduce:transition-none"
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
        <div className="mx-auto max-w-[1920px] flex items-center justify-between px-[clamp(16px,4vw,32px)] py-3">
          {/* Brand, facility context and workspace navigation */}
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            <Link to="/dashboard" className="flex items-center flex-shrink-0 group">
              <img 
                src={m2mLogo} 
                alt="Data Centre Twin Studio" 
                className="h-9 w-9 lg:h-10 lg:w-10 object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Data Centre Twin Selector (single canonical facility switcher) */}
            <div className="hidden lg:block" data-tour="dc-selector" data-testid="facility-switcher">
              <DataCentreSelector />
            </div>

            {/* Workspace navigation: five destinations, always the same five. */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Workspaces" data-testid="primary-navigation">
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
                        className={`gap-1.5 px-2 xl:px-2.5 text-xs font-medium transition-smooth min-h-[36px] ${
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Link
                          to={item.href}
                          data-tour={tourId}
                          data-nav-item={item.name}
                          aria-label={item.fullName}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          {/* xl is 1536px in this project, so labels are gated at lg. */}
                          <span className="hidden lg:inline whitespace-nowrap">{item.name}</span>
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
                        className="gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground min-h-[36px]"
                        aria-label="Manage"
                        data-testid="manage-trigger"
                        data-nav-item="Manage"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
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

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Help Menu with Tours */}
            <HelpMenu />
            
            {/* Command Palette Trigger */}
            <Button
              variant="outline"
              size="sm"
              className="hidden xl:flex gap-1.5 text-muted-foreground min-h-[36px] hover:bg-accent/10 transition-smooth"
              aria-label="Open command palette"
              onClick={() => {
                // Dispatch the same keyboard shortcut that GlobalSearchBar listens for
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                );
              }}
            >
              <Command className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs">Ctrl+K</span>
            </Button>

            {/* User Menu - Desktop */}
            <div className="hidden xl:block">
              <UserMenu />
            </div>

            {/* AURA Assistant */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isOpen ? "secondary" : "outline"}
                  size="sm"
                  className="gap-1.5 min-h-[36px]"
                  data-testid="assistant-entry"
                  aria-label={isOpen ? `Close ${COPILOT.TITLE}` : `Open ${COPILOT.TITLE}`}
                  aria-expanded={isOpen}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden lg:inline text-xs">Assistant</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{COPILOT.TITLE} · {COPILOT.SUBTITLE}</p>
              </TooltipContent>
            </Tooltip>

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
      <OperatingStateBar />

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

          <nav className="mt-6 space-y-1" aria-label="Mobile navigation">
            {/* Data Centre Selector - Mobile */}
            <div className="px-3 mb-4" data-testid="facility-switcher-mobile">
              <DataCentreSelector />
            </div>
            
            {/* Workspaces */}
            <div className="pb-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workspaces
              </h3>
              {workspaceNavigation.map((item) => {
                const isActive = isNavItemActive(item, location.pathname);
                return (
                  <Button
                    key={item.name}
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 min-h-[44px] text-base"
                  >
                    <Link
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.fullName}
                    </Link>
                  </Button>
                );
              })}
            </div>

            {/* Manage */}
            {manageNavigation.length > 0 && (
              <div className="pb-4 border-t border-border pt-4">
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Manage
                </h3>
                {manageNavigation.map((item) => {
                  const isActive = isNavItemActive(item, location.pathname);
                  return (
                    <Button
                      key={item.name}
                      asChild
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 min-h-[44px] text-base"
                    >
                      <Link
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                        {item.fullName}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Help Section */}
            <div className="pb-4 border-t border-border pt-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Support
              </h3>
              <Button
                asChild
                variant={location.pathname === '/help' ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 min-h-[44px] text-base"
              >
                <Link
                  to="/help"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/help' ? "page" : undefined}
                >
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                  Help
                </Link>
              </Button>
            </div>
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
            ? "flex-1 w-full"
            : "flex-1 w-full mx-auto max-w-[1680px] px-[clamp(8px,2vw,16px)] sm:px-[clamp(12px,3vw,20px)] md:px-[clamp(16px,4vw,24px)] lg:px-[clamp(20px,5vw,32px)]"
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
