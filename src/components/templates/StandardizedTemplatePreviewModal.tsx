/**
 * Standardized Template Preview Modal
 * Wraps StandardizedTemplatePreview in a modal dialog
 * Used across Dashboard, Marketplace, and Builder
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StandardizedTemplatePreview } from './StandardizedTemplatePreview';
import { loadTemplateById, type ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StandardizedTemplatePreviewModalProps {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'marketplace' | 'deployed' | 'preview';
  onDeploy?: () => void;
  onUse?: () => void;
  isDeploying?: boolean;
}

export function StandardizedTemplatePreviewModal({
  templateId,
  open,
  onOpenChange,
  mode,
  onDeploy,
  onUse,
  isDeploying,
}: StandardizedTemplatePreviewModalProps) {
  const [template, setTemplate] = useState<ValidatedTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && templateId) {
      loadTemplate();
    }
  }, [open, templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;

    setLoading(true);
    try {
      const loaded = await loadTemplateById(templateId);
      if (!loaded) {
        throw new Error('Template not found');
      }
      setTemplate(loaded);
    } catch (error) {
      console.error('[TemplatePreviewModal] Failed to load template:', error);
      toast({
        title: 'Failed to load template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!templateId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <ScrollArea className="h-[90vh]">
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : template ? (
            <div className="p-6">
              <StandardizedTemplatePreview
                template={template}
                mode={mode}
                onDeploy={onDeploy}
                onUse={onUse}
                isDeploying={isDeploying}
              />
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
