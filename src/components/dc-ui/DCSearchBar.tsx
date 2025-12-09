/**
 * Data Centre Search Bar Component
 * Command console-style search with DC-specific suggestions
 */

import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Thermometer, Zap, Cpu, Globe, DollarSign, Wind, Network, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Suggestion {
  id: string;
  query: string;
  category: 'thermal' | 'power' | 'gpu' | 'sovereignty' | 'carbon' | 'cooling' | 'network' | 'security';
  icon: typeof Thermometer;
}

const dcSuggestions: Suggestion[] = [
  { id: '1', query: 'Explain current PUE trajectory', category: 'power', icon: Zap },
  { id: '2', query: 'Show GPU cluster saturation risk', category: 'gpu', icon: Cpu },
  { id: '3', query: 'Simulate cooling failure scenario', category: 'cooling', icon: Wind },
  { id: '4', query: 'Run GPU spike simulation', category: 'gpu', icon: Cpu },
  { id: '5', query: 'Simulate UPS failure impact', category: 'power', icon: Zap },
  { id: '6', query: 'Analyze rack thermal distribution', category: 'thermal', icon: Thermometer },
  { id: '7', query: 'Check sovereignty compliance status', category: 'sovereignty', icon: Globe },
  { id: '8', query: 'Simulate grid outage scenario', category: 'power', icon: Zap },
  { id: '9', query: 'What happens if carbon price spikes', category: 'carbon', icon: DollarSign },
  { id: '10', query: 'Run thermal safety simulation', category: 'thermal', icon: Thermometer },
];

const categoryColors = {
  thermal: 'text-dc-red bg-dc-red/10 border-dc-red/20',
  power: 'text-dc-amber bg-dc-amber/10 border-dc-amber/20',
  gpu: 'text-dc-purple bg-dc-purple/10 border-dc-purple/20',
  sovereignty: 'text-dc-blue bg-dc-blue/10 border-dc-blue/20',
  carbon: 'text-dc-green bg-dc-green/10 border-dc-green/20',
  cooling: 'text-dc-cyan bg-dc-cyan/10 border-dc-cyan/20',
  network: 'text-dc-blue bg-dc-blue/10 border-dc-blue/20',
  security: 'text-dc-red bg-dc-red/10 border-dc-red/20',
};

export interface DCSearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  onCoPilotQuery?: (query: string) => void;
  onChipClick?: (chip: string) => void;
  placeholder?: string;
  className?: string;
}

export function DCSearchBar({
  value: externalValue,
  onChange: externalOnChange,
  onSearch,
  onCoPilotQuery,
  onChipClick,
  placeholder = 'Ask about thermals, power, GPUs, sovereignty...',
  className,
}: DCSearchBarProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external value if provided, otherwise use internal state
  const query = externalValue !== undefined ? externalValue : internalQuery;
  const setQuery = (value: string) => {
    if (externalOnChange) {
      externalOnChange(value);
    } else {
      setInternalQuery(value);
    }
  };

  // Filter suggestions based on query
  const filteredSuggestions = query.length > 0
    ? dcSuggestions.filter(s => 
        s.query.toLowerCase().includes(query.toLowerCase()) ||
        s.category.includes(query.toLowerCase())
      )
    : dcSuggestions.slice(0, 6);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onCoPilotQuery?.(query);
      onSearch?.(query);
      setQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onCoPilotQuery?.(suggestion.query);
    onSearch?.(suggestion.query);
    setQuery('');
    setShowSuggestions(false);
  };

  const handleChipClick = (chip: string) => {
    if (onChipClick) {
      onChipClick(chip);
    } else {
      setQuery(chip);
      inputRef.current?.focus();
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-3xl mx-auto', className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'relative flex items-center gap-3 rounded-lg border bg-noc-surface transition-all',
            isFocused ? 'border-primary shadow-glow-cyan' : 'border-noc-border hover:border-noc-border-subtle'
          )}
        >
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { setIsFocused(true); setShowSuggestions(true); }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 bg-transparent py-4 pl-12 pr-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          
          <Button
            type="submit"
            size="sm"
            className="mr-2 gap-2"
            disabled={!query.trim()}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ask CoPilot</span>
          </Button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 rounded-lg border border-noc-border bg-noc-surface-elevated shadow-elevated overflow-hidden">
          <div className="p-2 border-b border-noc-border">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Quick commands
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {filteredSuggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-noc-surface transition-colors"
                >
                  <div className={cn('p-1.5 rounded border', categoryColors[suggestion.category])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{suggestion.query}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] uppercase px-1.5 py-0.5 rounded border',
                    categoryColors[suggestion.category]
                  )}>
                    {suggestion.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick chips */}
      {!showSuggestions && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {['PUE', 'GPU Load', 'Thermals', 'Cooling', 'Simulation', 'Sovereignty'].map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className="px-3 py-1 text-xs rounded-full border border-noc-border bg-noc-surface hover:border-primary hover:text-primary transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DCSearchBar;
