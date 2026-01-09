-- Drop the foreign key constraint on message_reactions to avoid race conditions
-- Messages are saved asynchronously and users may react before save completes

-- Find and drop the foreign key constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'message_reactions'::regclass
    AND contype = 'f'
    AND confrelid = 'messages'::regclass;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE message_reactions DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;
