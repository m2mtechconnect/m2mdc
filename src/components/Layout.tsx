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
  LayoutDashboard,
  Wrench,
  BarChart3,
  Shield,
  Users,
  HelpCircle,
  Menu,
  X,
  Command,
  LogOut,
  Server,
  Activity,
  Monitor,
  MoreHorizontal,
} from "lucide-react";
import { User } from '@supabase/supabase-js';
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { CoPilotPanel } from "@/components/copilot/CoPilotPanel";
import { CoPilotBubble } from "@/components/copilot/CoPilotBubble";
import { useCoPilot } from "@/contexts/CoPilotContext";
import { HealthBadges } from "@/components/HealthBadges";
import { UserMenu } from "@/components/layout/UserMenu";
import { BuildVersion } from "@/components/BuildVersion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AOCQuickAccessButton } from "@/components/aoc/AOCQuickAccessButton";
import { DataCentreSelector } from "@/components/twin-selector";
import { HelpMenu } from "@/components/header/HelpMenu";
import { useTourAutoStart } from "@/tours/useTourAutoStart";
import { useRBAC } from "@/contexts/RBACContext";
import { getRoleNavigation } from "@/config/roleDashboardConfig";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OperatingStateBar } from "@/components/capability/OperatingStateBar";

interface LayoutProps {
  children: React.ReactNode;
}

// Fallback navigation (used during loading)
const fallbackPrimary = [
  { name: "Command", fullName: "Data Centre Command", href: "/", icon: LayoutDashboard, group: 'primary' as const },
  { name: "Build", fullName: "Build Data Centre Twin", href: "/builder", icon: Wrench, group: 'primary' as const },
  { name: "Agents", fullName: "Subsystem Agents", href: "/app/agents", icon: Server, group: 'primary' as const },
];

const fallbackSecondary = [
  { name: "Analytics", fullName: "Telemetry & Analytics", href: "/intelligence", icon: BarChart3, group: 'secondary' as const },
  { name: "Simulation", fullName: "Simulation", href: "/data-centre-twin?view=simulation", icon: Activity, group: 'secondary' as const },
  { name: "Audit", fullName: "Sovereignty & Safety Audit", href: "/compliance", icon: Shield, group: 'secondary' as const },
  { name: "Teams", fullName: "Teams", href: "/teams", icon: Users, group: 'secondary' as const },
];

// Helper function to get time-based greeting key
const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "layout.goodMorning";
  if (hour < 18) return "layout.goodAfternoon";
  return "layout.goodEvening";
};

// Helper function to extract first name from user
const getFirstName = (user: User | null): string => {
  if (!user) return "there";
  
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(' ')[0];
  }
  if (user.user_metadata?.first_name) {
    return user.user_metadata.first_name;
  }
  
  if (user.email) {
    const username = user.email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];
  }
  
  return "there";
};

