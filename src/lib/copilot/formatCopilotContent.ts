/**
 * Co-Pilot Content Formatter
 * 
 * Parses raw Co-Pilot text into structured sections for easy scanning.
 * Detects patterns like "**Key Risks:**", numbered lists, and bullet points.
 */

export interface FormattedSection {
  type: 'risks' | 'gaps' | 'next-steps' | 'insights' | 'general';
  title: string;
  icon: string;
  items: FormattedItem[];
}

export interface FormattedItem {
  title?: string;
  content: string;
  isNumbered?: boolean;
  number?: number;
}

export interface FormattedCopilotContent {
  header?: string;
  sections: FormattedSection[];
  fallbackContent?: string;
}

// Section detection patterns
const SECTION_PATTERNS = {
  risks: /\*\*(?:Key\s+)?Risks?:?\*\*|(?:^|\n)(?:Key\s+)?Risks?:/i,
  gaps: /\*\*(?:Missing\s+)?Configurations?\s*(?:Detected)?:?\*\*|\*\*Configuration\s+Gaps?:?\*\*|(?:^|\n)(?:Missing\s+)?Configurations?(?:\s+Detected)?:/i,
  nextSteps: /\*\*(?:Recommended\s+)?Next\s+Steps?:?\*\*|(?:^|\n)(?:Recommended\s+)?Next\s+Steps?:/i,
  insights: /\*\*(?:Key\s+)?Insights?:?\*\*|(?:^|\n)(?:Key\s+)?Insights?:/i,
};

const SECTION_CONFIG: Record<string, { title: string; icon: string; type: FormattedSection['type'] }> = {
  risks: { title: 'Key Risks', icon: '⚠️', type: 'risks' },
  gaps: { title: 'Configuration Gaps', icon: '🧩', type: 'gaps' },
  nextSteps: { title: 'Recommended Next Steps', icon: '✅', type: 'next-steps' },
  insights: { title: 'Key Insights', icon: '💡', type: 'insights' },
};

/**
 * Parse a numbered/bullet item with optional bold title
 * E.g., "1. **Data Integrity:** explanation here..." → { title: "Data Integrity", content: "explanation here..." }
 */
function parseItem(text: string, index?: number): FormattedItem {
  const trimmed = text.trim();
  
  // Check for "**Bold Title:** content" pattern
  const boldTitleMatch = trimmed.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/s);
  if (boldTitleMatch) {
    return {
      title: boldTitleMatch[1].trim(),
      content: truncateContent(boldTitleMatch[2].trim()),
      isNumbered: index !== undefined,
      number: index,
    };
  }
  
  // Check for numbered prefix "1. **Title** content" or "1. content"
  const numberedMatch = trimmed.match(/^(\d+)\.\s*(?:\*\*([^*]+)\*\*:?\s*)?(.*)$/s);
  if (numberedMatch) {
    return {
      title: numberedMatch[2]?.trim(),
      content: truncateContent(numberedMatch[3].trim()),
      isNumbered: true,
      number: parseInt(numberedMatch[1]),
    };
  }
  
  // Check for bullet prefix "* content" or "- content"
  const bulletMatch = trimmed.match(/^[*\-•]\s*(?:\*\*([^*]+)\*\*:?\s*)?(.*)$/s);
  if (bulletMatch) {
    return {
      title: bulletMatch[1]?.trim(),
      content: truncateContent(bulletMatch[2].trim()),
    };
  }
  
  return {
    content: truncateContent(trimmed),
    isNumbered: index !== undefined,
    number: index,
  };
}

/**
 * Truncate content to ~25 words for conciseness
 */
function truncateContent(text: string, maxWords: number = 25): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

/**
 * Extract items from a section text block
 */
