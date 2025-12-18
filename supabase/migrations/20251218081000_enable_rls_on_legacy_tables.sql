-- Enable RLS on legacy tables to satisfy security requirements
-- These appear to be from an older schema and may not be actively used

-- Enable RLS on brands (public read, admin write)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands are viewable by everyone" ON public.brands FOR SELECT USING (true);

-- Enable RLS on legacy Chat table
ALTER TABLE public."Chat" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chats" ON public."Chat" FOR SELECT USING (auth.uid()::text = "userId"::text);
CREATE POLICY "Users can manage own chats" ON public."Chat" FOR ALL USING (auth.uid()::text = "userId"::text);

-- Enable RLS on legacy Message table
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in own chats" ON public."Message" FOR SELECT 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));
CREATE POLICY "Users can manage messages in own chats" ON public."Message" FOR ALL 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));

-- Enable RLS on legacy Message_v2 table
ALTER TABLE public."Message_v2" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages_v2 in own chats" ON public."Message_v2" FOR SELECT 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));
CREATE POLICY "Users can manage messages_v2 in own chats" ON public."Message_v2" FOR ALL 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));

-- Enable RLS on legacy User table
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own user record" ON public."User" FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own user record" ON public."User" FOR UPDATE USING (auth.uid()::text = id::text);

-- Enable RLS on legacy Vote tables
ALTER TABLE public."Vote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage votes in own chats" ON public."Vote" FOR ALL 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));

ALTER TABLE public."Vote_v2" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage votes_v2 in own chats" ON public."Vote_v2" FOR ALL 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));

-- Enable RLS on Document table
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public."Document" FOR SELECT USING (auth.uid()::text = "userId"::text);
CREATE POLICY "Users can manage own documents" ON public."Document" FOR ALL USING (auth.uid()::text = "userId"::text);

-- Enable RLS on Suggestion table
ALTER TABLE public."Suggestion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own suggestions" ON public."Suggestion" FOR SELECT USING (auth.uid()::text = "userId"::text);
CREATE POLICY "Users can manage own suggestions" ON public."Suggestion" FOR ALL USING (auth.uid()::text = "userId"::text);

-- Enable RLS on Stream table
ALTER TABLE public."Stream" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view streams in own chats" ON public."Stream" FOR SELECT 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));
CREATE POLICY "Users can manage streams in own chats" ON public."Stream" FOR ALL 
  USING ("chatId" IN (SELECT id FROM public."Chat" WHERE "userId"::text = auth.uid()::text));
