/**
 * Text extraction helper for document analysis
 * Supports: PDF, Office (Word/Excel/PowerPoint), Text, HTML, CSV
 */

import { extractFromExcel, extractFromDocx, extractFromPptx } from "./officeParser.ts";

const MAX_TEXT_LENGTH = 50000; // 50k characters max (prevents memory issues)

export interface ExtractionResult {
  text: string;
  charCount: number;
  charCountTotal?: number;
  truncated?: boolean;
  metadata?: {
    fileType?: string;
    pageCount?: number;
    title?: string | null;
  };
}

/**
 * Extract text from base64 file content
 */
export async function extractTextFromDocument(
  fileContent: string,
  fileName: string,
  contentType?: string
): Promise<ExtractionResult> {
  try {
    // Decode base64 using Deno's built-in decoder
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file type
    const fileType = contentType || inferFileType(fileName);
    
    // Extract text based on type
    let text = "";
    
    // Handle Office formats with specialized parsers
    if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls") ||
        fileType.includes("spreadsheetml.sheet") || fileType.includes("vnd.ms-excel")) {
      // Excel
      text = await extractFromExcel(bytes);
    } else if (fileName.toLowerCase().endsWith(".docx") || 
               fileType.includes("wordprocessingml.document")) {
      // Word
      text = await extractFromDocx(bytes);
    } else if (fileName.toLowerCase().endsWith(".pptx") ||
               fileType.includes("presentationml.presentation")) {
      // PowerPoint
      text = await extractFromPptx(bytes);
    } else if (fileType.includes("text/plain") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      // Plain text - decode as UTF-8
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(bytes);
    } else if (fileType.includes("text/html") || fileName.endsWith(".html")) {
      // HTML - decode and strip tags
      const decoder = new TextDecoder('utf-8');
      const html = decoder.decode(bytes);
      text = stripHtmlTags(html);
    } else if (fileType.includes("application/pdf") || fileName.endsWith(".pdf")) {
      // PDF - try basic text extraction from binary
      const decoder = new TextDecoder('latin1'); // PDFs often use latin1
      const pdfContent = decoder.decode(bytes);
      text = extractTextFromPdf(pdfContent);
    } else {
      // Try to decode as text for other formats
      try {
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(bytes);
      } catch {
        // If UTF-8 fails, try latin1
        const decoder = new TextDecoder('latin1');
        text = decoder.decode(bytes);
      }
    }

    // Clean and normalize
    text = cleanText(text);

    const charCountTotal = text.length;
    let truncated = false;

    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH);
      truncated = true;
    }

    // Estimate page count
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));

    return {
      text,
      charCount: text.length,
      charCountTotal,
      truncated,
      metadata: {
        fileType,
        pageCount,
        title: fileName,
      },
    };
  } catch (error) {
    console.error("Error extracting text:", error);
    
    // Return empty result on error
    return {
      text: "",
      charCount: 0,
      metadata: {
        fileType: contentType || "unknown",
        title: fileName,
      },
    };
  }
}

function inferFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  const typeMap: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/plain",
    html: "text/html",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
  };
  return typeMap[ext || ""] || "application/octet-stream";
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTextFromPdf(content: string): string {
  // Extract readable text from PDF binary content
  // Look for text patterns and filter out PDF control sequences
  
  // Remove PDF headers and binary markers
  let cleaned = content
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ') // Remove control chars except \t \n \r
    .replace(/\\[0-9]{3}/g, ' ') // Remove octal sequences
    .replace(/\/[A-Z][a-z]+/g, ' ') // Remove PDF commands
    .replace(/<<.*?>>/g, ' ') // Remove PDF dictionaries
    .replace(/\[.*?\]/g, ' ') // Remove arrays
    .replace(/%.*?\n/g, ' '); // Remove comments
  
  // Extract words (sequences of readable characters)
  const words = cleaned.match(/[a-zA-Z0-9][a-zA-Z0-9\s.,;:!?'"()$%\-]{2,}/g);
  
  if (words && words.length > 10) {
    return words.join(' ');
  }
  
  // Fallback: just clean up what we have
  return cleaned
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .trim();
}
