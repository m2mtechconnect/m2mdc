/**
 * TwinFooter - Professional landing page footer
 * M2M Tech brand styling with links, social icons, and legal text
 * i18n-enabled for English and Quebec French
 */

import { Link } from "react-router-dom";
import { Linkedin, Twitter, Mail, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuraLogo } from "@/components/brand/AuraLogo";

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
    { label: t('landing.omniverseLiveScene'), href: "/twin-preview", internal: true },
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
    const cls = "text-sm text-[#C9CDD3] transition-colors hover:text-success";
    if (link.internal) {
      return <Link to={link.href} className={cls}>{link.label}</Link>;
    }
    if (link.external) {
      return (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className={`${cls} inline-flex items-center gap-1`}>
          {link.label}
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
        </a>
      );
    }
    return <a href={link.href} className={cls}>{link.label}</a>;
  };

  const columns = [
    { title: t('landing.product'), links: productLinks },
    { title: t('landing.company'), links: companyLinks },
    { title: t('landing.resources'), links: resourceLinks },
    { title: t('landing.legal'), links: legalLinks },
  ];

  return (
    <footer className="border-t border-[#3A3A3A] bg-[#0A0A0A] text-[#C9CDD3]">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5 lg:gap-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <a
              href="https://m2mtechconnect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3"
              aria-label="AURA by M2M Tech Connect"
            >
              <AuraLogo surface="dark" />
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#AEB4BC]">
              {t('landing.footerDescription')}
            </p>
            <div className="mt-7 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center border border-[#3A3A3A] text-[#C9CDD3] transition-colors hover:border-success hover:text-success"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F5F7FA]">
                {column.title}
              </h2>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#3A3A3A]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#AEB4BC]">
            {t('landing.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-8 text-xs text-[#AEB4BC]">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="uppercase tracking-[0.14em]">{t('landing.carbonNeutral')}</span>
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true">🇨🇦</span>
              <span className="uppercase tracking-[0.14em]">{t('landing.madeInCanada')}</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

