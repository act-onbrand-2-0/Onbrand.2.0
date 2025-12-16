# Logo and Image Extraction - Implementation Plan

## Current Status
✅ **Logo Assets data structure added** to `lib/ai/types.ts`
✅ **AI extraction** includes logo guidelines (descriptions, formats, usage rules)
✅ **Database columns** support storing logo asset information

## What's Working Now
- AI extracts logo **descriptions** and **usage guidelines** from PDFs
- Logo information is stored in the `logo_assets` JSONB column
- Logo guidelines are displayed in the Brand Guidelines Settings

## What's Not Yet Implemented
❌ **Automatic image extraction from PDFs** - Complex and unreliable
❌ **Logo image upload UI** - Need file upload component
❌ **Image display in guidelines** - Need image gallery component

## Recommended Approach

### Phase 1: Manual Logo Upload (Recommended First)
1. Add logo upload button to Brand Guidelines Settings
2. Upload logos to Supabase Storage (`brand-logos` bucket)
3. Store URLs in `logo_assets.primaryLogo.imageUrl`
4. Display logos in the guidelines UI

### Phase 2: PDF Image Extraction (Future Enhancement)
PDF image extraction is technically challenging because:
- `pdf-parse` only extracts text
- `pdfjs-dist` image extraction is complex and unreliable
- Images in PDFs are often compressed/embedded in complex ways
- Better to let users upload clean logo files

**Alternative**: Use AI vision models (Claude with vision, GPT-4V) to:
1. Convert PDF pages to images
2. Use vision AI to identify and extract logos
3. This is more reliable than PDF parsing

## Implementation Steps for Logo Upload

### 1. Create Supabase Storage Bucket
```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true);

-- Set up RLS policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-logos');

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-logos');
```

### 2. Add Logo Upload Component
Create `components/brand/LogoUpload.tsx`:
- File input for logo images
- Preview uploaded logos
- Store URLs in guidelines

### 3. Update Brand Guidelines Settings
Add logo upload section to `BrandGuidelinesSettings.tsx`:
- Show existing logo if available
- Upload button for new logos
- Display logo with usage guidelines

### 4. Update API Route
Modify `app/api/brands/[brandId]/guidelines/update/route.ts`:
- Handle logo file uploads
- Store in Supabase Storage
- Update `logo_assets` with image URLs

## Files to Modify
- [ ] `components/brand/LogoUpload.tsx` (new file)
- [ ] `components/brand/BrandGuidelinesSettings.tsx` (add logo section)
- [ ] `app/api/brands/[brandId]/guidelines/update/route.ts` (handle uploads)
- [ ] `lib/ai/types.ts` (already updated ✅)

## Testing Checklist
- [ ] Upload PNG logo
- [ ] Upload SVG logo
- [ ] Upload multiple logo variations
- [ ] Display logos in guidelines view
- [ ] Delete/replace logos
- [ ] Logos persist after page refresh

## Future Enhancements
- Automatic logo detection using AI vision
- Logo format conversion (PNG → SVG)
- Logo optimization and compression
- Logo usage tracking and analytics
