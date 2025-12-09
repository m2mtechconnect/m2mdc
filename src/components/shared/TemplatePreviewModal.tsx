import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StandardizedTemplatePreview } from '@/components/templates/StandardizedTemplatePreview';
import { useTemplateUseHandler } from '@/components/templates/TemplateUseHandler';
import { loadTemplateById } from '@/lib/templates/unifiedTemplateService';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { TemplateCatalogItem } from '@/stores/templatesCatalogStore';

interface TemplatePreviewModalProps {
  template: TemplateCatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (template: TemplateCatalogItem) => void;
}

export function TemplatePreviewModal({ template, open, onOpenChange, onUse }: TemplatePreviewModalProps) {
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
    handleUseTemplate(template.id, 'marketplace');
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
              mode="marketplace"
              onUse={handleUseClick}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
