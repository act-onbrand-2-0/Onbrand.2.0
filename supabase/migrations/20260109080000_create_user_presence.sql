-- Create user presence table for tracking online status
-- Used to determine whether to send email or push notification

CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick presence lookups
CREATE INDEX idx_user_presence_online ON public.user_presence(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_user_presence_last_seen ON public.user_presence(last_seen DESC);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Users can view any presence (needed for "who's online" features)
CREATE POLICY "Anyone can view presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can only update their own presence
CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own presence
CREATE POLICY "Users can insert own presence"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role can do anything (for cleanup jobs)
CREATE POLICY "Service role full access"
  ON public.user_presence FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Function to update user presence (upsert)
CREATE OR REPLACE FUNCTION public.update_user_presence(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, last_seen, is_online, updated_at)
  VALUES (p_user_id, NOW(), TRUE, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_seen = NOW(),
    is_online = TRUE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user offline
CREATE OR REPLACE FUNCTION public.set_user_offline(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_presence
  SET is_online = FALSE, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is online (considers them online if seen in last 5 minutes)
CREATE OR REPLACE FUNCTION public.is_user_online(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_seen TIMESTAMP WITH TIME ZONE;
  v_is_online BOOLEAN;
BEGIN
  SELECT last_seen, is_online INTO v_last_seen, v_is_online
  FROM public.user_presence
  WHERE user_id = p_user_id;
  
  -- User not found in presence table = offline
  IF v_last_seen IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if explicitly online AND seen within last 5 minutes
  RETURN v_is_online AND (v_last_seen > NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get multiple users' online status
CREATE OR REPLACE FUNCTION public.get_users_online_status(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, is_online BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(
      p.is_online AND p.last_seen > NOW() - INTERVAL '5 minutes',
      FALSE
    ) AS is_online
  FROM unnest(p_user_ids) AS u(id)
  LEFT JOIN public.user_presence p ON p.user_id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.user_presence IS 'Tracks user online presence for notification routing (push vs email)';
COMMENT ON COLUMN public.user_presence.is_online IS 'Whether user is currently active in the app';
COMMENT ON COLUMN public.user_presence.last_seen IS 'Last time user was active';
