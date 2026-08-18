/**
 * SSO Login Buttons
 *
 * Only providers configured on the backend are actionable. Unconfigured
 * providers render disabled with an explicit reason so the UI never implies
 * a capability that does not exist.
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SSO_PROVIDERS } from '@/auth/ssoProviders';

interface SSOButtonsProps {
  onGoogleClick?: () => void;
  onMicrosoftClick?: () => void;
  onSSOClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SSOButtons({ 
  onGoogleClick, 
  onMicrosoftClick, 
  onSSOClick,
  disabled,
  className 
}: SSOButtonsProps) {
  const google = SSO_PROVIDERS.google;
  const microsoft = SSO_PROVIDERS.microsoft;
  const enterprise = SSO_PROVIDERS.enterprise;
  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onGoogleClick}
          disabled={disabled}
          className="h-11 gap-2 font-medium hover:bg-muted/50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onMicrosoftClick}
          disabled={disabled}
          className="h-11 gap-2 font-medium hover:bg-muted/50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#f25022" d="M1 1h10v10H1z" />
            <path fill="#00a4ef" d="M1 13h10v10H1z" />
            <path fill="#7fba00" d="M13 1h10v10H13z" />
            <path fill="#ffb900" d="M13 13h10v10H13z" />
          </svg>
          Microsoft
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onSSOClick}
        disabled={disabled}
        className="w-full h-11 gap-2 font-medium hover:bg-muted/50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Enterprise SSO
      </Button>
    </div>
  );
}
