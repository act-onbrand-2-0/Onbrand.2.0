-- Update all existing accepted shares to have 'write' permission for collaborative chat
-- This fixes shares that were created before the permission field was properly set

UPDATE public.conversation_shares 
SET permission = 'write' 
WHERE status = 'accepted' AND (permission IS NULL OR permission = 'read');

-- Also set default permission to 'write' for future shares (collaborative by default)
ALTER TABLE public.conversation_shares 
ALTER COLUMN permission SET DEFAULT 'write';
