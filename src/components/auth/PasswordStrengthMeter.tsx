/**
 * Password Strength Meter
 * Visual indicator of password strength
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { strength, label, color } = useMemo(() => {
    if (!password) {
      return { strength: 0, label: '', color: 'bg-muted' };
    }

    let score = 0;
    
    // Length checks
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Normalize to 0-4 scale
    const normalizedScore = Math.min(4, Math.floor(score / 1.75));

    const levels = [
      { strength: 0, label: 'Too weak', color: 'bg-destructive' },
      { strength: 1, label: 'Weak', color: 'bg-destructive' },
      { strength: 2, label: 'Fair', color: 'bg-warning' },
      { strength: 3, label: 'Good', color: 'bg-info' },
      { strength: 4, label: 'Strong', color: 'bg-success' },
    ];

    return levels[normalizedScore];
  }, [password]);

  if (!password) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < strength ? color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn(
        "text-xs transition-colors",
        strength <= 1 ? 'text-destructive' :
        strength === 2 ? 'text-warning' :
        strength === 3 ? 'text-info' :
        'text-success'
      )}>
        {label}
      </p>
    </div>
  );
}
