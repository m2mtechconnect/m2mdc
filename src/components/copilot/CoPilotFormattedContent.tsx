/**
 * Co-Pilot Formatted Content
 * 
 * Renders Co-Pilot responses as structured, scannable sections
 * with icons, bullet points, and clear visual hierarchy.
 */

import { AlertTriangle, Puzzle, CheckCircle2, Lightbulb, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  FormattedCopilotContent, 
  FormattedSection, 
  FormattedItem,
  formatCopilotContent,
  shouldUseStructuredFormat 
} from '@/lib/copilot/formatCopilotContent';

interface CoPilotFormattedContentProps {
  content: string;
  context?: {
    industry?: string;
    agentName?: string;
  };
  className?: string;
}

const SECTION_ICONS: Record<FormattedSection['type'], React.ReactNode> = {
  risks: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  gaps: <Puzzle className="h-4 w-4 text-orange-500" />,
  'next-steps': <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  insights: <Lightbulb className="h-4 w-4 text-blue-500" />,
  general: <Info className="h-4 w-4 text-muted-foreground" />,
};

const SECTION_COLORS: Record<FormattedSection['type'], string> = {
  risks: 'border-l-amber-500/50 bg-amber-500/5',
  gaps: 'border-l-orange-500/50 bg-orange-500/5',
  'next-steps': 'border-l-emerald-500/50 bg-emerald-500/5',
  insights: 'border-l-blue-500/50 bg-blue-500/5',
  general: 'border-l-muted-foreground/50 bg-muted/30',
};

function SectionHeader({ section }: { section: FormattedSection }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {SECTION_ICONS[section.type]}
      <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
      <span className="text-xs text-muted-foreground">({section.items.length})</span>
    </div>
  );
}

function ItemContent({ item, isOrdered }: { item: FormattedItem; isOrdered?: boolean }) {
  return (
    <li className="text-sm leading-relaxed">
      {item.title ? (
        <>
          <span className="font-medium text-foreground">{item.title}</span>
          {item.content && (
            <span className="text-muted-foreground"> – {item.content}</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">{item.content}</span>
      )}
    </li>
  );
}

function Section({ section }: { section: FormattedSection }) {
  const isOrdered = section.type === 'next-steps' || section.items.some(i => i.isNumbered);
  const ListTag = isOrdered ? 'ol' : 'ul';
  
  return (
    <div 
      className={cn(
        'rounded-lg border-l-4 p-4',
        SECTION_COLORS[section.type]
      )}
    >
      <SectionHeader section={section} />
      <ListTag 
        className={cn(
          'space-y-2 ml-1',
          isOrdered ? 'list-decimal list-inside' : 'list-disc list-inside'
        )}
      >
        {section.items.map((item, idx) => (
          <ItemContent key={idx} item={item} isOrdered={isOrdered} />
        ))}
      </ListTag>
    </div>
  );
}

function FallbackContent({ content }: { content: string }) {
  // Split into paragraphs and render with proper spacing
  const paragraphs = content.split(/\n\n+/);
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, idx) => {
        // Check if paragraph is a bullet list
        const lines = paragraph.split('\n');
        const isBulletList = lines.every(line => /^[*\-•]\s/.test(line.trim()) || line.trim() === '');
        
        if (isBulletList && lines.length > 1) {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {lines
                .filter(line => line.trim())
                .map((line, lineIdx) => (
                  <li key={lineIdx}>{line.replace(/^[*\-•]\s*/, '')}</li>
                ))}
            </ul>
          );
        }
        
        return (
          <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}

export function CoPilotFormattedContent({ content, context, className }: CoPilotFormattedContentProps) {
  // Check if we should use structured format
  if (!shouldUseStructuredFormat(content)) {
    return (
      <div className={cn('space-y-3', className)}>
        <FallbackContent content={content} />
      </div>
    );
  }
  
  const formatted = formatCopilotContent(content, context);
  
  // If no sections extracted, use fallback
  if (formatted.sections.length === 0 && formatted.fallbackContent) {
    return (
      <div className={cn('space-y-3', className)}>
        <FallbackContent content={formatted.fallbackContent} />
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Context Header */}
      {formatted.header && (
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <span className="text-xs font-medium text-primary">{formatted.header}</span>
        </div>
      )}
      
      {/* Structured Sections */}
      {formatted.sections.map((section, idx) => (
        <Section key={`${section.type}-${idx}`} section={section} />
      ))}
      
      {/* Fallback for any remaining content */}
      {formatted.fallbackContent && (
        <FallbackContent content={formatted.fallbackContent} />
      )}
    </div>
  );
}
