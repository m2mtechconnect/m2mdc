/**
 * TwinFooter - Professional landing page footer
 * M2M Tech brand styling with links, social icons, and legal text
 * i18n-enabled for English and Quebec French
 */

import { Link } from "react-router-dom";
import { Linkedin, Twitter, Mail, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import m2mLogo from "@/assets/m2m-logo.png";

const socialLinks = [
  { icon: Linkedin, href: "https://linkedin.com/company/m2mtechconnect", label: "LinkedIn" },
  { icon: Twitter, href: "https://twitter.com/m2mtechconnect", label: "Twitter" },
  { icon: Mail, href: "mailto:info@m2mtechconnect.com", label: "Email" },
];

export function TwinFooter() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { label: t('landing.features'), href: "#features" },
    { label: t('landing.useCases'), href: "#use-cases" },
    { label: t('landing.integrations'), href: "#integrations" },
    { label: t('landing.whyM2M'), href: "#differentiators" },
    { label: t('landing.clientLogin'), href: "/login", internal: true },
  ];

  const companyLinks = [
    { label: t('landing.aboutM2M'), href: "https://m2mtechconnect.com/about", external: true },
    { label: t('landing.ourTeam'), href: "https://m2mtechconnect.com/team", external: true },
    { label: t('landing.contactUs'), href: "https://m2mtechconnect.com/contact", external: true },
    { label: t('landing.careers'), href: "https://m2mtechconnect.com/careers", external: true },
  ];

  const resourceLinks = [
    { label: t('landing.blog'), href: "https://m2mtechconnect.com/blog", external: true },
    { label: t('landing.caseStudies'), href: "https://m2mtechconnect.com/case-studies", external: true },
    { label: t('landing.documentation'), href: "https://docs.m2mtechconnect.com", external: true },
    { label: t('landing.support'), href: "https://m2mtechconnect.com/support", external: true },
  ];

  const legalLinks = [
    { label: t('landing.privacyPolicy'), href: "https://m2mtechconnect.com/privacy", external: true },
    { label: t('landing.termsOfService'), href: "https://m2mtechconnect.com/terms", external: true },
    { label: t('landing.security'), href: "https://m2mtechconnect.com/security", external: true },
  ];

  const renderLink = (link: { label: string; href: string; external?: boolean; internal?: boolean }) => {
    if (link.internal) {
      return (
        <Link to={link.href} className="text-sm text-slate-300 hover:text-accent transition-colors">
          {link.label}
        </Link>
      );
    }
    if (link.external) {
      return (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-accent transition-colors inline-flex items-center gap-1">
          {link.label}
          <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
        </a>
      );
    }
    return <a href={link.href} className="text-sm text-slate-300 hover:text-accent transition-colors">{link.label}</a>;
  };

  return (
    <footer className="bg-slate-900 text-slate-200 border-t border-slate-700">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <a href="https://m2mtechconnect.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 mb-4 group">
              <img src={m2mLogo} alt="M2M Tech Connect" className="h-10 w-auto transition-transform group-hover:scale-105" />
              <div>
                <span className="font-display font-bold text-lg text-white">M2M</span>
                <span className="font-display font-medium text-lg text-slate-200 ml-1">AURA</span>
              </div>
            </a>
            <p className="text-sm text-slate-300 mb-6 max-w-xs">{t('landing.footerDescription')}</p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-accent/20 hover:text-accent flex items-center justify-center transition-colors" aria-label={social.label}>
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t('landing.product')}</h4>
            <ul className="space-y-3">{productLinks.map((link) => <li key={link.label}>{renderLink(link)}</li>)}</ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t('landing.company')}</h4>
            <ul className="space-y-3">{companyLinks.map((link) => <li key={link.label}>{renderLink(link)}</li>)}</ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t('landing.resources')}</h4>
            <ul className="space-y-3">{resourceLinks.map((link) => <li key={link.label}>{renderLink(link)}</li>)}</ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t('landing.legal')}</h4>
            <ul className="space-y-3">{legalLinks.map((link) => <li key={link.label}>{renderLink(link)}</li>)}</ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-300">{t('landing.copyright', { year: currentYear })}</p>
            <div className="flex items-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-accent">●</span>
                <span>{t('landing.carbonNeutral')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🇨🇦</span>
                <span>{t('landing.madeInCanada')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
