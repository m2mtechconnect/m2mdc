import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check } from "lucide-react";

interface FieldMapperProps {
  appName: string;
}

const appFields = [
  { id: "name", label: "Name", type: "string" },
  { id: "description", label: "Description", type: "text" },
  { id: "url", label: "URL", type: "url" },
  { id: "created_date", label: "Created Date", type: "date" },
  { id: "owner", label: "Owner", type: "string" },
  { id: "category", label: "Category", type: "string" },
];

const internalFields = [
  { id: "title", label: "Title", required: true },
  { id: "url", label: "URL", required: false },
  { id: "body", label: "Body/Text", required: true },
  { id: "tags", label: "Tags", required: false },
  { id: "owner", label: "Owner", required: false },
  { id: "department", label: "Department", required: false },
  { id: "sensitivity", label: "Sensitivity", required: false },
  { id: "source", label: "Source", required: true },
];

export function FieldMapper({ appName }: FieldMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({
    title: "name",
    body: "description",
    url: "url",
    source: appName.toLowerCase(),
  });

  const handleMappingChange = (internalField: string, appField: string) => {
    setMappings((prev) => ({ ...prev, [internalField]: appField }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-h5 mb-2">Field Mapping</h4>
        <p className="text-caption text-muted-foreground">
          Map fields from {appName} to your internal schema for indexing and search
        </p>
      </div>

      <div className="space-y-3">
        {internalFields.map((field) => (
          <Card key={field.id} className="p-4">
            <div className="flex items-center gap-4">
              {/* Internal Field (Right) */}
              <div className="flex-1">
                <Label className="flex items-center gap-2 mb-2">
                  {field.label}
                  {field.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-md border bg-muted text-caption">
                    {field.id}
                  </div>
                  {mappings[field.id] && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              {/* App Field (Left) */}
              <div className="flex-1">
                <Label className="mb-2 block">{appName} Field</Label>
                <Select
                  value={mappings[field.id] || ""}
                  onValueChange={(value) => handleMappingChange(field.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value={appName.toLowerCase()}>
                      {appName} (Static)
                    </SelectItem>
                    {appFields.map((appField) => (
                      <SelectItem key={appField.id} value={appField.id}>
                        {appField.label}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {appField.type}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-muted/50">
        <h4 className="text-body font-medium mb-2">Sample Payload Preview</h4>
        <pre className="text-caption overflow-auto max-h-40">
          {JSON.stringify(
            {
              title: mappings.title ? `{{${mappings.title}}}` : null,
              url: mappings.url ? `{{${mappings.url}}}` : null,
              body: mappings.body ? `{{${mappings.body}}}` : null,
              tags: mappings.tags ? `{{${mappings.tags}}}` : [],
              owner: mappings.owner ? `{{${mappings.owner}}}` : null,
              department: mappings.department ? `{{${mappings.department}}}` : null,
              sensitivity: mappings.sensitivity ? `{{${mappings.sensitivity}}}` : "internal",
              source: mappings.source || appName.toLowerCase(),
            },
            null,
            2
          )}
        </pre>
      </Card>
    </div>
  );
}
