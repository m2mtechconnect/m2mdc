/**
 * Marketplace Hero Section
 * Provides search and filtering for template marketplace
 */
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';

interface MarketplaceHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MarketplaceHero({ searchQuery, onSearchChange }: MarketplaceHeroProps) {
  return (
    <div className="text-center space-y-6 mb-12">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">M2M Certified Templates</span>
      </div>
      
      <div className="space-y-3">
        <h1 className="text-h1 font-display text-gradient-hero">
          Template Marketplace
        </h1>
        <p className="text-body text-lg max-w-2xl mx-auto">
          Production-ready templates for digital twins and AI agents. Certified by industry experts.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search templates by name, industry, or capability..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>
    </div>
  );
}
