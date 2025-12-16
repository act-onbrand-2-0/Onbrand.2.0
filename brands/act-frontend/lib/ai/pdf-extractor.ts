/**
 * PDF Text and Image Extraction Utility
 * 
 * Extracts text content and images from PDF files for brand guidelines processing.
 * Supports both file paths and buffers.
 */

export interface ExtractedImage {
  data: Buffer;
  format: string; // 'png', 'jpeg', etc.
  width?: number;
  height?: number;
  pageNumber: number;
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  metadata: Record<string, unknown>;
}> {
  // Dynamic import to avoid issues with server/client
  const pdfParse = (await import('pdf-parse')).default;
  
  try {
    const data = await pdfParse(buffer);
    
    return {
      text: cleanExtractedText(data.text),
      pageCount: data.numpages,
      metadata: {
        info: data.info,
        version: data.version,
      },
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Extract text from a PDF URL (e.g., Supabase storage URL)
 */
export async function extractTextFromPdfUrl(url: string): Promise<{
  text: string;
  pageCount: number;
  metadata: Record<string, unknown>;
}> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return extractTextFromPdfBuffer(buffer);
  } catch (error) {
    console.error('PDF URL extraction error:', error);
    throw new Error(`Failed to extract text from PDF URL: ${error}`);
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Fix common PDF extraction issues
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // CamelCase splits
    .replace(/(\.)([A-Z])/g, '$1 $2')      // Missing space after period
    // Remove excessive newlines but keep paragraph structure
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}

/**
 * Split extracted text into logical sections
 * Useful for processing large brand books
 */
export function splitIntoSections(text: string): {
  section: string;
  content: string;
}[] {
  // Common section headers in brand guidelines
  const sectionPatterns = [
    /^(brand\s*values?)/im,
    /^(mission|vision)/im,
    /^(tone\s*(?:of\s*)?voice)/im,
    /^(voice\s*(?:and|&)\s*tone)/im,
    /^(personality)/im,
    /^(color(?:s)?|colour(?:s)?)/im,
    /^(typography|fonts?)/im,
    /^(logo(?:\s*usage)?)/im,
    /^(imagery|photography)/im,
    /^(do(?:')?s?\s*(?:and|&)\s*don(?:')?t(?:s)?)/im,
    /^(writing\s*(?:guidelines|style))/im,
    /^(messaging)/im,
    /^(tagline(?:s)?)/im,
  ];

  const sections: { section: string; content: string }[] = [];
  let currentSection = 'Introduction';
  let currentContent = '';

  const lines = text.split('\n');

  for (const line of lines) {
    let foundSection = false;

    for (const pattern of sectionPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Save previous section
        if (currentContent.trim()) {
          sections.push({
            section: currentSection,
            content: currentContent.trim(),
          });
        }
        // Start new section
        currentSection = match[1].trim();
        currentContent = '';
        foundSection = true;
        break;
      }
    }

    if (!foundSection) {
      currentContent += line + '\n';
    }
  }

  // Add final section
  if (currentContent.trim()) {
    sections.push({
      section: currentSection,
      content: currentContent.trim(),
    });
  }

  return sections;
}

/**
 * Estimate token count for text (rough approximation)
 * Useful for chunking before sending to AI
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Chunk text to fit within token limits
 */
export function chunkTextForAI(
  text: string,
  maxTokens: number = 8000
): string[] {
  const chunks: string[] = [];
  const maxChars = maxTokens * 4; // Rough conversion
  
  if (text.length <= maxChars) {
    return [text];
  }

  // Try to split on paragraph boundaries
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If single paragraph is too long, force split
      if (para.length > maxChars) {
        const words = para.split(' ');
        currentChunk = '';
        for (const word of words) {
          if ((currentChunk + ' ' + word).length > maxChars) {
            chunks.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk += ' ' + word;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += '\n\n' + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract images from a PDF buffer
 * NOTE: This is a placeholder for future implementation.
 * PDF image extraction is complex and better handled by:
 * 1. Manual logo uploads by users
 * 2. AI vision models (Claude Vision, GPT-4V) analyzing PDF pages
 * 
 * See LOGO_EXTRACTION_TODO.md for implementation plan
 */
export async function extractImagesFromPdfBuffer(buffer: Buffer): Promise<ExtractedImage[]> {
  // TODO: Implement reliable image extraction
  // For now, return empty array and rely on manual uploads
  console.log('Image extraction from PDF not yet implemented. Use manual logo upload.');
  return [];
}
