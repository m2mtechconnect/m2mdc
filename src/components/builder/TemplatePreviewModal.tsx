/**
 * Builder Template Preview Modal
 * Uses standardized preview component for consistency
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StandardizedTemplatePreview } from '@/components/templates/StandardizedTemplatePreview';
import { useTemplateUseHandler } from '@/components/templates/TemplateUseHandler';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  version?: string;
  rating?: number;
  downloads?: number;
  roi_pct?: number;
  default_config?: any;
}

interface TemplatePreviewModalProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate?: (template: Template) => void;
  mode?: "full" | "embedded";
}

export function TemplatePreviewModal({
  template,
  open,
  onOpenChange,
  onUseTemplate,
  mode = "full"
}: TemplatePreviewModalProps) {
  const [validatedTemplate, setValidatedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { handleUseTemplate } = useTemplateUseHandler();

  useEffect(() => {
    if (open && template) {
      loadTemplate();
    }
  }, [open, template]);

  const loadTemplate = async () => {
    if (!template) return;

    setLoading(true);
    try {
      const loaded = await loadTemplateById(template.id);
      setValidatedTemplate(loaded);
    } catch (error) {
      console.error('[TemplatePreviewModal] Failed to load template:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  const handleUseClick = () => {
    if (onUseTemplate) {
      onUseTemplate(template);
    } else {
      handleUseTemplate(template.id, 'builder');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[88vh] p-6">
          {loading || !validatedTemplate ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <StandardizedTemplatePreview
              template={validatedTemplate}
              mode="preview"
              onUse={handleUseClick}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
