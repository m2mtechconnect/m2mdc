/**
 * Office document parser (Excel, Word, PowerPoint)
 * Uses ESM packages for parsing
 */

import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.1";

/**
 * Extract text from Excel file (.xlsx, .xls)
 */
export async function extractFromExcel(bytes: Uint8Array): Promise<string> {
  try {
    const workbook = XLSX.read(bytes, { type: 'array' });
    const allText: string[] = [];

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      
      // Convert sheet to CSV format for text extraction
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv) {
        allText.push(`--- Sheet: ${sheetName} ---`);
        allText.push(csv);
      }
    }

    return allText.join('\n\n');
  } catch (error) {
    console.error("Excel extraction error:", error);
    throw new Error("Failed to parse Excel file");
  }
}

/**
 * Extract text from Word document (.docx)
 * Reads the document.xml from the DOCX zip structure
 */
export async function extractFromDocx(bytes: Uint8Array): Promise<string> {
  try {
    // DOCX is a zip file - extract it
    const unzipped = unzipSync(bytes);
    
    // Read document.xml which contains the main content
    const docXmlBytes = unzipped["word/document.xml"];
    if (!docXmlBytes) {
      throw new Error("Invalid DOCX structure");
    }
    
    const docXml = strFromU8(docXmlBytes);
    
    // Extract text from XML (removing tags)
    const text = docXml
      .replace(/<w:t[^>]*>/g, '')
      .replace(/<\/w:t>/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error("Word extraction error:", error);
    
    // Fallback: try simple text extraction
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);
    const words = text.match(/[a-zA-Z0-9][a-zA-Z0-9\s.,;:!?'"()$%-]{2,}/g);
    
    if (words && words.length > 10) {
      return words.join(' ');
    }
    
    throw new Error("Failed to parse Word document");
  }
}

/**
 * Extract text from PowerPoint (.pptx)
 * Reads slide XML files from the PPTX zip structure
 */
export async function extractFromPptx(bytes: Uint8Array): Promise<string> {
  try {
    // PPTX is a zip file - extract it
    const unzipped = unzipSync(bytes);
    const allText: string[] = [];
    
    // Find all slide files
    const slideFiles = Object.keys(unzipped)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort();
    
    for (const slidePath of slideFiles) {
      const slideBytes = unzipped[slidePath];
      if (slideBytes) {
        const slideXml = strFromU8(slideBytes);
        
        // Extract text from slide XML
        const text = slideXml
          .replace(/<a:t[^>]*>/g, '')
          .replace(/<\/a:t>/g, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (text) {
          allText.push(`--- Slide ${slideFiles.indexOf(slidePath) + 1} ---`);
          allText.push(text);
        }
      }
    }
    
    return allText.join('\n\n');
  } catch (error) {
    console.error("PowerPoint extraction error:", error);
    
    // Fallback: try simple text extraction
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);
    const words = text.match(/[a-zA-Z0-9][a-zA-Z0-9\s.,;:!?'"()$%-]{2,}/g);
    
    if (words && words.length > 10) {
      return words.join(' ');
    }
    
    throw new Error("Failed to parse PowerPoint presentation");
  }
}
