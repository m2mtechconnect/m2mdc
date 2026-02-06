/**
 * TwinHeader - Landing page header with M2M logo and navigation
 * Premium sticky header with glassmorphism effect
 * Fixed CTAs to route to /auth
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import m2mLogo from "@/assets/m2m-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Integrations", href: "#integrations" },
  { label: "Why M2M", href: "#differentiators" },
];

const productItems = [
  { label: "Digital Twin Studio", href: "/dashboard", description: "3D visualization & monitoring" },
  { label: "Blueprint Designer", href: "/blueprint", description: "Configure your data centre" },
  { label: "Simulation Engine", href: "/simulation", description: "Run operational scenarios" },
  { label: "Agent Marketplace", href: "/agents", description: "AI subsystem agents" },
];

const solutionItems = [
  { label: "For CIOs & CTOs", href: "#use-cases", description: "Sovereignty & compliance" },
  { label: "For Data Centre Ops", href: "#use-cases", description: "PUE & thermal management" },
  { label: "For Sustainability", href: "#use-cases", description: "Carbon tracking & ESG" },
  { label: "For AI/ML Teams", href: "#use-cases", description: "GPU utilization" },
];

export function TwinHeader() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-lg shadow-slate-200/50"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <img
              src={m2mLogo}
              alt="M2M Tech Connect"
              className="h-8 lg:h-10 w-auto transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:block">
              <span className="font-display text-lg font-bold text-foreground">
                M2M
              </span>
              <span className="font-display text-lg font-medium text-muted-foreground ml-1">
                AURA
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Products Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                Products
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {productItems.map((item) => (
                  <DropdownMenuItem 
                    key={item.label}
                    onClick={() => navigate(item.href)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Solutions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                Solutions
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {solutionItems.map((item) => (
                  <DropdownMenuItem 
                    key={item.label}
                    onClick={() => item.href.startsWith('#') ? window.location.hash = item.href : navigate(item.href)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium">{item.label}</span>
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
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons - Fixed to /auth */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-sm text-slate-700 hover:text-slate-900"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
            <Button
              className="text-sm bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-slate-700" />
            ) : (
              <Menu className="h-6 w-6 text-slate-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-200 bg-white/95 backdrop-blur-md">
            <nav className="flex flex-col gap-2">
              {/* Products section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Products
              </div>
              {productItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={() => {
                    navigate(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </a>
              ))}

              <div className="h-px bg-border/50 my-2" />

              {/* Solutions section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Solutions
              </div>
              {solutionItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
                    navigate("/auth");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => {
                    navigate("/auth");
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
