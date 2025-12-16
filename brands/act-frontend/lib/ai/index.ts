/**
 * Brand AI Module
 * 
 * This module provides AI-powered brand management capabilities:
 * 
 * 1. EXTRACTION: Extract structured guidelines from PDF brand books
 * 2. CHECKING: Validate content against brand guidelines  
 * 3. GENERATION: Create on-brand content
 * 
 * Multi-tenant Architecture:
 * - Each brand (act, globex, etc.) has its own guidelines in the database
 * - Guidelines are stored per brand_id in the brand_guidelines table
 * - The AI agent dynamically loads guidelines for the requested brand
 * 
 * Flow:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Upload PDF → Extract → Review/Approve → Check/Generate    │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * API Endpoints:
 * - POST /api/brands/[brandId]/guidelines/upload - Upload PDF
 * - GET  /api/brands/[brandId]/guidelines/approve - Review extraction
 * - POST /api/brands/[brandId]/guidelines/approve - Approve guidelines
 * - GET  /api/brands/[brandId]/guidelines - Get approved guidelines
 * - POST /api/ai/agent - Check or generate content
 */

// Core agent functions
export { 
  extractGuidelines,
  checkBrandCompliance,
  generateOnBrandContent,
  buildBrandSystemPrompt,
} from './agent';

// Database operations
export {
  getBrandGuidelines,
  saveGuidelinesAsDraft,
  approveGuidelines,
  logBrandCheck,
} from './guidelines-db';

// PDF extraction utilities
export {
  extractTextFromPdfBuffer,
  extractTextFromPdfUrl,
  splitIntoSections,
  chunkTextForAI,
  estimateTokenCount,
} from './pdf-extractor';

// Types
export type {
  BrandGuidelines,
  BrandVoice,
  CopyGuidelines,
  VisualGuidelines,
  MessagingGuidelines,
  BrandCheckResult,
  BrandIssue,
  CheckType,
  GuidelinesExtraction,
} from './types';
