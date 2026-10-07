import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuraLogo } from '@/components/brand/AuraLogo';
import './SignInLayout.css';

interface SignInLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

/** Public sign-in presentation only. Authentication remains in SignIn. */
export function SignInLayout({ children, title, subtitle }: SignInLayoutProps) {
  return (
    <main className="aura-sign-in">
      <div className="aura-sign-in-backdrop" aria-hidden="true">
        <img src="/landing/dsx/auth-interior-source.jpg" alt="" width="1920" height="985" fetchPriority="high" />
      </div>
      <section className="aura-sign-in-story" aria-label="AURA AI factory workspace">
        <Link to="/" className="aura-sign-in-brand" aria-label="AURA home">
          <AuraLogo surface="dark" showParentBrand={false} />
        </Link>
        <div className="aura-sign-in-story-copy">
          <p className="aura-sign-in-eyebrow">AI factory intelligence</p>
          <h1>Your AI factory.<br /><span>One connected view.</span></h1>
          <p>Design, explore and understand your data centre. Bring your configuration, simulation and evidence together in AURA.</p>
          <div className="aura-sign-in-workspaces">Design &amp; Build <span>•</span> Simulate <span>•</span> Operate <span>•</span> Evidence</div>
        </div>
        <p className="aura-sign-in-caption">NVIDIA DSX reference interior</p>
      </section>
      <section className="aura-sign-in-form" aria-label={title}>
        <div className="aura-sign-in-form-inner">
          <Link to="/" className="aura-sign-in-mobile-brand" aria-label="AURA home">
            <AuraLogo surface="dark" showParentBrand={false} />
          </Link>
          <header className="mb-8">
            <p className="aura-sign-in-eyebrow mb-3">Welcome to AURA</p>
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">{title}</h2>
            <p className="mt-3 text-muted-foreground">{subtitle}</p>
          </header>
          {children}
          <p className="aura-sign-in-attribution">Powered by M2M Tech</p>
        </div>
      </section>
    </main>
  );
}
