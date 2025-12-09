import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Sparkles } from 'lucide-react';

interface ManualContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { url: string; companyName: string; content: string }) => void;
  defaultUrl?: string;
}

export function ManualContentDialog({ open, onOpenChange, onSubmit, defaultUrl = '' }: ManualContentDialogProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [companyName, setCompanyName] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    
    onSubmit({
      url: url.trim() || 'manual-input',
      companyName: companyName.trim() || 'Unknown Company',
      content: content.trim()
    });
    
    // Reset form
    setContent('');
    setCompanyName('');
    onOpenChange(false);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isValid = content.trim().length > 100 && wordCount >= 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manual Content Input
          </DialogTitle>
          <DialogDescription>
            Paste website content directly to generate recommendations when automatic crawling fails.
            This is useful for sites with SSL issues or anti-scraping protection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL (Optional)</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company Name (Optional)</Label>
            <Input
              id="company"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Website Content *
              <span className="text-xs text-muted-foreground ml-2">
                ({wordCount} words)
              </span>
            </Label>
            <Textarea
              id="content"
              placeholder="Paste the About page, Services page, or any detailed content about the business here...&#10;&#10;Example:&#10;'We are a consulting firm specializing in digital transformation and AI implementation. Our services include:&#10;- Strategy consulting&#10;- Technology implementation&#10;- Change management&#10;- Training and support'"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 50 words required. Include information about services, products, industry, and business operations for best results.
            </p>
          </div>

          {!isValid && content.length > 0 && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
              ⚠ Need at least 50 words to generate quality recommendations. Currently: {wordCount} words.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Recommendations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
