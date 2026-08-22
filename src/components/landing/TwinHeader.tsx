/** Landing-page header for M2M AURA. */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AuraLogo } from '@/components/brand/AuraLogo';

export function TwinHeader() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const frameRef = useRef<number | null>(null);

  const navItems = [
    { label: t('landing.features'), href: '#features' },
    { label: t('landing.useCases'), href: '#use-cases' },
    { label: t('landing.integrations'), href: '#integrations' },
    { label: t('landing.whyM2M'), href: '#differentiators' },
  ];

  useEffect(() => {
    const update = () => {
      frameRef.current = null;
      setIsScrolled((current) => {
        const next = window.scrollY > 20;
        return current === next ? current : next;
      });
    };
    const handleScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const requestSection = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    const id = href.replace(/^#/, '');
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new CustomEvent('aura:landing-body-request', { detail: id }));
    setIsMobileMenuOpen(false);
  };

  const french = i18n.language.toLowerCase().startsWith('fr');
  const toggleLanguage = () => void i18n.changeLanguage(french ? 'en' : 'fr-CA');

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-200',
        isScrolled
          ? 'bg-background/95 border-b border-border shadow-sm'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <a href="/" className="flex items-center" aria-label="M2M AURA home">
            <AuraLogo surface="light" className="hidden sm:flex" />
            <AuraLogo surface="light" compact className="sm:hidden" />
            <h1 className="sr-only">M2M AURA - Sovereign AI Data Centre Digital Twin Platform</h1>
          </a>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Public navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => requestSection(event, item.href)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-sm"
              onClick={toggleLanguage}
              aria-label={`Change language to ${french ? 'English' : 'Français'}`}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              {french ? 'FR' : 'EN'}
            </Button>
            <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => navigate('/login')}>
              {t('auth.login')}
            </Button>
            <Button className="text-sm bg-accent text-m2m-black font-semibold hover:bg-m2m-gold-dark" onClick={() => navigate('/onboarding')}>
              {t('auth.getStarted')}
            </Button>
          </div>

          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6 text-muted-foreground" aria-hidden="true" /> : <Menu className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border bg-background/95">
            <nav className="flex flex-col gap-2" aria-label="Public mobile navigation">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) => requestSection(event, item.href)}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
                <Button variant="outline" className="w-full gap-2" onClick={toggleLanguage}>
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  {french ? 'Français (QC)' : 'English'}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>
                  {t('auth.login')}
                </Button>
                <Button className="w-full bg-accent text-m2m-black font-semibold hover:bg-m2m-gold-dark" onClick={() => { navigate('/onboarding'); setIsMobileMenuOpen(false); }}>
                  {t('auth.getStarted')}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
