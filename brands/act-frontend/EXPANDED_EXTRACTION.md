# Expanded Brand Guidelines Extraction

## Overview
The brand guidelines extraction has been expanded to include **Content & Media Guidelines**, **Social Media Best Practices**, and **Logo Assets** extraction from PDF documents.

## New Extraction Categories

### 1. Content & Media Guidelines
Extracts comprehensive content strategy and media production guidelines:

- **Content Types**: Blog posts, whitepapers, case studies, videos, podcasts
- **Content Pillars**: Main themes and topics
- **Editorial Guidelines**: Writing standards, fact-checking, sourcing
- **SEO Guidelines**: Keyword usage, meta descriptions, optimization
- **Accessibility**: WCAG compliance, alt text, inclusive design
- **Video Guidelines**: Style, length, format, captioning requirements
- **Audio Guidelines**: Podcast style, tone, music preferences

**Example Output:**
```json
{
  "contentGuidelines": {
    "contentTypes": ["blog posts", "whitepapers", "case studies"],
    "contentPillars": ["Innovation", "Customer Success"],
    "editorialGuidelines": ["Use AP style", "Fact-check all claims"],
    "seoGuidelines": ["Include focus keyword in title"],
    "accessibility": ["Alt text for all images", "WCAG 2.1 AA"],
    "videoGuidelines": {
      "style": "Professional but approachable",
      "length": "2-3 minutes for social",
      "format": "16:9, 1080p minimum",
      "captioning": "Required for all videos"
    },
    "audioGuidelines": {
      "style": "Conversational",
      "tone": "Warm and professional",
      "musicStyle": "Upbeat corporate"
    }
  }
}
```

### 2. Social Media Best Practices
Extracts platform-specific social media guidelines:

- **Platform Guidelines**: LinkedIn, Twitter, Instagram, Facebook, TikTok, YouTube
- **Posting Frequency**: How often to post per platform
- **Best Times**: Optimal posting times
- **Content Types**: Platform-specific content strategies
- **Hashtag Guidelines**: Usage rules and recommendations
- **Character Limits**: Platform-specific constraints
- **Image Specifications**: Required dimensions and formats
- **Engagement Rules**: Response time, tone, escalation procedures
- **Content Calendar**: Themes, campaigns, scheduling

**Example Output:**
```json
{
  "socialMediaGuidelines": {
    "platforms": [
      {
        "name": "LinkedIn",
        "tone": "Professional and thought-leading",
        "postingFrequency": "3-5 times per week",
        "bestTimes": ["Tuesday 10am", "Wednesday 12pm"],
        "contentTypes": ["thought leadership", "company news"],
        "hashtagGuidelines": "2-3 relevant hashtags maximum",
        "characterLimits": "Aim for 150-300 characters",
        "imageSpecs": "1200x627px, PNG or JPG"
      }
    ],
    "generalRules": [
      "Respond to comments within 24 hours",
      "Use brand voice consistently"
    ],
    "engagement": {
      "responseTime": "Within 2 hours during business hours",
      "tone": "Helpful and professional",
      "escalationGuidelines": ["Escalate complaints to CS"]
    }
  }
}
```

### 3. Logo Assets & Files
Extracts logo file information and asset locations:

- **Primary Logo**: Main logo URL, description, formats
- **Color Versions**: Full color, black, white, reversed
- **Alternative Logos**: Horizontal, vertical, icon-only versions
- **Use Cases**: When to use each logo variant
- **Favicon**: Icon specifications and sizes
- **File Formats**: SVG, PNG, JPG availability

**Example Output:**
```json
{
  "logoAssets": {
    "primaryLogo": {
      "url": "https://brand.com/assets/logo-primary.svg",
      "description": "Main logo for light backgrounds",
      "formats": ["SVG", "PNG", "JPG"],
      "colorVersions": ["full color", "black", "white"]
    },
    "alternativeLogos": [
      {
        "name": "Horizontal Logo",
        "url": "https://brand.com/assets/logo-horizontal.svg",
        "description": "For wide spaces and headers",
        "useCase": "Website header, email signatures"
      }
    ],
    "favicon": {
      "url": "https://brand.com/assets/favicon.ico",
      "sizes": ["16x16", "32x32", "48x48"]
    }
  }
}
```

## AI Model Support

All extraction categories work with all supported AI models:

