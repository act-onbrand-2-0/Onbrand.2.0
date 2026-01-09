-- Find the user by email
SELECT id, email, raw_user_meta_data->>'full_name' as name
FROM auth.users 
WHERE email = 'zara_vanthoff@hotmail.com';

-- Check their brand associations
SELECT bu.*, b.name as brand_name 
FROM brand_users bu
JOIN brands b ON b.id = bu.brand_id
WHERE bu.user_id = (
  SELECT id FROM auth.users WHERE email = 'zara_vanthoff@hotmail.com'
);

-- Remove from ACT brand (run this after confirming the brand_id)
-- DELETE FROM brand_users 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'zara_vanthoff@hotmail.com')
-- AND brand_id = 'YOUR_ACT_BRAND_ID_HERE';
