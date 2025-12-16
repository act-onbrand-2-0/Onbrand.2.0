-- Add new guideline fields to brand_guidelines table
-- Content & Media Guidelines, Social Media Best Practices, and Logo Assets

-- Add content_guidelines column
ALTER TABLE public.brand_guidelines 
ADD COLUMN IF NOT EXISTS content_guidelines JSONB DEFAULT '{}'::jsonb;

-- Add social_media_guidelines column
ALTER TABLE public.brand_guidelines 
ADD COLUMN IF NOT EXISTS social_media_guidelines JSONB DEFAULT '{}'::jsonb;

-- Add logo_assets column
ALTER TABLE public.brand_guidelines 
ADD COLUMN IF NOT EXISTS logo_assets JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.brand_guidelines.content_guidelines IS 'Content and media guidelines including content types, editorial standards, SEO, accessibility, video/audio guidelines';
COMMENT ON COLUMN public.brand_guidelines.social_media_guidelines IS 'Social media best practices including platform-specific guidelines, posting frequency, engagement rules';
COMMENT ON COLUMN public.brand_guidelines.logo_assets IS 'Logo asset information including file locations, formats, color versions, and alternative logos';

-- Example structures for reference:

-- content_guidelines:
-- {
--   "contentTypes": ["blog posts", "whitepapers", "case studies", "videos"],
--   "contentPillars": ["Innovation", "Customer Success", "Industry Insights"],
--   "editorialGuidelines": ["Use AP style", "Fact-check all claims", "Include sources"],
--   "seoGuidelines": ["Include focus keyword in title", "Meta description 150-160 chars"],
--   "accessibility": ["Alt text for all images", "WCAG 2.1 AA compliance"],
--   "videoGuidelines": {
--     "style": "Professional but approachable",
--     "length": "2-3 minutes for social, 5-10 for website",
--     "format": "16:9 aspect ratio, 1080p minimum",
--     "captioning": "Required for all videos"
--   },
--   "audioGuidelines": {
--     "style": "Conversational and informative",
--     "tone": "Warm and professional",
--     "musicStyle": "Upbeat corporate, no lyrics"
--   }
-- }

-- social_media_guidelines:
-- {
--   "platforms": [
--     {
--       "name": "LinkedIn",
--       "tone": "Professional and thought-leading",
--       "postingFrequency": "3-5 times per week",
--       "bestTimes": ["Tuesday 10am", "Wednesday 12pm", "Thursday 9am"],
--       "contentTypes": ["thought leadership", "company news", "industry insights"],
--       "hashtagGuidelines": "2-3 relevant hashtags maximum",
--       "characterLimits": "3000 characters max, aim for 150-300",
--       "imageSpecs": "1200x627px, PNG or JPG"
--     }
--   ],
--   "generalRules": [
--     "Always respond to comments within 24 hours",
--     "Never engage with trolls or negative comments publicly",
--     "Use brand voice consistently across all platforms"
--   ],
--   "engagement": {
--     "responseTime": "Within 2 hours during business hours",
--     "tone": "Helpful and professional",
--     "escalationGuidelines": ["Escalate complaints to customer service", "Flag crisis situations to PR team"]
--   },
--   "contentCalendar": {
--     "themes": ["Monday Motivation", "Wednesday Wisdom", "Friday Features"],
--     "campaigns": ["Q1 Product Launch", "Summer Sale", "Year-end Review"]
--   }
-- }

-- logo_assets:
-- {
--   "primaryLogo": {
--     "url": "https://brand.com/assets/logo-primary.svg",
--     "description": "Main logo for light backgrounds",
--     "formats": ["SVG", "PNG", "JPG"],
--     "colorVersions": ["full color", "black", "white"]
--   },
--   "alternativeLogos": [
--     {
--       "name": "Horizontal Logo",
--       "url": "https://brand.com/assets/logo-horizontal.svg",
--       "description": "For wide spaces and headers",
--       "useCase": "Website header, email signatures"
--     },
--     {
--       "name": "Icon Only",
--       "url": "https://brand.com/assets/logo-icon.svg",
--       "description": "Square icon version",
--       "useCase": "Social media profile pictures, app icons"
--     }
--   ],
--   "favicon": {
--     "url": "https://brand.com/assets/favicon.ico",
--     "sizes": ["16x16", "32x32", "48x48"]
--   }
-- }
