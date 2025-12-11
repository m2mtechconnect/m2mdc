/**
 * TwinFooter - Professional landing page footer
 * M2M Tech brand styling with links, social icons, and legal text
 */

import { Link } from "react-router-dom";
import { Shield, Linkedin, Twitter, Mail, ExternalLink } from "lucide-react";
import m2mLogo from "@/assets/m2m-logo.png";

// Landing page anchor links
const productLinks = [
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Integrations", href: "#integrations" },
  { label: "Why M2M", href: "#differentiators" },
];

// External M2M website links
const companyLinks = [
  { label: "About M2M Tech", href: "https://m2mtechconnect.com/about", external: true },
  { label: "Our Team", href: "https://m2mtechconnect.com/team", external: true },
  { label: "Contact Us", href: "https://m2mtechconnect.com/contact", external: true },
  { label: "Careers", href: "https://m2mtechconnect.com/careers", external: true },
];

const resourceLinks = [
  { label: "Blog", href: "https://m2mtechconnect.com/blog", external: true },
  { label: "Case Studies", href: "https://m2mtechconnect.com/case-studies", external: true },
  { label: "Documentation", href: "https://docs.m2mtechconnect.com", external: true },
  { label: "Support", href: "https://m2mtechconnect.com/support", external: true },
];

const legalLinks = [
  { label: "Privacy Policy", href: "https://m2mtechconnect.com/privacy", external: true },
  { label: "Terms of Service", href: "https://m2mtechconnect.com/terms", external: true },
  { label: "Security", href: "https://m2mtechconnect.com/security", external: true },
];

const socialLinks = [
  { icon: Linkedin, href: "https://linkedin.com/company/m2mtechconnect", label: "LinkedIn" },
  { icon: Twitter, href: "https://twitter.com/m2mtechconnect", label: "Twitter" },
  { icon: Mail, href: "mailto:info@m2mtechconnect.com", label: "Email" },
];

export function TwinFooter() {
  const currentYear = new Date().getFullYear();

  const renderLink = (link: { label: string; href: string; external?: boolean }) => {
    if (link.external) {
      return (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
        >
          {link.label}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      );
    }
    return (
      <a
        href={link.href}
        className="text-sm text-slate-400 hover:text-white transition-colors"
      >
        {link.label}
      </a>
    );
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <a 
              href="https://m2mtechconnect.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 mb-4 group"
            >
              <img
                src={m2mLogo}
                alt="M2M Tech Connect"
                className="h-10 w-auto transition-transform group-hover:scale-105"
              />
              <div>
                <span className="font-display font-bold text-lg text-white">M2M</span>
                <span className="font-display font-medium text-lg text-slate-400 ml-1">AURA</span>
              </div>
            </a>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              Sovereign AI Data Centre Twins for sustainable, compliant infrastructure operations.
            </p>
            
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product links (landing page anchors) */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Company links (M2M website) */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-slate-500">
              © {currentYear} M2M Tech Connect Inc. All rights reserved.
            </p>
            
            {/* Trust badges */}
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-500">●</span>
                <span>Carbon Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🇨🇦</span>
                <span>Made in Canada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
