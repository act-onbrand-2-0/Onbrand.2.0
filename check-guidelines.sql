-- Check if brand_guidelines table exists and has data
SELECT 
  id,
  brand_id,
  status,
  approved_by,
  approved_at,
  created_at,
  updated_at
FROM brand_guidelines
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any pending guidelines
SELECT 
  brand_id,
  status,
  COUNT(*) as count
FROM brand_guidelines
GROUP BY brand_id, status;
