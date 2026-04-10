/**
 * TwinHeader - Landing page header with M2M logo and navigation
 * Premium sticky header with glassmorphism effect
 * i18n-enabled for English and Quebec French
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import m2mLogo from "@/assets/m2m-logo.png";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TwinHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: t('landing.features'), href: "#features" },
    { label: t('landing.useCases'), href: "#use-cases" },
    { label: t('landing.integrations'), href: "#integrations" },
    { label: t('landing.whyM2M'), href: "#differentiators" },
  ];

  const solutionItems = [
    { label: t('landing.enterpriseSolutions'), href: "#use-cases", description: t('landing.enterpriseDesc') },
    { label: t('landing.sustainability'), href: "#features", description: t('landing.sustainabilityDesc') },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg shadow-foreground/5"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <img
              src={m2mLogo}
              alt="M2M AURA - Sovereign AI Data Centre Digital Twin"
              className="h-8 lg:h-10 w-auto transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:block">
              <h1 className="sr-only">M2M AURA - Sovereign AI Data Centre Digital Twin Platform</h1>
              <span className="font-display text-lg font-bold text-foreground">
                M2M
              </span>
              <span className="font-display text-lg font-medium text-accent ml-1">
                AURA
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Solutions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                Solutions
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {solutionItems.map((item) => (
                  <DropdownMenuItem 
                    key={item.label}
                    onSelect={() => {
                      if (item.href.startsWith('#')) {
                        document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate(item.href);
                      }
                    }}
                    className="flex flex-col items-start gap-0.5 cursor-pointer py-3"
                  >
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Regular nav items */}
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/login")}
            >
              {t('auth.login')}
            </Button>
            <Button
              className="text-sm bg-accent text-m2m-black font-semibold hover:bg-m2m-gold-dark"
              onClick={() => navigate("/onboarding")}
            >
              {t('auth.getStarted')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border bg-background/95 backdrop-blur-md">
            <nav className="flex flex-col gap-2">
              {/* Solutions section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Solutions
              </div>
              {solutionItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <div className="h-px bg-border/50 my-2" />

              {/* Regular nav items */}
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate("/login");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Login
                </Button>
                <Button
                  className="w-full bg-accent text-m2m-black font-semibold hover:bg-m2m-gold-dark"
                  onClick={() => {
                    navigate("/onboarding");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
