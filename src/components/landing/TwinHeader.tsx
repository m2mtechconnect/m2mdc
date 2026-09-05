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
  const [scrollProgress, setScrollProgress] = useState(0);
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
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
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
        'fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] transition-[border-color,box-shadow] duration-200',
        isScrolled ? 'border-b border-white/10 shadow-lg shadow-black/40' : 'border-b border-white/5',
      )}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px bg-success transition-[width] duration-150 ease-out"
        style={{ width: `${scrollProgress * 100}%` }}
      />
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <a href="/" className="flex items-center" aria-label="AURA home">
            <AuraLogo surface="dark" className="hidden sm:flex" />
            <AuraLogo surface="dark" compact className="sm:hidden" />
            <h1 className="sr-only">AURA by M2M - Sovereign AI Data Centre Digital Twin Platform</h1>
          </a>

          <nav className="hidden lg:flex items-center gap-10" aria-label="Public navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => requestSection(event, item.href)}
                className="text-xs font-medium uppercase tracking-[0.2em] text-[#AEB4BC] transition-colors hover:text-success"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
              onClick={toggleLanguage}
              aria-label={`Change language to ${french ? 'English' : 'Français'}`}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              {french ? 'FR' : 'EN'}
            </button>
            <button
              type="button"
              className="text-xs font-medium uppercase tracking-[0.2em] text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
              onClick={() => navigate('/login')}
            >
              {t('auth.login')}
            </button>
            <Button
              className="h-10 rounded-none border border-white/20 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5F7FA] hover:border-accent hover:bg-transparent hover:text-accent"
              onClick={() => navigate('/sign-up')}
            >
              {t('auth.getStarted')}
            </Button>
          </div>

          <button
            className="lg:hidden p-2 rounded-lg transition-colors hover:bg-white/5"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6 text-[#C9CDD3]" aria-hidden="true" /> : <Menu className="h-6 w-6 text-[#C9CDD3]" aria-hidden="true" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/10 bg-[#0A0A0A]">
            <nav className="flex flex-col gap-2" aria-label="Public mobile navigation">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) => requestSection(event, item.href)}
                  className="px-3 py-2 text-sm font-medium uppercase tracking-[0.18em] text-[#C9CDD3] transition-colors hover:bg-white/5 hover:text-[#F5F7FA]"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                <Button variant="outline" className="w-full gap-2 rounded-none border-white/20 bg-transparent text-[#F5F7FA] hover:bg-white/5" onClick={toggleLanguage}>
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  {french ? 'Français (QC)' : 'English'}
                </Button>
                <Button variant="outline" className="w-full rounded-none border-white/20 bg-transparent text-[#F5F7FA] hover:bg-white/5" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>
                  {t('auth.login')}
                </Button>
                <Button className="w-full rounded-none bg-accent text-accent-foreground font-semibold hover:bg-accent/90" onClick={() => { navigate('/sign-up'); setIsMobileMenuOpen(false); }}>
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
