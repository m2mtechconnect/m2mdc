import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import m2mLogo from "@/assets/m2m-logo.png";
import {
  LayoutDashboard,
  Wrench,
  BarChart3,
  Plug,
  Shield,
  Users,
  Store,
  Activity,
  HelpCircle,
  Menu,
  X,
  Command,
  Sparkles,
  LogOut,
  Bot,
} from "lucide-react";
import { User } from '@supabase/supabase-js';
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { CoPilotDrawer } from "@/components/CoPilotDrawer";
import { CoPilotPanel } from "@/components/copilot/CoPilotPanel";
import { CoPilotBubble } from "@/components/copilot/CoPilotBubble";
import { useCoPilot } from "@/contexts/CoPilotContext";
import { HealthBadges } from "@/components/HealthBadges";
import { UserMenu } from "@/components/layout/UserMenu";
import { BuildVersion } from "@/components/BuildVersion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AOCQuickAccessButton } from "@/components/aoc/AOCQuickAccessButton";

interface LayoutProps {
  children: React.ReactNode;
}

// All navigation items visible in header
const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Build AI System", href: "/builder", icon: Wrench },
  { name: "Manage Agents", href: "/app/agents", icon: Bot },
  { name: "Intelligence", href: "/intelligence", icon: BarChart3 },
  { name: "Compliance", href: "/compliance", icon: Shield },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "Help", href: "/help", icon: HelpCircle },
];

// Helper function to get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// Helper function to extract first name from user
const getFirstName = (user: User | null): string => {
  if (!user) return "there";
  
  // Try user_metadata.full_name or first_name
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(' ')[0];
  }
  if (user.user_metadata?.first_name) {
    return user.user_metadata.first_name;
  }
  
  // Fallback to email username
  if (user.email) {
    const username = user.email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];
  }
  
  return "there";
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { isOpen, setIsOpen } = useCoPilot();
  const [greeting, setGreeting] = useState(getGreeting());
  const headerRef = useRef<HTMLElement>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Listen for global copilot toggle event
  useEffect(() => {
    const handleToggle = () => setIsOpen(!isOpen);
    window.addEventListener('toggle-copilot', handleToggle);
    return () => window.removeEventListener('toggle-copilot', handleToggle);
  }, [isOpen, setIsOpen]);

  // Track scroll for sticky header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalSearchBar />
      
      {/* Top Navigation Bar - Sticky with Priority+ Pattern */}
      <header 
        ref={headerRef}
        className={`sticky top-0 z-50 border-b bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur transition-shadow ${
          isScrolled ? 'shadow-lg shadow-purple-500/5' : ''
        }`}
        role="navigation"
        aria-label="Primary navigation"
        style={{
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <div className="mx-auto max-w-[1920px] flex items-center justify-between px-[clamp(16px,4vw,32px)] py-3">
          {/* Logo and Greeting */}
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            <Link to="/" className="flex items-center flex-shrink-0 group">
              <img 
                src={m2mLogo} 
                alt="AURA" 
                className="h-9 w-9 lg:h-10 lg:w-10 object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Dynamic Greeting */}
            <div className="hidden md:flex items-center text-sm text-muted-foreground">
              {greeting}, <span className="ml-1 font-medium text-foreground">{getFirstName(user)}</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main menu">
              {allNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link to={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`gap-2 transition-smooth min-h-[44px] ${
                            isActive ? "glow-purple" : ""
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden xl:inline">{item.name}</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* AOC Quick Access */}
            <AOCQuickAccessButton />
            
            {/* Command Palette Trigger */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex gap-2 text-muted-foreground min-h-[44px] hover:bg-accent/10 transition-smooth"
              aria-label="Open command palette"
            >
              <Command className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs">Ctrl+K</span>
            </Button>

            {/* User Menu - Desktop */}
            <div className="hidden lg:block">
              <UserMenu />
            </div>

            {/* Mobile Menu Toggle - Modern Thin Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden min-h-[44px] min-w-[44px] hover:bg-accent/10 transition-smooth group"
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
              <span>AURA</span>
            </SheetTitle>
          </SheetHeader>

          <nav className="mt-6 space-y-1" role="menu">
            {/* Platform Section */}
            <div className="pb-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Platform
              </h3>
              {allNavigation.slice(0, 3).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    role="menuitem"
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 min-h-[44px] text-base"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Teams & Compliance Section */}
            <div className="pb-4 border-t border-border pt-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Teams & Compliance
              </h3>
              {allNavigation.slice(3, 6).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    role="menuitem"
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 min-h-[44px] text-base"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Additional Section */}
            <div className="pb-4 border-t border-border pt-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                More
              </h3>
              {allNavigation.slice(6).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    role="menuitem"
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 min-h-[44px] text-base"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile Sheet Footer - Sign Out */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
            {/* Sign Out Button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 min-h-[44px] text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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

      {/* Main Content - Fluid Container */}
      <main className="flex-1 w-full mx-auto max-w-[1680px] px-[clamp(8px,2vw,16px)] sm:px-[clamp(12px,3vw,20px)] md:px-[clamp(16px,4vw,24px)] lg:px-[clamp(20px,5vw,32px)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 AURA — Adaptive Unified Resource Assistant
              </p>
              <BuildVersion />
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-smooth">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-smooth">
                Terms of Service
              </a>
              <a href="#" className="hover:text-foreground transition-smooth">
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* AURA Co-Pilot Floating Assistant */}
      <CoPilotPanel />

      {/* Floating AURA Co-Pilot Button - Safe Area Aware */}
      <CoPilotBubble position="bottom-right" />
    </div>
  );
}
