-- ═══════════════════════════════════════════════════════════════
-- EASE BUILDERS SITE MANAGER v4 — MESSAGING (Phase 2)
-- Direct messages + per-project chat threads
-- Run this in Supabase SQL Editor AFTER the base schema + Phase 3
-- ═══════════════════════════════════════════════════════════════

-- ── CONVERSATIONS ────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type             TEXT NOT NULL CHECK (type IN ('direct','project')),
  project_id       UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title            TEXT,                     -- optional override (direct convos derive name from the other user)
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id)   -- one thread per project
);

-- ── PARTICIPANTS ─────────────────────────────────────────────────
CREATE TABLE public.conversation_participants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at     TIMESTAMPTZ,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ── MESSAGES ─────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES public.users(id),
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX idx_cp_user           ON public.conversation_participants(user_id);
CREATE INDEX idx_cp_conv           ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conv     ON public.messages(conversation_id, created_at);
CREATE INDEX idx_conversations_proj ON public.conversations(project_id);

-- ── HELPER FUNCTION (SECURITY DEFINER — avoids RLS self-recursion) ──
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS
$$ SELECT EXISTS (
     SELECT 1 FROM public.conversation_participants
     WHERE conversation_id = conv_id AND user_id = auth.uid()
   ); $$;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_select" ON public.conversations FOR SELECT
  USING (is_conversation_participant(id));
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE
  USING (is_conversation_participant(id));

CREATE POLICY "cp_select" ON public.conversation_participants FOR SELECT
  USING (is_conversation_participant(conversation_id));
CREATE POLICY "cp_insert" ON public.conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_conversation_participant(conversation_id));
CREATE POLICY "cp_update_own" ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "msg_select" ON public.messages FOR SELECT
  USING (is_conversation_participant(conversation_id));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND is_conversation_participant(conversation_id));

-- ── NEW MESSAGE TRIGGER — bumps last_message_at + notifies other participants ──
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  conv_project UUID;
BEGIN
  SELECT full_name INTO sender_name FROM public.users WHERE id = NEW.sender_id;
  SELECT project_id INTO conv_project FROM public.conversations WHERE id = NEW.conversation_id;

  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;

  INSERT INTO public.notifications (user_id, type, title, message, project_id)
  SELECT cp.user_id, 'message', sender_name || ' sent a message', LEFT(NEW.body, 120), conv_project
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id != NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION handle_new_message();

-- ── REALTIME ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

SELECT 'Messaging schema installed ✓' as status;