- **Google Gemini 2.0 Flash** (`gemini`) - Default
- **OpenAI GPT-4o** (`gpt4o`) - Highest quality
- **OpenAI GPT-4o Mini** (`gpt4oMini`) - Balanced

**Note**: The playground URL you shared (`https://ai-sdk.dev/playground/openai:gpt-5.2-pro`) is just a demo interface. There is no GPT-5.2 model yet - GPT-4o is the latest from OpenAI.

## Database Schema

New columns added to `brand_guidelines` table:

```sql
-- Content & Media Guidelines
content_guidelines JSONB DEFAULT '{}'::jsonb

-- Social Media Best Practices  
social_media_guidelines JSONB DEFAULT '{}'::jsonb

-- Logo Assets
logo_assets JSONB DEFAULT '{}'::jsonb
```

## Usage

### Automatic Extraction
When you upload a PDF, all categories are automatically extracted:

```typescript
const extraction = await extractGuidelines(
  documentContent,
  brandName,
  'gpt4o' // Optional: specify model
);

// Returns:
// {
//   voice: {...},
//   copyGuidelines: {...},
//   visualGuidelines: {...},
//   messaging: {...},
//   contentGuidelines: {...},      // NEW
//   socialMediaGuidelines: {...},  // NEW
//   logoAssets: {...},              // NEW
//   suggestions: [...],
//   confidence: 0.95
// }
```

### Chunked Processing
For large documents (>10,000 tokens), extraction is done in parallel:

- Voice extraction
- Copy guidelines extraction
- Visual guidelines extraction
- Messaging extraction
- **Content guidelines extraction** (NEW)
- **Social media guidelines extraction** (NEW)
- **Logo assets extraction** (NEW)

Each category is processed independently for faster results.

## Keyword Detection

The AI looks for these keywords to find relevant sections:

### Content Keywords
`content`, `media`, `editorial`, `seo`, `accessibility`, `video`, `audio`, `podcast`, `blog`, `whitepaper`, `case study`, `article`, `inhoud`, `redactie`

### Social Media Keywords
`social`, `media`, `twitter`, `linkedin`, `instagram`, `facebook`, `tiktok`, `youtube`, `post`, `hashtag`, `engagement`, `platform`, `sociale media`

### Logo Keywords
`logo`, `icon`, `favicon`, `brand mark`, `symbol`, `emblem`, `file`, `download`, `asset`, `svg`, `png`, `jpg`, `beeldmerk`

## Multi-Language Support

All extracted content is automatically translated to English, including:

- Dutch (Nederlands)
- German (Deutsch)
- French (Français)
- And other languages

## Files Modified

### Type Definitions
- `lib/ai/types.ts` - Added `ContentGuidelines`, `SocialMediaGuidelines`, `LogoAssets` interfaces

### Extraction Logic
- `lib/ai/agent.ts` - Updated extraction prompts and category processing

### Database
- `lib/ai/guidelines-db.ts` - Updated save/load functions
- `supabase/migrations/20251216140000_add_content_social_logo_guidelines.sql` - New migration

## Testing

To test the new extraction:

1. Upload a brand guidelines PDF that includes:
   - Content strategy section
   - Social media guidelines
   - Logo download links or asset information

2. Check the extracted data in the dashboard

3. Verify all three new categories are populated

## Best Practices

### For Content Guidelines
- Include content type definitions
- Specify editorial standards
- Document SEO requirements
- Define accessibility standards

### For Social Media
- List all active platforms
- Specify posting schedules
- Include engagement rules
- Define escalation procedures

### For Logo Assets
- Provide download URLs
- List all file formats
- Specify use cases
- Include color variations

## Troubleshooting

### Missing Content Guidelines
- Check if PDF has content/editorial section
- Try using GPT-4o for better extraction
- Verify section isn't labeled differently

### Missing Social Media Guidelines
- Ensure PDF mentions social platforms
- Check for alternative names (e.g., "Digital Channels")
- Try different AI model

### Missing Logo Assets
- Verify PDF mentions logo files or downloads
- Check for asset library references
- Look for brand portal URLs

## Future Enhancements

Potential additions:
- **Image extraction**: Extract actual logo images from PDF
- **Asset downloading**: Auto-download referenced files
- **Link validation**: Verify logo URLs are accessible
- **Format conversion**: Convert extracted assets to web formats
