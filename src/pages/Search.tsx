import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Clock, FileSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import SearchResultsList from "@/components/search/SearchResultsList";
import SearchFilters from "@/components/search/SearchFilters";
import { DCCard, DCSectionHeader } from "@/components/dc-ui/DCCard";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

const mockSearchResults = [
  {
    id: "1",
    title: "HIPAA Compliance Guide 2024",
    snippet: "Complete guide to HIPAA compliance requirements for healthcare organizations...",
    source: "Google Drive",
    sourceType: "drive" as const,
    lastUpdated: "2 days ago",
    url: "https://example.com/doc1",
  },
  {
    id: "2",
    title: "Q4 Marketing Performance Report",
    snippet: "Quarterly marketing analysis showing 280% ROI improvement across channels...",
    source: "SharePoint",
    sourceType: "sharepoint" as const,
    lastUpdated: "1 week ago",
    url: "https://example.com/doc2",
  },
  {
    id: "3",
    title: "Zendesk Support Tickets Archive",
    snippet: "Historical support ticket data for customer service analytics and insights...",
    source: "Zapier: Zendesk",
    sourceType: "zapier" as const,
    lastUpdated: "3 hours ago",
  },
];

export default function Search() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [searchLatency, setSearchLatency] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate search latency
    const startTime = Date.now();
    setSearchStartTime(startTime);
    
    setTimeout(() => {
      const latency = Date.now() - startTime;
      setSearchLatency(latency);
    }, Math.random() * 300 + 100); // 100-400ms
  };

  const filteredResults = mockSearchResults.filter(result => {
    const matchesQuery = query === "" || 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.snippet.toLowerCase().includes(query.toLowerCase());

    const matchesFilters = filters.every(filter => {
      if (filter.label === "type") return true; // Simplified for demo
      if (filter.label === "source") {
        return result.source.toLowerCase().includes(filter.value.toLowerCase());
      }
      return true;
    });

    return matchesQuery && matchesFilters;
  });

  const showResults = query.length > 0 || filters.length > 0;

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto">
        <DCSectionHeader
          title="Search"
          subtitle="Find documents, pages, and apps across all your connected sources."
          icon={<FileSearch className="h-5 w-5" />}
        />

        {/* Search Stats */}
        {searchLatency && showResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DCKPITile
              label="Latency"
              value={searchLatency.toString()}
              unit="ms"
              status={searchLatency < 200 ? "normal" : searchLatency < 400 ? "warning" : "critical"}
              icon={<Clock className="h-4 w-4" />}
              compact
            />
            <DCKPITile
              label="Results Found"
              value={filteredResults.length.toString()}
              status="normal"
              icon={<SearchIcon className="h-4 w-4" />}
              compact
            />
            <DCKPITile
              label="Sources Searched"
              value="3"
              status="normal"
              compact
            />
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <DCCard noPadding>
            <div className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.slice(0, 500))}
                    placeholder="Search across all sources..."
                    className="pl-12 h-12 text-body bg-card border-border"
                    maxLength={500}
                  />
                </div>
                <Button type="submit" className="glow-yellow h-12 min-w-[120px]">
                  Search
                </Button>
              </div>
            </div>
          </DCCard>
        </form>

        {/* Filters */}
        {showResults && (
          <div className="mb-6">
            <SearchFilters onFilterChange={setFilters} />
          </div>
        )}

        {/* Results */}
        {showResults ? (
          filteredResults.length > 0 ? (
            <SearchResultsList results={filteredResults} query={query} />
          ) : (
            <EmptyState
              icon={SearchIcon}
              title="No results found"
              description="Try adjusting your search query or filters to find what you're looking for."
            />
          )
        ) : (
          <EmptyState
            icon={SearchIcon}
            title="Start searching"
            description="Enter a query to search across all your connected documents, pages, and apps."
          >
            <div className="mt-6">
              <p className="text-caption text-muted-foreground mb-3">Try searching for:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["HIPAA", "Marketing report", "Support tickets", "Compliance"].map((term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(term)}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
