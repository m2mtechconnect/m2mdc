import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye } from "lucide-react";

interface ParsedItem {
  title: string;
  chunks: number;
  preview: string;
}

interface PreviewPaneProps {
  items: ParsedItem[];
}

export default function PreviewPane({ items }: PreviewPaneProps) {
  if (items.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-bold">Processing Preview</h3>
        <Badge variant="outline" className="text-xs">{items.length} documents</Badge>
      </div>
      <div className="space-y-4">
        {items.slice(0, 3).map((item, idx) => (
          <div key={idx} className="p-4 border border-border rounded-lg">
            <div className="flex items-start gap-3 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-medium mb-1">{item.title}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {item.chunks} chunks extracted
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  <span className="font-mono">{item.preview}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length > 3 && (
          <div className="text-sm text-muted-foreground text-center">
            + {items.length - 3} more documents processing...
          </div>
        )}
      </div>
    </Card>
  );
}
