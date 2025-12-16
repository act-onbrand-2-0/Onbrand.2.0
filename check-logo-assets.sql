-- Check if logo_assets data exists in the database
SELECT 
  id,
  brand_id,
  status,
  logo_assets,
  jsonb_pretty(logo_assets) as formatted_logo_assets,
  extracted_at,
  approved_at
FROM brand_guidelines
WHERE brand_id = 'act'
ORDER BY extracted_at DESC
LIMIT 1;

-- Check if extractedImages array exists
SELECT 
  brand_id,
  logo_assets->'extractedImages' as extracted_images,
  jsonb_array_length(logo_assets->'extractedImages') as logo_count
FROM brand_guidelines
WHERE brand_id = 'act'
  AND logo_assets IS NOT NULL
  AND logo_assets->'extractedImages' IS NOT NULL;
