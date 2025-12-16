import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Model configuration - switch between providers
const AI_MODELS = {
  gemini: google('gemini-2.0-flash-exp'),
  gpt4o: openai('gpt-4o'),
  gpt4oMini: openai('gpt-4o-mini'),
  gpt5: openai('gpt-5'),
  gpt5Mini: openai('gpt-5-mini'),
  claude: anthropic('claude-sonnet-4-5-20250929'),
  claude35: anthropic('claude-3-5-sonnet-20241022'),
  claudeOpus: anthropic('claude-3-opus-20240229'),
  claudeHaiku: anthropic('claude-3-5-haiku-20241022'),
} as const;

// Get model from environment or use default
function getDefaultModel(): keyof typeof AI_MODELS {
  const envModel = process.env.AI_MODEL as keyof typeof AI_MODELS;
  if (envModel && envModel in AI_MODELS) {
    return envModel;
  }
  return 'gemini';
}
import type { 
  BrandGuidelines, 
  BrandCheckResult, 
  GuidelinesExtraction,
  CheckType,
  BrandIssue 
} from './types';

/**
 * Build a dynamic system prompt from brand guidelines
 */
export function buildBrandSystemPrompt(guidelines: BrandGuidelines): string {
  const { voice, copyGuidelines, visualGuidelines, messaging } = guidelines;
  
  return `
You are the brand guardian for this organization. Your role is to ensure all content 
aligns with the established brand guidelines.

## Voice & Personality
Personality traits: ${voice.personality?.join(', ') || 'Not specified'}
Tone: ${voice.tone || 'Not specified'}
Writing style: ${voice.writeAs || 'Not specified'}
Target audience: ${voice.audienceLevel || 'Not specified'}

## Copy Rules - DO:
${copyGuidelines.dos?.map(d => `• ${d.rule}${d.example ? ` (e.g., "${d.example}")` : ''}`).join('\n') || 'None specified'}

## Copy Rules - DON'T:
${copyGuidelines.donts?.map(d => `• ${d.rule}\n  ❌ "${d.badExample}" → ✅ "${d.goodExample}"`).join('\n') || 'None specified'}

## Word Choices:
${copyGuidelines.wordChoices?.map(w => `• Say "${w.prefer}" not "${w.avoid}"`).join('\n') || 'None specified'}

## Required Phrases:
${copyGuidelines.phrases?.required?.join(', ') || 'None'}

## Banned Phrases:
${copyGuidelines.phrases?.banned?.join(', ') || 'None'}

## Visual Style:
${visualGuidelines.imagery?.style || 'Not specified'}
Avoid: ${visualGuidelines.imagery?.avoid?.join(', ') || 'None'}
Prefer: ${visualGuidelines.imagery?.prefer?.join(', ') || 'None'}

## Messaging Pillars:
${messaging.pillars?.join(', ') || 'Not specified'}

## Value Proposition:
${messaging.valueProposition || 'Not specified'}
  `.trim();
}

/**
 * Extract structured guidelines from document content
 * Handles both small and large documents with chunked processing
 */
export async function extractGuidelines(
  documentContent: string,
  brandName: string,
  modelKey?: keyof typeof AI_MODELS
): Promise<GuidelinesExtraction> {
  const selectedModel = modelKey || getDefaultModel();
  // Estimate size - if large, use chunked extraction
  const estimatedTokens = Math.ceil(documentContent.length / 4);
  
  if (estimatedTokens > 10000) {
    console.log(`Large document detected (${estimatedTokens} est. tokens), using chunked extraction`);
    return extractGuidelinesChunked(documentContent, brandName, selectedModel);
  }
  
  return extractGuidelinesSingle(documentContent, brandName, selectedModel);
}

/**
 * Single-pass extraction for smaller documents
 */
