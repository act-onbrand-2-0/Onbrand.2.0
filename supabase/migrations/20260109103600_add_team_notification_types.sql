-- Add new notification types for team management
-- Drops and recreates the type constraint to include role_change, team_invite, team_removed

ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'conversation_shared',
  'project_shared',
  'message_shared',
  'share_accepted',
  'share_declined',
  'mention',
  'system',
  'role_change',
  'team_invite',
  'team_removed'
));

-- Update the comment to reflect new types
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: conversation_shared, project_shared, message_shared, share_accepted, share_declined, mention, system, role_change, team_invite, team_removed';