export function Layout({ children }: LayoutProps) {
  const fullBleed = useShellLayoutStore((s) => s.fullBleed);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { isOpen, setIsOpen } = useCoPilot();
  const [greeting, setGreeting] = useState(getGreetingKey());
  const { t } = useTranslation();
  const { role, loading: roleLoading } = useRBAC();
  
  // Role-adaptive navigation
  const roleNav = getRoleNavigation(role);
  const primaryNavigation = roleLoading ? fallbackPrimary : roleNav.primary;
  const secondaryNavigation = roleLoading ? fallbackSecondary : roleNav.secondary;
  const headerRef = useRef<HTMLElement>(null);

  // Auto-start tours based on route and user state
  useTourAutoStart();

  useEffect(() => {
    // Application-owned lifecycle boundary for supabase.auth.getUser.
    // Rejections from a disposed owner (e.g. route change while the request
    // is in flight) must not surface as ambient unhandled errors, but a
    // failure from the currently-mounted owner remains observable.
    let mounted = true;
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (mounted) setUser(user);
      })
      .catch((err) => {
        if (mounted) {
          console.error('[Layout] auth.getUser failed for mounted owner:', err);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreetingKey());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalSearchBar />
      
      {/* Top Navigation Bar */}
      <header 
        ref={headerRef}
        className={`sticky top-0 z-50 border-b bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur transition-shadow ${
          isScrolled ? 'shadow-md' : ''
        }`}
        role="navigation"
        aria-label="Primary navigation"
      >
        <div className="mx-auto max-w-[1920px] flex items-center justify-between px-[clamp(16px,4vw,32px)] py-3">
          {/* Logo and Greeting */}
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            <Link to="/" className="flex items-center flex-shrink-0 group">
              <img 
                src={m2mLogo} 
                alt="Data Centre Twin Studio" 
                className="h-9 w-9 lg:h-10 lg:w-10 object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Dynamic Greeting */}
            <div className="hidden md:flex items-center text-sm text-muted-foreground">
              {t(greeting)}, <span className="ml-1 font-medium text-foreground">{getFirstName(user)}</span>
            </div>

            {/* Data Centre Twin Selector */}
            <div className="hidden lg:block" data-tour="dc-selector">
              <DataCentreSelector />
            </div>

            {/* Desktop Navigation - Full labels on 2xl+, icons on lg-xl */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main menu">
              {/* Primary navigation - always visible on lg+ */}
              {primaryNavigation.map((item) => {
                const isActive = item.href.includes('?') 
                  ? location.pathname + location.search === item.href
                  : location.pathname === item.href;
                const tourId = item.href === '/' ? 'nav-dashboard' : 
                  item.href === '/builder' ? 'nav-builder' :
                  item.href === '/app/agents' ? 'nav-agents' : undefined;
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
                          aria-label={item.fullName}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          <span className="hidden xl:inline whitespace-nowrap">{item.name}</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{item.fullName}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              
              {/* Separator */}
              <div className="h-4 w-px bg-border mx-1" />

              {/* Secondary navigation - full on 2xl+, dropdown below to prevent header overlap */}
              <div className="hidden 2xl:flex items-center gap-0.5">
                {secondaryNavigation.map((item) => {
                  const isActive = item.href.includes('?') 
                    ? location.pathname + location.search === item.href
                    : location.pathname === item.href;
                  const tourId = item.href.includes('simulation') ? 'nav-simulation' :
                    item.href === '/intelligence' ? 'nav-analytics' :
                    item.href === '/compliance' ? 'nav-audit' : undefined;
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`gap-1.5 px-2.5 text-xs font-medium transition-smooth min-h-[36px] ${
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Link
                            to={item.href}
                            data-tour={tourId}
                            aria-label={item.fullName}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <item.icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <span className="whitespace-nowrap">{item.name}</span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{item.fullName}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* More dropdown - visible below 2xl */}
              <div className="2xl:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground min-h-[36px]"
                      aria-label="More navigation"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">More</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {secondaryNavigation.map((item) => {
                      const isActive = item.href.includes('?') 
                        ? location.pathname + location.search === item.href
                        : location.pathname === item.href;
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link 
                            to={item.href}
                            className={`flex items-center gap-2 ${isActive ? 'text-primary' : ''}`}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.fullName}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/help" className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Help
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Help Menu with Tours */}
            <HelpMenu />
            
            {/* AOC Quick Access */}
            <AOCQuickAccessButton />
            
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
            <div className="px-3 mb-4">
              <DataCentreSelector />
            </div>
            
            {/* Platform Section */}
            <div className="pb-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Data Centre
              </h3>
              {primaryNavigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href.includes('?') && location.pathname + location.search === item.href);
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

            {/* Analytics & Simulation Section */}
            <div className="pb-4 border-t border-border pt-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Analytics & Compliance
              </h3>
              {secondaryNavigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href.includes('?') && location.pathname + location.search === item.href);
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

      {/* Data Centre Co-Pilot */}
      <CoPilotPanel />
      <CoPilotBubble position="bottom-right" />
    </div>
  );
}