async function extractGuidelinesSingle(
  documentContent: string,
  brandName: string,
  modelKey: keyof typeof AI_MODELS
): Promise<GuidelinesExtraction> {
  const model = AI_MODELS[modelKey];
  console.log(`Using model: ${modelKey} for extraction`);
  
  const result = await generateText({
    model: model as any,
    system: `You are an expert at analyzing brand guidelines documents and extracting structured data.

CRITICAL: ALL OUTPUT MUST BE IN ENGLISH. If the source document is in another language (Dutch, German, French, etc.), translate all extracted content to English.

Your task is to read the provided brand guidelines document and extract EVERYTHING including:

1. **Voice & Personality**
   - Brand personality traits (adjectives describing the brand)
   - Tone of voice (formal/informal, friendly/professional)
   - Writing style guidelines
   - Target audience description

2. **Copy Guidelines**
   - Do's (writing rules to follow)
   - Don'ts (things to avoid)
   - Word choices (preferred vs avoided terms)
   - Required phrases, taglines, slogans
   - Banned words or phrases
   - Grammar/punctuation preferences

3. **Visual Guidelines**
   - Colors: Extract COMPLETE hex codes (must be 6 characters like #FF5733), RGB values, CMYK values - primary, secondary, accent, neutrals. If hex code is incomplete, complete it.
   - Typography: Font families, weights, sizes for headings, body, captions
   - Imagery: Photography style, illustration style, icon style, patterns
   - Logo: Usage rules, clear space, minimum sizes, what NOT to do
   - Spacing: Grid system, margins, padding, component spacing
   - Layout: Column systems, max widths, breakpoints, responsive rules

4. **Messaging**
   - Brand pillars/values
   - Mission statement
   - Vision statement  
   - Value proposition
   - Taglines and slogans
   - Boilerplate text
   - Key messages

5. **Content & Media Guidelines**
   - Content types (blog posts, whitepapers, case studies, etc.)
   - Content pillars and themes
   - Editorial guidelines and standards
   - SEO best practices
   - Accessibility requirements
   - Video guidelines (style, length, format, captioning)
   - Audio guidelines (style, tone, music)

6. **Social Media Best Practices**
   - Platform-specific guidelines (LinkedIn, Twitter, Instagram, Facebook, TikTok, etc.)
   - Posting frequency and best times
   - Content types per platform
   - Hashtag guidelines
   - Character limits and image specs
   - Engagement and response guidelines
   - Content calendar themes

7. **Logo Assets & Files**
   - Logo file locations, descriptions, and formats
   - Color versions (full color, black, white, reversed)
   - Alternative logos and their use cases
   - Favicon specifications
   - Note: Extract any mentions of logo files, URLs, or image references

Be EXTREMELY thorough - extract ALL colors mentioned (not just primary), ALL fonts, ALL rules, ALL social media platforms, ALL content types.
Your confidence should be 1.0 (100%) when you successfully extract information.

IMPORTANT: Look for these sections even if labeled differently:
- "Huisstijl", "Kleuren", "Typografie" (Dutch)
- "Farbpalette", "Schriftarten" (German)
- Color swatches with hex codes like #XXXXXX
- Font specimens showing typeface names
- Tables, lists, and visual examples

Respond with valid JSON matching the GuidelinesExtraction schema.`,
    prompt: `
Analyze this brand guidelines document for "${brandName}" and extract structured guidelines:

---
${documentContent}
---

Return a JSON object with:
{
  "voice": { "personality": [], "tone": "", "writeAs": "", "audienceLevel": "" },
  "copyGuidelines": { 
    "dos": [{ "rule": "", "example": "", "why": "" }],
    "donts": [{ "rule": "", "badExample": "", "goodExample": "" }],
    "wordChoices": [{ "avoid": "", "prefer": "" }],
    "phrases": { "required": [], "banned": [] }
  },
  "visualGuidelines": {
    "colors": { "primary": "", "secondary": "", "accent": "", "neutrals": [], "usage": "" },
    "typography": { "headings": { "family": "", "weights": [] }, "body": { "family": "", "weights": [] }, "usage": "" },
    "imagery": { "style": "", "photographyStyle": "", "illustrationStyle": "", "iconStyle": "", "patterns": "", "avoid": [], "prefer": [] },
    "logo": { "clearSpace": "", "minSize": "", "donts": [] },
    "spacing": { "gridSystem": "", "margins": "", "padding": "", "verticalRhythm": "", "componentSpacing": "" },
    "layout": { "principles": [], "maxWidth": "", "columns": "", "breakpoints": [] }
  },
  "messaging": { "pillars": [], "valueProposition": "", "tagline": "", "boilerplate": "" },
  "contentGuidelines": {
    "contentTypes": [],
    "contentPillars": [],
    "editorialGuidelines": [],
    "seoGuidelines": [],
    "accessibility": [],
    "videoGuidelines": { "style": "", "length": "", "format": "", "captioning": "" },
    "audioGuidelines": { "style": "", "tone": "", "musicStyle": "" }
  },
  "socialMediaGuidelines": {
    "platforms": [{ "name": "", "tone": "", "postingFrequency": "", "bestTimes": [], "contentTypes": [], "hashtagGuidelines": "", "characterLimits": "", "imageSpecs": "" }],
    "generalRules": [],
    "engagement": { "responseTime": "", "tone": "", "escalationGuidelines": [] },
    "contentCalendar": { "themes": [], "campaigns": [] }
  },
  "logoAssets": {
    "primaryLogo": { "url": "", "description": "", "formats": [], "colorVersions": [] },
    "alternativeLogos": [{ "name": "", "url": "", "description": "", "useCase": "" }],
    "favicon": { "url": "", "sizes": [] }
  },
  "suggestions": [{ "field": "", "value": "", "confidence": 0.9, "source": "quote from doc" }],
  "confidence": 1
}`,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GuidelinesExtraction;
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to parse extraction:', error);
    return {
      voice: {},
      copyGuidelines: {},
      visualGuidelines: {},
      messaging: {},
      suggestions: [],
      confidence: 0,
    };
  }
}

/**
 * Chunked extraction for large documents
 * Processes document in focused passes for each guideline category
 */
async function extractGuidelinesChunked(
  documentContent: string,
  brandName: string,
  modelKey: keyof typeof AI_MODELS
): Promise<GuidelinesExtraction> {
  // Split into manageable chunks (roughly 8k tokens each)
  const chunkSize = 32000; // ~8k tokens
  const chunks: string[] = [];
  
  for (let i = 0; i < documentContent.length; i += chunkSize) {
    chunks.push(documentContent.slice(i, i + chunkSize));
  }
  
  console.log(`Processing ${chunks.length} chunks for ${brandName}`);

  // Process each category in parallel with focused prompts
  const [voiceResult, copyResult, visualResult, messagingResult, contentResult, socialResult, logoResult] = await Promise.all([
    extractCategory(chunks, brandName, 'voice', modelKey),
    extractCategory(chunks, brandName, 'copy', modelKey),
    extractCategory(chunks, brandName, 'visual', modelKey),
    extractCategory(chunks, brandName, 'messaging', modelKey),
    extractCategory(chunks, brandName, 'content', modelKey),
    extractCategory(chunks, brandName, 'social', modelKey),
    extractCategory(chunks, brandName, 'logo', modelKey),
  ]);

  // Merge results
  const merged: GuidelinesExtraction = {
    voice: voiceResult.voice || {},
    copyGuidelines: copyResult.copyGuidelines || {},
    visualGuidelines: visualResult.visualGuidelines || {},
    messaging: messagingResult.messaging || {},
    contentGuidelines: contentResult.contentGuidelines || {},
    socialMediaGuidelines: socialResult.socialMediaGuidelines || {},
    logoAssets: logoResult.logoAssets || {},
    suggestions: [
      ...(voiceResult.suggestions || []),
      ...(copyResult.suggestions || []),
      ...(visualResult.suggestions || []),
      ...(messagingResult.suggestions || []),
      ...(contentResult.suggestions || []),
      ...(socialResult.suggestions || []),
      ...(logoResult.suggestions || []),
    ],
    confidence: Math.min(
      voiceResult.confidence || 0,
      copyResult.confidence || 0,
      visualResult.confidence || 0,
      messagingResult.confidence || 0,
      contentResult.confidence || 0,
      socialResult.confidence || 0,
      logoResult.confidence || 0
    ),
  };

  return merged;
}

/**
 * Extract a specific category from document chunks
 */
async function extractCategory(
  chunks: string[],
  brandName: string,
  category: 'voice' | 'copy' | 'visual' | 'messaging' | 'content' | 'social' | 'logo',
  modelKey: keyof typeof AI_MODELS
): Promise<Partial<GuidelinesExtraction>> {
  const model = AI_MODELS[modelKey];
  const categoryPrompts = {
    voice: {
      focus: 'voice, tone, personality traits, audience description, and communication style. TRANSLATE TO ENGLISH if source is in another language.',
      schema: `{
        "voice": { "personality": [], "tone": "", "writeAs": "", "audienceLevel": "" },
        "suggestions": [{ "field": "voice.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
    copy: {
      focus: 'copy guidelines, writing rules, dos and don\'ts, word choices, phrases to use or avoid, grammar rules. TRANSLATE TO ENGLISH if source is in another language.',
      schema: `{
        "copyGuidelines": { 
          "dos": [{ "rule": "", "example": "", "why": "" }],
          "donts": [{ "rule": "", "badExample": "", "goodExample": "" }],
          "wordChoices": [{ "avoid": "", "prefer": "" }],
          "phrases": { "required": [], "banned": [] }
        },
        "suggestions": [{ "field": "copy.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
    visual: {
      focus: 'ALL visual guidelines: colors (extract ALL hex codes as strings like "#FF6B35", RGB as "rgb(255,107,53)", CMYK values), typography (ALL font families, weights, sizes), imagery/photography/illustration/icon styles, patterns, logo rules (clear space, min size, donts), spacing (grid system, margins, padding), layout (columns, max-width, breakpoints). TRANSLATE descriptions TO ENGLISH. IMPORTANT: Colors must be simple strings, not objects.',
      schema: `{
        "visualGuidelines": {
          "colors": { "primary": "#XXXXXX", "secondary": "#XXXXXX", "accent": "#XXXXXX", "neutrals": ["#XXXXXX"], "usage": "" },
          "typography": { "headings": { "family": "", "weights": [] }, "body": { "family": "", "weights": [] }, "usage": "" },
          "imagery": { "style": "", "photographyStyle": "", "illustrationStyle": "", "iconStyle": "", "patterns": "", "avoid": [], "prefer": [] },
          "logo": { "clearSpace": "", "minSize": "", "donts": [] },
          "spacing": { "gridSystem": "", "margins": "", "padding": "", "verticalRhythm": "", "componentSpacing": "" },
          "layout": { "principles": [], "maxWidth": "", "columns": "", "breakpoints": [] }
        },
        "suggestions": [{ "field": "visual.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
    messaging: {
      focus: 'messaging pillars, brand values, value proposition, taglines, slogans, mission statement, vision statement, boilerplate text, key messages. TRANSLATE TO ENGLISH if source is in another language.',
      schema: `{
        "messaging": { "pillars": [], "valueProposition": "", "tagline": "", "boilerplate": "" },
        "suggestions": [{ "field": "messaging.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
    content: {
      focus: 'content and media guidelines: content types (blog, whitepaper, case study, video, podcast), content pillars, editorial standards, SEO guidelines, accessibility requirements, video guidelines (style, length, format, captioning), audio guidelines (style, tone, music). TRANSLATE TO ENGLISH.',
      schema: `{
        "contentGuidelines": {
          "contentTypes": [],
          "contentPillars": [],
          "editorialGuidelines": [],
          "seoGuidelines": [],
          "accessibility": [],
          "videoGuidelines": { "style": "", "length": "", "format": "", "captioning": "" },
          "audioGuidelines": { "style": "", "tone": "", "musicStyle": "" }
        },
        "suggestions": [{ "field": "content.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
    social: {
      focus: 'social media best practices: platform-specific guidelines (LinkedIn, Twitter, Instagram, Facebook, TikTok, YouTube), posting frequency, best posting times, content types per platform, hashtag guidelines, character limits, image specifications, engagement guidelines, response time, content calendar themes. TRANSLATE TO ENGLISH.',
      schema: `{
        "socialMediaGuidelines": {
          "platforms": [{ "name": "", "tone": "", "postingFrequency": "", "bestTimes": [], "contentTypes": [], "hashtagGuidelines": "", "characterLimits": "", "imageSpecs": "" }],
          "generalRules": [],
          "engagement": { "responseTime": "", "tone": "", "escalationGuidelines": [] },
          "contentCalendar": { "themes": [], "campaigns": [] }
        },
        "suggestions": [{ "field": "social.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
    logo: {
      focus: 'logo assets and files: logo file locations, URLs, descriptions, file formats (SVG, PNG, JPG), color versions (full color, black, white, reversed), alternative logos, favicon specifications, any mentions of logo image files or download links. Extract ALL logo-related information.',
      schema: `{
        "logoAssets": {
          "primaryLogo": { "url": "", "description": "", "formats": [], "colorVersions": [] },
          "alternativeLogos": [{ "name": "", "url": "", "description": "", "useCase": "" }],
          "favicon": { "url": "", "sizes": [] }
        },
        "suggestions": [{ "field": "logo.X", "value": "", "confidence": 0.9, "source": "" }],
        "confidence": 0.85
      }`,
    },
  };

  const { focus, schema } = categoryPrompts[category];

  // Search through chunks for relevant content
  // Use first 2 and last 1 chunks plus any that seem relevant
  const relevantChunks = selectRelevantChunks(chunks, category);
  const combinedContent = relevantChunks.join('\n\n---PAGE BREAK---\n\n');

  const result = await generateText({
    model: model as any,
    system: `You are an expert at analyzing brand guidelines documents.

CRITICAL: ALL OUTPUT MUST BE IN ENGLISH. Translate any Dutch, German, French, or other language content to English.
    
FOCUS on extracting: ${focus}

Be THOROUGH - extract ALL details you find, even if the document structures them differently.
Look for:
- Tables, bullet lists, examples, specifications
- Color codes (hex #XXXXXX, RGB, CMYK)
- Font names and weights
- Numeric values (sizes, spacing, margins)
- Dutch terms: "Huisstijl", "Kleuren", "Typografie", "Beeldtaal"
- German terms: "Farbpalette", "Schriftarten"

Return valid JSON with all extracted information.`,
    prompt: `
Extract ${category} guidelines from this "${brandName}" brand document:

---
${combinedContent}
---

Return JSON matching this schema:
${schema}`,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error(`Failed to parse ${category} extraction:`, error);
  }
  
  return { confidence: 0, suggestions: [] };
}

/**
 * Select the most relevant chunks for a category
 */
function selectRelevantChunks(chunks: string[], category: string): string[] {
  const keywords: Record<string, string[]> = {
    voice: ['voice', 'tone', 'personality', 'audience', 'speak', 'communicate', 'style', 'stem', 'toon', 'doelgroep'],
    copy: ['copy', 'writing', 'do ', 'don\'t', 'avoid', 'never', 'always', 'word', 'phrase', 'tekst', 'schrijf', 'gebruik'],
    visual: ['color', 'colour', 'typography', 'font', 'logo', 'image', 'photo', 'visual', 'hex', '#', 'kleur', 'typografie', 'lettertype', 'beeldtaal', 'huisstijl', 'spacing', 'grid', 'margin', 'padding'],
    messaging: ['mission', 'vision', 'value', 'pillar', 'tagline', 'slogan', 'message', 'purpose', 'missie', 'visie', 'waarde', 'boodschap', 'kernwaarde'],
    content: ['content', 'media', 'editorial', 'seo', 'accessibility', 'video', 'audio', 'podcast', 'blog', 'whitepaper', 'case study', 'article', 'inhoud', 'redactie'],
    social: ['social', 'media', 'twitter', 'linkedin', 'instagram', 'facebook', 'tiktok', 'youtube', 'post', 'hashtag', 'engagement', 'platform', 'sociale media'],
    logo: ['logo', 'icon', 'favicon', 'brand mark', 'symbol', 'emblem', 'file', 'download', 'asset', 'svg', 'png', 'jpg', 'beeldmerk'],
  };

  const categoryKeywords = keywords[category] || [];
  
  // Score each chunk by keyword presence
  const scored = chunks.map((chunk, index) => {
    const lowerChunk = chunk.toLowerCase();
    const score = categoryKeywords.reduce((acc, kw) => {
      return acc + (lowerChunk.includes(kw) ? 1 : 0);
    }, 0);
    return { chunk, score, index };
  });

  // Sort by score, take top chunks (max 3)
  const sorted = scored.sort((a, b) => b.score - a.score);
  const selected = sorted.slice(0, 3);
  
  // Also include first chunk (often has intro/mission) if not already included
  if (!selected.find(s => s.index === 0) && chunks.length > 0) {
    selected.push({ chunk: chunks[0], score: 0, index: 0 });
  }

  return selected.map(s => s.chunk);
}

/**
 * Check content against brand guidelines
 */
export async function checkBrandCompliance(
  content: string,
  checkType: CheckType,
  guidelines: BrandGuidelines,
  modelKey?: keyof typeof AI_MODELS
): Promise<BrandCheckResult> {
  const selectedModel = modelKey || getDefaultModel();
  const model = AI_MODELS[selectedModel];
  const systemPrompt = buildBrandSystemPrompt(guidelines);
  
  const checkPrompts: Record<CheckType, string> = {
    copy: `Analyze this copy for brand compliance. Check for:
- Tone and voice alignment
- Prohibited words/phrases
- Required messaging elements
- Word choice preferences`,
    image: `Analyze this image description for brand visual compliance. Check for:
- Imagery style alignment
- Prohibited visual elements
- Preferred visual elements`,
    color: `Analyze these colors for brand compliance. Check if they match:
- Primary colors
- Secondary colors
- Approved color palette`,
    logo: `Analyze this logo usage for brand compliance. Check for:
- Clear space requirements
- Minimum size requirements
- Prohibited modifications`,
    full: `Perform a complete brand compliance check covering:
- Copy/tone alignment
- Visual guidelines adherence
- Messaging consistency
- Overall brand alignment`,
  };

  const result = await generateText({
    model: model as any,
    system: systemPrompt,
    prompt: `
${checkPrompts[checkType]}

Content to check:
---
${content}
---

Respond with a JSON object:
{
  "score": 85,
  "isCompliant": true,
  "issues": [
    { "severity": "error|warning|info", "rule": "rule violated", "found": "the issue", "suggestion": "how to fix" }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "summary": "Brief overall assessment"
}`,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        checkType,
        score: parsed.score || 0,
        isCompliant: parsed.isCompliant ?? parsed.score >= 80,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        summary: parsed.summary || 'Check completed',
      };
    }
    throw new Error('No JSON found');
  } catch (error) {
    console.error('Failed to parse check result:', error);
    return {
      checkType,
      score: 0,
      isCompliant: false,
      issues: [{ 
        severity: 'error', 
        rule: 'System Error', 
        found: 'Failed to analyze', 
        suggestion: 'Please try again' 
      }],
      suggestions: [],
      summary: 'Analysis failed',
    };
  }
}

/**
 * Generate on-brand content
 */
export async function generateOnBrandContent(
  prompt: string,
  contentType: 'headline' | 'social' | 'email' | 'blog' | 'ad',
  guidelines: BrandGuidelines,
  options?: {
    platform?: string;
    length?: 'short' | 'medium' | 'long';
    variations?: number;
  },
  modelKey?: keyof typeof AI_MODELS
): Promise<{ content: string; variations?: string[] }> {
  const selectedModel = modelKey || getDefaultModel();
  const model = AI_MODELS[selectedModel];
  const systemPrompt = buildBrandSystemPrompt(guidelines);
  
  const contentInstructions: Record<string, string> = {
    headline: 'Create compelling headlines that grab attention while staying on-brand.',
    social: `Create social media content${options?.platform ? ` optimized for ${options.platform}` : ''}.`,
    email: 'Create email copy that is engaging and on-brand.',
    blog: 'Create blog content that reflects brand voice and values.',
    ad: 'Create advertising copy that is persuasive and on-brand.',
  };

  const result = await generateText({
    model: model as any,
    system: `${systemPrompt}

You are now in content generation mode. ${contentInstructions[contentType]}

Always:
- Follow the brand voice and tone
- Use preferred word choices
- Avoid banned phrases
- Incorporate messaging pillars naturally`,
    prompt: `
Generate ${contentType} content for this request:

${prompt}

${options?.variations ? `Provide ${options.variations} variations.` : ''}
${options?.length ? `Target length: ${options.length}` : ''}

Format your response as JSON:
{
  "content": "main content here",
  "variations": ["variation 1", "variation 2"]
}`,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // If no JSON, return raw text
    return { content: result.text };
  } catch {
    return { content: result.text };
  }
}
