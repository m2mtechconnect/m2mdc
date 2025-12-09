import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalyticsFiltersProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  departments: string[];
  selectedDepartments: string[];
  onDepartmentChange: (departments: string[]) => void;
  systems: { id: string; name: string }[];
  selectedSystems: string[];
  onSystemChange: (systems: string[]) => void;
}

export default function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
  departments,
  selectedDepartments,
  onDepartmentChange,
  systems,
  selectedSystems,
  onSystemChange,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[180px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card z-50">
          <SelectItem value="7">Last 7 Days</SelectItem>
          <SelectItem value="30">Last 30 Days</SelectItem>
          <SelectItem value="90">Last 90 Days</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={selectedDepartments.length > 0 ? selectedDepartments.join(',') : 'all'}
        onValueChange={(val) => onDepartmentChange(val === 'all' ? [] : val.split(','))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent className="bg-card z-50">
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedSystems.length > 0 ? selectedSystems.join(',') : 'all'}
        onValueChange={(val) => onSystemChange(val === 'all' ? [] : val.split(','))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Systems" />
        </SelectTrigger>
        <SelectContent className="bg-card z-50">
          <SelectItem value="all">All Systems</SelectItem>
          {systems.map((sys) => (
            <SelectItem key={sys.id} value={sys.id}>
              {sys.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
