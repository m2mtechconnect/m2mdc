/**
 * LanguageSwitcher — Toggle between English and Quebec French
 */

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr-CA', label: 'Français (QC)', short: 'FR' },
] as const;

export function LanguageSwitcher({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' }) {
  const { i18n } = useTranslation();
  const current = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-1.5 text-sm"
          aria-label={`Change language, current: ${current.label}`}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{current.short}</span>
          <span className="hidden lg:inline">· {current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => i18n.changeLanguage(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent/10 font-medium' : ''}
          >
            <span className="mr-2 inline-block w-6 text-xs font-semibold tracking-wide text-muted-foreground">
              {lang.short}
            </span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
