import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, X } from "lucide-react";

interface Filter {
  id: string;
  label: string;
  value: string;
}

interface SearchFiltersProps {
  onFilterChange: (filters: Filter[]) => void;
}

export default function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    updateFilters("type", value);
  };

  const handleSourceChange = (value: string) => {
    setSourceFilter(value);
    updateFilters("source", value);
  };

  const updateFilters = (label: string, value: string) => {
    if (value === "all" || value === "") {
      const updated = activeFilters.filter(f => f.label !== label);
      setActiveFilters(updated);
      onFilterChange(updated);
    } else {
      const updated = [
        ...activeFilters.filter(f => f.label !== label),
        { id: `${label}-${value}`, label, value }
      ];
      setActiveFilters(updated);
      onFilterChange(updated);
    }
  };

  const removeFilter = (id: string) => {
    const updated = activeFilters.filter(f => f.id !== id);
    setActiveFilters(updated);
    onFilterChange(updated);

    // Reset UI
    const filter = activeFilters?.find(f => f.id === id);
    if (filter?.label === "type") setTypeFilter("all");
    if (filter?.label === "source") setSourceFilter("all");
    if (filter?.label === "date") setDateFilter("");
  };

  const clearAll = () => {
    setActiveFilters([]);
    setTypeFilter("all");
    setSourceFilter("all");
    setDateFilter("");
    onFilterChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="file">Files</SelectItem>
            <SelectItem value="page">Pages</SelectItem>
            <SelectItem value="app">Apps</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="drive">Google Drive</SelectItem>
            <SelectItem value="sharepoint">SharePoint</SelectItem>
            <SelectItem value="web">Website</SelectItem>
            <SelectItem value="zapier">Zapier</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              updateFilters("date", e.target.value);
            }}
            className="w-[180px] pl-10"
          />
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="gap-2 cursor-pointer hover:bg-destructive/10 transition-smooth"
              onClick={() => removeFilter(filter.id)}
            >
              {filter.label}: {filter.value}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={clearAll}
              className="text-caption text-muted-foreground hover:text-foreground transition-smooth underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
