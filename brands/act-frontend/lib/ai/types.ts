/**
 * Brand Guidelines Types
 * 
 * These types define the structured format for brand configuration
 * extracted from brand documents and used by AI agents.
 */

// Voice & Personality
export interface BrandVoice {
  personality: string[];           // e.g., ["confident", "approachable", "innovative"]
  tone: string;                    // e.g., "professional yet friendly"
  writeAs: string;                 // e.g., "Write as a trusted advisor, not a salesperson"
  audienceLevel: string;           // e.g., "professionals who value clarity"
}

// Copy Guidelines
export interface CopyRule {
  rule: string;
  example?: string;
  why?: string;
}

export interface CopyDont {
  rule: string;
  badExample: string;
  goodExample: string;
}

export interface WordChoice {
  avoid: string;
  prefer: string;
}

export interface CopyGuidelines {
  dos: CopyRule[];
  donts: CopyDont[];
  wordChoices: WordChoice[];
  phrases: {
    required: string[];
    banned: string[];
  };
}

// Visual Guidelines
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutrals: string[];
  usage: string;
}

export interface Typography {
  headings: {
    family: string;
    weights: string[];
  };
  body: {
    family: string;
    weights: string[];
  };
  usage: string;
}

export interface ImageryGuidelines {
  style: string;
  photographyStyle?: string;
  illustrationStyle?: string;
  iconStyle?: string;
  patterns?: string;
  avoid: string[];
  prefer: string[];
}

export interface LogoGuidelines {
  clearSpace: string;
  minSize: string;
  donts: string[];
}

export interface SpacingGuidelines {
  gridSystem?: string;           // e.g., "8px base grid"
  margins?: string;              // e.g., "24px page margins"
  padding?: string;              // e.g., "16px component padding"
  verticalRhythm?: string;       // e.g., "24px line height base"
  componentSpacing?: string;     // e.g., "32px between sections"
}

export interface LayoutGuidelines {
  principles?: string[];
  maxWidth?: string;             // e.g., "1200px"
  columns?: string;              // e.g., "12-column grid"
  breakpoints?: string[];        // e.g., ["768px tablet", "1024px desktop"]
}

export interface VisualGuidelines {
  colors: ColorPalette;
  typography: Typography;
  imagery: ImageryGuidelines;
  logo: LogoGuidelines;
  spacing?: SpacingGuidelines;
  layout?: LayoutGuidelines;
}

// Messaging
export interface MessagingGuidelines {
  pillars: string[];
  valueProposition: string;
  tagline: string;
  boilerplate: string;
}

// Content & Media Guidelines
export interface ContentGuidelines {
  contentTypes?: string[];           // e.g., ["blog posts", "whitepapers", "case studies"]
  contentPillars?: string[];         // Main content themes
  editorialGuidelines?: string[];    // Editorial standards
  seoGuidelines?: string[];          // SEO best practices
  accessibility?: string[];          // Accessibility requirements
  videoGuidelines?: {
    style?: string;
    length?: string;
    format?: string;
    captioning?: string;
  };
  audioGuidelines?: {
    style?: string;
    tone?: string;
    musicStyle?: string;
  };
}

// Social Media Best Practices
export interface SocialMediaGuidelines {
  platforms?: {
    name: string;                    // e.g., "LinkedIn", "Twitter", "Instagram"
    tone?: string;                   // Platform-specific tone
    postingFrequency?: string;       // e.g., "3-5 times per week"
    bestTimes?: string[];            // Best posting times
    contentTypes?: string[];         // e.g., ["thought leadership", "company news"]
    hashtagGuidelines?: string;
    characterLimits?: string;
    imageSpecs?: string;
  }[];
  generalRules?: string[];           // Cross-platform rules
  engagement?: {
    responseTime?: string;
    tone?: string;
    escalationGuidelines?: string[];
  };
  contentCalendar?: {
    themes?: string[];
    campaigns?: string[];
  };
}

// Logo Assets
export interface LogoAssets {
  primaryLogo?: {
    url?: string;                    // URL to logo file
    description?: string;
    formats?: string[];              // e.g., ["SVG", "PNG", "EPS"]
    colorVersions?: string[];        // e.g., ["full-color", "monochrome", "white"]
    minSize?: string;
    clearSpace?: string;
    imageUrl?: string; // Uploaded logo image URL
  };
  alternativeLogos?: Array<{
    name?: string;
    description?: string;
    usage?: string;
    imageUrl?: string; // Uploaded alternative logo URL
  }>;
  downloadLinks?: Array<{
    format?: string;
    url?: string;
  }>;
  usageGuidelines?: string[];
  restrictions?: string[];
  // Extracted images from PDF (stored as Supabase Storage URLs)
  extractedImages?: Array<{
    url: string;
    pageNumber: number;
    width?: number;
    height?: number;
    description?: string;
    isMainLogo?: boolean;
  }>;
}

// Complete Brand Guidelines
export interface BrandGuidelines {
  id: string;
  brandId: string;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
  sourceDocumentId?: string;
  
  voice: BrandVoice;
  copyGuidelines: CopyGuidelines;
  visualGuidelines: VisualGuidelines;
  messaging: MessagingGuidelines;
  contentGuidelines?: ContentGuidelines;
  socialMediaGuidelines?: SocialMediaGuidelines;
  logoAssets?: LogoAssets;
  
  rawExtraction?: unknown;
  extractedAt?: string;
  approvedAt?: string;
}

// Brand Check Types
export type CheckType = 'copy' | 'image' | 'color' | 'logo' | 'full';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface BrandIssue {
  severity: IssueSeverity;
  rule: string;
  found: string;
  suggestion: string;
  location?: string;  // Where in the content the issue was found
}

export interface BrandCheckResult {
  checkType: CheckType;
  score: number;           // 0-100
  isCompliant: boolean;    // score >= 80 typically
  issues: BrandIssue[];
  suggestions: string[];
  summary: string;
}

// Extraction types
export interface ExtractionSuggestion {
  field: string;
  value: unknown;
  confidence: number;      // 0-1
  source: string;          // Quote from document
}

export interface GuidelinesExtraction {
  voice: Partial<BrandVoice>;
  copyGuidelines: Partial<CopyGuidelines>;
  visualGuidelines: Partial<VisualGuidelines>;
  messaging: Partial<MessagingGuidelines>;
  contentGuidelines?: Partial<ContentGuidelines>;
  socialMediaGuidelines?: Partial<SocialMediaGuidelines>;
  logoAssets?: Partial<LogoAssets>;
  suggestions: ExtractionSuggestion[];
  confidence: number;
}
