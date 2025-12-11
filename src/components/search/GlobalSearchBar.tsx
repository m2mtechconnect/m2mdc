import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, FileText, Database, Zap, Settings, BarChart3, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  type: "file" | "page" | "app" | "setting";
  source?: string;
  path: string;
  icon: typeof FileText;
}

/**
 * Search results for Data Centre Twin operations
 * Categories: Documents, Pages, Apps/Integrations, Settings
 */
const dcSearchResults: SearchResult[] = [
  { id: "1", title: "ASHRAE TC 9.9 Thermal Guidelines", type: "file", source: "Documentation", path: "/builder?doc=ashrae-tc99", icon: FileText },
  { id: "2", title: "Uptime Institute Tier III Certification", type: "file", source: "Compliance", path: "/builder?doc=uptime-tier3", icon: FileText },
  { id: "3", title: "PIPEDA Data Residency Policy", type: "file", source: "Sovereignty", path: "/builder?doc=pipeda-policy", icon: Shield },
  { id: "4", title: "Telemetry & Analytics Dashboard", type: "page", path: "/intelligence", icon: BarChart3 },
  { id: "5", title: "Sovereignty & Safety Audit", type: "page", path: "/compliance", icon: Shield },
  { id: "6", title: "Prometheus Integration", type: "app", source: "Metrics Backend", path: "/connect", icon: Zap },
  { id: "7", title: "DCIM Platform Settings", type: "setting", path: "/builder", icon: Settings },
  { id: "8", title: "Carbon Intensity Dashboard", type: "page", path: "/data-centre-twin?tab=financial", icon: BarChart3 },
  { id: "9", title: "GPU Scheduler Agent Config", type: "setting", path: "/manage-agents", icon: Database },
];

export default function GlobalSearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredResults = dcSearchResults.filter((result) =>
    result.title.toLowerCase().includes(query.toLowerCase()) ||
    result.source?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string, title: string) => {
    setOpen(false);
    setQuery("");
    
    // Add to recent searches
    setRecentSearches((prev) => {
      const updated = [title, ...prev.filter((t) => t !== title)].slice(0, 5);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
      return updated;
    });

    navigate(path);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentSearches");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
      localStorage.removeItem("recentSearches");
    }
  }, []);

  const groupedResults = {
    files: filteredResults.filter((r) => r.type === "file"),
    pages: filteredResults.filter((r) => r.type === "page"),
    apps: filteredResults.filter((r) => r.type === "app"),
    settings: filteredResults.filter((r) => r.type === "setting"),
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search documents, pages, apps... (Ctrl+K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="empty-state py-8">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-caption text-muted-foreground">No results found</p>
          </div>
        </CommandEmpty>

        {!query && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((search, idx) => (
                <CommandItem
                  key={idx}
                  onSelect={() => setQuery(search)}
                  className="cursor-pointer"
                >
                  <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-caption">{search}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groupedResults.files.length > 0 && (
          <CommandGroup heading="Documents">
            {groupedResults.files.map((result) => (
              <CommandItem
                key={result.id}
                onSelect={() => handleSelect(result.path, result.title)}
                className="cursor-pointer"
              >
                <result.icon className="h-4 w-4 mr-3 text-primary" />
                <div className="flex-1">
                  <div className="text-caption font-medium">{result.title}</div>
                  {result.source && (
                    <div className="text-caption text-muted-foreground">{result.source}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-caption ml-2">File</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupedResults.pages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pages">
              {groupedResults.pages.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result.path, result.title)}
                  className="cursor-pointer"
                >
                  <result.icon className="h-4 w-4 mr-3 text-secondary" />
                  <span className="text-caption">{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {groupedResults.apps.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Apps & Integrations">
              {groupedResults.apps.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result.path, result.title)}
                  className="cursor-pointer"
                >
                  <result.icon className="h-4 w-4 mr-3 text-primary" />
                  <div className="flex-1">
                    <div className="text-caption">{result.title}</div>
                    {result.source && (
                      <div className="text-caption text-muted-foreground">{result.source}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {groupedResults.settings.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              {groupedResults.settings.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result.path, result.title)}
                  className="cursor-pointer"
                >
                  <result.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span className="text-caption">{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
