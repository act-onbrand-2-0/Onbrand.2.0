/**
 * AI Vision-based Logo and Image Extraction from PDFs
 * 
 * Uses Claude Vision to analyze PDF pages and extract logos/images
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface ExtractedLogo {
  description: string;
  location: string; // e.g., "top-left", "center", "header"
  pageNumber: number;
  isMainLogo: boolean;
  colorScheme?: string; // e.g., "full-color", "monochrome", "white"
  base64Image?: string; // Base64 encoded image data
}

/**
 * Convert PDF page to image for vision analysis
 * Uses pdf-lib and canvas to render PDF pages as images
 */
async function convertPdfPageToImage(
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { createCanvas } = await import('canvas');
    
    // Convert Buffer to Uint8Array for pdfjs-dist
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    // Get specific page
    const page = await pdf.getPage(pageNumber);
    
    // Set up canvas with appropriate scale
    const scale = 2.0; // Higher scale for better quality
    const viewport = page.getViewport({ scale });
    
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context as any,
      viewport: viewport,
      canvas: canvas as any,
    }).promise;
    
    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/png');
    // Remove data:image/png;base64, prefix
    return imageData.split(',')[1];
  } catch (error) {
    console.error(`Failed to convert PDF page ${pageNumber} to image:`, error);
    throw error;
  }
}

/**
 * Analyze a PDF page image using Claude Vision to extract logos
 */
async function analyzePageForLogos(
  base64Image: string,
  pageNumber: number
): Promise<ExtractedLogo[]> {
  try {
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: z.object({
        logos: z.array(z.object({
          description: z.string().describe('Detailed description of the logo'),
          location: z.string().describe('Location on the page: top-left, top-right, center, bottom, header, footer'),
          isMainLogo: z.boolean().describe('Is this the primary/main brand logo?'),
          colorScheme: z.string().optional().describe('Color scheme: full-color, monochrome, white, black, etc.'),
          confidence: z.number().describe('Confidence score 0-1'),
        })),
        hasLogos: z.boolean().describe('Does this page contain any logos?'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this brand guidelines document page and identify all logos present.

For each logo found, provide:
1. A detailed description (colors, style, elements)
2. Its location on the page
3. Whether it's the main/primary logo
4. The color scheme/version

Focus on actual logo images, not just mentions of logos in text.
Be thorough but only report actual visual logos you can see.`,
            },
            {
              type: 'image',
              image: base64Image,
            },
          ],
        },
      ],
    });

    return result.object.logos.map(logo => ({
      ...logo,
      pageNumber,
      base64Image: undefined, // Don't store the full page image
    }));
  } catch (error) {
    console.error(`Failed to analyze page ${pageNumber} for logos:`, error);
    return [];
  }
}

/**
 * Extract logos from a PDF using Claude Vision
 * Analyzes the first N pages to find logos
 */
export async function extractLogosFromPdfWithVision(
  pdfBuffer: Buffer,
  maxPagesToAnalyze: number = 10
): Promise<ExtractedLogo[]> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Convert Buffer to Uint8Array for pdfjs-dist
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Load PDF to get page count
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, maxPagesToAnalyze);
    
    console.log(`Analyzing ${pageCount} pages for logos using Claude Vision...`);
    
    const allLogos: ExtractedLogo[] = [];
    
    // Analyze pages sequentially to avoid rate limits
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        console.log(`Analyzing page ${pageNum}/${pageCount}...`);
        
        // Convert page to image
        const base64Image = await convertPdfPageToImage(pdfBuffer, pageNum);
        
        // Analyze with Claude Vision
        const logos = await analyzePageForLogos(base64Image, pageNum);
        
        if (logos.length > 0) {
          console.log(`Found ${logos.length} logo(s) on page ${pageNum}`);
          allLogos.push(...logos);
        }
        
        // Add small delay to avoid rate limits
        if (pageNum < pageCount) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Failed to analyze page ${pageNum}:`, error);
        // Continue with other pages
      }
    }
    
    console.log(`Total logos found: ${allLogos.length}`);
    return allLogos;
  } catch (error) {
    console.error('Failed to extract logos from PDF:', error);
    throw error;
  }
}

/**
 * Extract the main logo image from a specific page
 * Returns base64 encoded image of just the logo area
 */
export async function extractLogoImage(
  pdfBuffer: Buffer,
  pageNumber: number,
  location: string
): Promise<string | null> {
  try {
    // Convert page to image
    const base64Image = await convertPdfPageToImage(pdfBuffer, pageNumber);
    
    // Use Claude Vision to crop/extract just the logo
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: z.object({
        logoFound: z.boolean(),
        instructions: z.string().describe('Instructions for cropping the logo from the image'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Identify the logo at location "${location}" on this page and provide precise cropping coordinates (x, y, width, height as percentages of the page).`,
            },
            {
              type: 'image',
              image: base64Image,
            },
          ],
        },
      ],
    });
    
    if (!result.object.logoFound) {
      return null;
    }
    
    // TODO: Implement actual image cropping based on coordinates
    // For now, return the full page image
    return base64Image;
  } catch (error) {
    console.error('Failed to extract logo image:', error);
    return null;
  }
}
