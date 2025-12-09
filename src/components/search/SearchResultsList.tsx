import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Database, Globe, Zap } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: string;
  sourceType: "drive" | "sharepoint" | "web" | "zapier";
  lastUpdated: string;
  url?: string;
}

interface SearchResultsListProps {
  results: SearchResult[];
  query: string;
}

export default function SearchResultsList({ results, query }: SearchResultsListProps) {
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "drive":
        return <Database className="h-4 w-4 text-primary" />;
      case "sharepoint":
        return <Database className="h-4 w-4 text-secondary" />;
      case "web":
        return <Globe className="h-4 w-4 text-primary" />;
      case "zapier":
        return <Zap className="h-4 w-4 text-secondary" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!text || !query) return text || '';
    try {
      const regex = new RegExp(`(${query})`, "gi");
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-foreground font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (error) {
      console.error('Error highlighting text:', error);
      return text;
    }
  };

  if (results.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">No results found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Card key={result.id} className="p-6 hover:border-primary/50 transition-smooth cursor-pointer group">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getSourceIcon(result.sourceType)}
              <Badge variant="outline" className="text-xs">{result.source}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{result.lastUpdated}</div>
          </div>
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-smooth">
            {highlightText(result.title, query)}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {highlightText(result.snippet, query)}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Preview
            </Button>
            {result.url && (
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Source
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
