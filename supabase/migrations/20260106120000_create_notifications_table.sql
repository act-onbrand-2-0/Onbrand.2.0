-- Create notifications table for in-app notifications
-- Supports real-time notifications via Supabase Realtime

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'conversation_shared',
    'project_shared',
    'message_shared',
    'share_accepted',
    'share_declined',
    'mention',
    'system'
  )),
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reference to related entities
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  share_id UUID REFERENCES public.conversation_shares(id) ON DELETE SET NULL,
  
  -- Who triggered the notification
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_brand ON public.notifications(brand_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role / system can insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Enable Realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM public.notifications 
    WHERE user_id = user_uuid AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a notification (can be called from triggers or API)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_brand_id TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_share_id UUID DEFAULT NULL,
  p_triggered_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, metadata, brand_id,
    conversation_id, project_id, share_id, triggered_by
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_metadata, p_brand_id,
    p_conversation_id, p_project_id, p_share_id, p_triggered_by
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create notification when conversation is shared
CREATE OR REPLACE FUNCTION public.notify_on_conversation_share()
RETURNS TRIGGER AS $$
DECLARE
  sharer_name TEXT;
  conv_title TEXT;
BEGIN
  -- Get sharer name
  SELECT COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
  INTO sharer_name
  FROM auth.users
  WHERE id = NEW.shared_by;
  
  -- Get conversation title
  SELECT title INTO conv_title
  FROM public.conversations
  WHERE id = NEW.conversation_id;
  
  -- Create notification for the recipient
  PERFORM public.create_notification(
    NEW.shared_with,
    'conversation_shared',
    'Chat shared with you',
    sharer_name || ' shared "' || COALESCE(conv_title, 'Untitled Chat') || '" with you',
    jsonb_build_object(
      'sharer_name', sharer_name,
      'conversation_title', conv_title
    ),
    NEW.brand_id,
    NEW.conversation_id,
    NULL,
    NEW.id,
    NEW.shared_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for conversation shares
DROP TRIGGER IF EXISTS trigger_notify_on_conversation_share ON public.conversation_shares;
CREATE TRIGGER trigger_notify_on_conversation_share
  AFTER INSERT ON public.conversation_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_conversation_share();

-- Comments
COMMENT ON TABLE public.notifications IS 'In-app notifications for users, supports real-time via Supabase Realtime';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: conversation_shared, project_shared, message_shared, share_accepted, share_declined, mention, system';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional data related to the notification as JSON';