function extractItems(sectionText: string): FormattedItem[] {
  const items: FormattedItem[] = [];
  
  // Split by numbered items (1. 2. 3.) or bullets (* -)
  const parts = sectionText.split(/(?=\d+\.\s|\n[*\-•]\s)/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.length < 5) continue;
    
    // Skip section headers
    if (/^\*\*(?:Key\s+)?(?:Risks?|Configurations?|Next\s+Steps?|Insights?):?\*\*$/i.test(trimmed)) {
      continue;
    }
    
    items.push(parseItem(trimmed));
  }
  
  return items;
}

/**
 * Main formatter function - converts raw text to structured sections
 */
export function formatCopilotContent(rawText: string, context?: { industry?: string; agentName?: string }): FormattedCopilotContent {
  if (!rawText || rawText.trim().length === 0) {
    return { sections: [] };
  }

  const result: FormattedCopilotContent = {
    sections: [],
  };
  
  // Generate context-aware header if available
  if (context?.agentName || context?.industry) {
    const parts = [context.agentName, context.industry].filter(Boolean);
    if (parts.length > 0) {
      result.header = `${parts.join(' – ')} – Analysis`;
    }
  }

  // Check if content matches our structured patterns
  const hasStructuredContent = Object.values(SECTION_PATTERNS).some(pattern => pattern.test(rawText));
  
  if (!hasStructuredContent) {
    // Fallback: try to detect numbered lists anyway
    const numberedItems = rawText.match(/\d+\.\s*\*\*[^*]+\*\*/g);
    if (numberedItems && numberedItems.length >= 2) {
      // Has numbered items with bold titles - treat as general insights
      const items = extractItems(rawText);
      if (items.length > 0) {
        result.sections.push({
          type: 'insights',
          title: 'Key Points',
          icon: '💡',
          items,
        });
        return result;
      }
    }
    
    // Pure fallback - format as readable paragraphs
    result.fallbackContent = formatFallbackContent(rawText);
    return result;
  }

  // Find section boundaries
  const sectionBoundaries: Array<{ key: string; start: number; end?: number }> = [];
  
  for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
    const match = rawText.match(pattern);
    if (match && match.index !== undefined) {
      sectionBoundaries.push({
        key,
        start: match.index,
      });
    }
  }
  
  // Sort by position and set end boundaries
  sectionBoundaries.sort((a, b) => a.start - b.start);
  for (let i = 0; i < sectionBoundaries.length; i++) {
    sectionBoundaries[i].end = sectionBoundaries[i + 1]?.start ?? rawText.length;
  }

  // Extract sections
  for (const boundary of sectionBoundaries) {
    const config = SECTION_CONFIG[boundary.key];
    if (!config) continue;
    
    const sectionText = rawText.slice(boundary.start, boundary.end);
    const items = extractItems(sectionText);
    
    if (items.length > 0) {
      result.sections.push({
        type: config.type,
        title: config.title,
        icon: config.icon,
        items,
      });
    }
  }

  // If we detected patterns but extracted no items, use fallback
  if (result.sections.length === 0) {
    result.fallbackContent = formatFallbackContent(rawText);
  }

  return result;
}

/**
 * Format fallback content with better paragraph/bullet handling
 */
function formatFallbackContent(text: string): string {
  // Clean up markdown bold markers for display
  let cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove ** markers
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
  
  // Split into paragraphs and limit each
  const paragraphs = cleaned.split(/\n\n+/);
  return paragraphs
    .map(p => {
      const words = p.split(/\s+/);
      if (words.length > 50) {
        return words.slice(0, 50).join(' ') + '…';
      }
      return p;
    })
    .join('\n\n');
}

/**
 * Check if content should use structured rendering
 */
export function shouldUseStructuredFormat(rawText: string): boolean {
  if (!rawText) return false;
  
  // Check for section headers
  const hasHeaders = Object.values(SECTION_PATTERNS).some(p => p.test(rawText));
  
  // Check for numbered items with bold titles
  const hasNumberedBold = /\d+\.\s*\*\*[^*]+\*\*/.test(rawText);
  
  return hasHeaders || hasNumberedBold;
}
