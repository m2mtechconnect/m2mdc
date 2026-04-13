import { useTranslation } from "react-i18next";
import { useState } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { EnhancedSearchBar } from "@/components/search/EnhancedSearchBar";
import { SearchResultsPanel } from "@/components/search/SearchResultsPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";

export default function UniversalSearch() {
  const [searchResult, setSearchResult] = useState<any>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("recent_searches");
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
      localStorage.removeItem("recent_searches");
    }
    return [];
  });

  const handleSearch = (query: string, intent: string, result: any) => {
    console.log("Search completed:", { query, intent, result });
    setSearchResult(result);
    
    // Store recent search
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 5);
      localStorage.setItem("recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAction = (action: string, data?: any) => {
    switch (action) {
      case "save-report":
        toast.success("Report saved to your library");
        break;
      case "add-to-library":
        toast.success("Added to Knowledge Library");
        break;
      case "save-knowledge-source":
        toast.success(`${data} saved as knowledge source`);
        break;
      case "index-site":
        toast.info(`Queuing deeper crawl for ${data}`);
        break;
      default:
        console.log("Action:", action, data);
    }
  };

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Universal Search"
          description="Ask anything or paste a website URL for instant answers with citations."
        />

        <div className="mb-8">
          <EnhancedSearchBar onSearch={handleSearch} enableGlobalShortcut />
        </div>

        {searchResult ? (
          <SearchResultsPanel result={searchResult} onAction={handleAction} />
        ) : (
          <EmptyState
            icon={SearchIcon}
            title="Start Searching"
            description="Enter a natural language query or paste a website URL to get instant answers with citations."
          >
            {recentSearches.length > 0 && (
              <div className="mt-6">
                <p className="text-caption text-muted-foreground mb-3">Recent searches:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        toast.info(`Loading search: ${search}`);
                      }}
                      className="px-4 py-2 text-caption rounded-lg bg-muted hover:bg-muted/80 transition-smooth"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
