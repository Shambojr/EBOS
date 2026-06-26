-- ═══════════════════════════════════════════════════════════════
-- EASE BUILDERS SITE MANAGER v4
-- Supabase PostgreSQL Schema + RLS Policies
-- Run this ENTIRE file in Supabase SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ──────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('director', 'accountant', 'site_engineer');
CREATE TYPE project_status AS ENUM ('Active', 'On Hold', 'Completed');
CREATE TYPE milestone_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE material_status AS ENUM (
  'Pending', 'Ordered', 'In Transit', 'Delivered',
  'Partially Delivered', 'Delayed', 'Cancelled'
);
CREATE TYPE payment_status AS ENUM ('Paid', 'Pending', 'Partial');
CREATE TYPE doc_approval AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected', 'Superseded');

-- ── USERS (extends auth.users) ─────────────────────────────────
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'site_engineer',
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_seen   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PROJECTS ───────────────────────────────────────────────────
CREATE TABLE public.projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  client      TEXT,
  location    TEXT,
  type        TEXT,
  status      project_status NOT NULL DEFAULT 'Active',
  stage       TEXT,
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget      NUMERIC(15,2),
  start_date  DATE,
  end_date    DATE,
  notes       TEXT,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PROJECT TEAM ───────────────────────────────────────────────
CREATE TABLE public.project_members (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_on_project  TEXT,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ── MILESTONES ─────────────────────────────────────────────────
CREATE TABLE public.milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  due_date    DATE,
  actual_date DATE,
  priority    milestone_priority NOT NULL DEFAULT 'Medium',
  assignee_id UUID REFERENCES public.users(id),
  pct         INTEGER NOT NULL DEFAULT 0 CHECK (pct BETWEEN 0 AND 100),
  done        BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DAILY LOGS ─────────────────────────────────────────────────
CREATE TABLE public.daily_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by           UUID NOT NULL REFERENCES public.users(id),
  achievements        TEXT,
  site_update         TEXT NOT NULL,
  weather             TEXT,
  contractor          TEXT,
  day_progress        INTEGER CHECK (day_progress BETWEEN 0 AND 100),
  issues              TEXT,
  next_plan           TEXT,
  client_visit        BOOLEAN DEFAULT false,
  safety_issues       BOOLEAN DEFAULT false,
  materials_received  TEXT,
  equipment_used      TEXT,
  labour              JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MATERIALS ──────────────────────────────────────────────────
CREATE TABLE public.materials (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  spec             TEXT,
  qty_ordered      NUMERIC(10,2),
  qty_received     NUMERIC(10,2) DEFAULT 0,
  unit             TEXT,
  rate             NUMERIC(15,2),
  supplier         TEXT,
  vendor_contact   TEXT,
  po_number        TEXT,
  invoice_number   TEXT,
  delivery_eta     DATE,
  storage_location TEXT,
  warranty         TEXT,
  status           material_status NOT NULL DEFAULT 'Pending',
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── EXPENSES ───────────────────────────────────────────────────
CREATE TABLE public.expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  gst_amount      NUMERIC(15,2) DEFAULT 0,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT NOT NULL,
  paid_by         UUID REFERENCES public.users(id),
  vendor          TEXT,
  bill_ref        TEXT,
  payment_status  payment_status NOT NULL DEFAULT 'Pending',
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BOQ ────────────────────────────────────────────────────────
CREATE TABLE public.boq (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_number INTEGER,
  description TEXT NOT NULL,
  spec        TEXT,
  unit        TEXT,
  qty         NUMERIC(10,2),
  rate        NUMERIC(15,2),
  amount      NUMERIC(15,2) GENERATED ALWAYS AS (COALESCE(qty,0) * COALESCE(rate,0)) STORED,
  exec_qty    NUMERIC(10,2) DEFAULT 0,
  exec_value  NUMERIC(15,2) GENERATED ALWAYS AS (COALESCE(exec_qty,0) * COALESCE(rate,0)) STORED,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DOCUMENTS ──────────────────────────────────────────────────
CREATE TABLE public.documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  doc_number      TEXT,
  revision        TEXT,
  type            TEXT NOT NULL DEFAULT 'Other',
  approval_status doc_approval NOT NULL DEFAULT 'Draft',
  storage_path    TEXT,
  external_url    TEXT,
  notes           TEXT,
  uploaded_by     UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PHOTOS ─────────────────────────────────────────────────────
CREATE TABLE public.photos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  name         TEXT,
  category     TEXT DEFAULT 'General',
  photo_date   DATE DEFAULT CURRENT_DATE,
  uploaded_by  UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ACTIVITY LOG ───────────────────────────────────────────────
CREATE TABLE public.activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id),
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  details     JSONB DEFAULT '{}'::jsonb,
  device      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────────
CREATE INDEX idx_milestones_project    ON public.milestones(project_id);
CREATE INDEX idx_milestones_due        ON public.milestones(due_date) WHERE NOT done;
CREATE INDEX idx_daily_logs_project    ON public.daily_logs(project_id);
CREATE INDEX idx_daily_logs_date       ON public.daily_logs(log_date DESC);
CREATE INDEX idx_materials_project     ON public.materials(project_id);
CREATE INDEX idx_materials_status      ON public.materials(status);
CREATE INDEX idx_expenses_project      ON public.expenses(project_id);
CREATE INDEX idx_boq_project           ON public.boq(project_id);
CREATE INDEX idx_documents_project     ON public.documents(project_id);
CREATE INDEX idx_photos_project        ON public.photos(project_id);
CREATE INDEX idx_notifications_user    ON public.notifications(user_id, is_read);
CREATE INDEX idx_activity_created      ON public.activity_log(created_at DESC);

-- ── UPDATED_AT TRIGGER ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
  'projects','milestones','daily_logs','materials',
  'expenses','boq','documents','users'
]) LOOP
  EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
END LOOP; END $$;

-- ── AUTO-CREATE PROFILE ON AUTH SIGNUP ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'site_engineer')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log     ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS
$$ SELECT role FROM public.users WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION is_director()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS
$$ SELECT get_my_role() = 'director'; $$;

-- USERS
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (id = auth.uid() OR is_director());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "directors_all_users" ON public.users FOR ALL
  USING (is_director());

-- PROJECTS
CREATE POLICY "projects_select_all"   ON public.projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "projects_insert"       ON public.projects FOR INSERT WITH CHECK (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "projects_update"       ON public.projects FOR UPDATE USING (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "projects_delete"       ON public.projects FOR DELETE USING (is_director());

-- PROJECT MEMBERS
CREATE POLICY "pm_select" ON public.project_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pm_all_director" ON public.project_members FOR ALL USING (is_director());

-- MILESTONES
CREATE POLICY "ms_select" ON public.milestones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ms_insert" ON public.milestones FOR INSERT WITH CHECK (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "ms_update" ON public.milestones FOR UPDATE USING (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "ms_delete" ON public.milestones FOR DELETE USING (is_director());

-- DAILY LOGS
CREATE POLICY "dl_select" ON public.daily_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dl_insert" ON public.daily_logs FOR INSERT WITH CHECK (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "dl_update" ON public.daily_logs FOR UPDATE USING (logged_by = auth.uid() OR is_director());
CREATE POLICY "dl_delete" ON public.daily_logs FOR DELETE USING (is_director());

-- MATERIALS (site_engineer + director; NOT accountant)
CREATE POLICY "mat_select" ON public.materials FOR SELECT USING (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "mat_insert" ON public.materials FOR INSERT WITH CHECK (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "mat_update" ON public.materials FOR UPDATE USING (get_my_role() IN ('director','site_engineer'));
CREATE POLICY "mat_delete" ON public.materials FOR DELETE USING (is_director());

-- EXPENSES (director + accountant; NOT site_engineer)
CREATE POLICY "exp_select" ON public.expenses FOR SELECT USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "exp_insert" ON public.expenses FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "exp_update" ON public.expenses FOR UPDATE USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "exp_delete" ON public.expenses FOR DELETE USING (is_director());

-- BOQ
CREATE POLICY "boq_select" ON public.boq FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "boq_insert" ON public.boq FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "boq_update" ON public.boq FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "boq_delete" ON public.boq FOR DELETE USING (is_director());

-- DOCUMENTS
CREATE POLICY "doc_select" ON public.documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "doc_insert" ON public.documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "doc_update" ON public.documents FOR UPDATE USING (uploaded_by = auth.uid() OR is_director());
CREATE POLICY "doc_delete" ON public.documents FOR DELETE USING (is_director());

-- PHOTOS
CREATE POLICY "ph_select" ON public.photos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ph_insert" ON public.photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ph_delete" ON public.photos FOR DELETE USING (uploaded_by = auth.uid() OR is_director());

-- NOTIFICATIONS
CREATE POLICY "notif_select_own"   ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update_own"   ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_insert_all"   ON public.notifications FOR INSERT WITH CHECK (true);

-- ACTIVITY LOG
CREATE POLICY "al_select_directors" ON public.activity_log FOR SELECT USING (is_director());
CREATE POLICY "al_insert_all"       ON public.activity_log FOR INSERT WITH CHECK (true);

-- ── REALTIME ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- ── STORAGE BUCKETS ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('photos',    'photos',    false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf','image/jpeg','image/png']),
  ('avatars',   'avatars',   true,  2097152,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "photos_insert"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "photos_select"   ON storage.objects FOR SELECT USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "photos_delete"   ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "docs_insert"     ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "docs_select"     ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "docs_delete"     ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND is_director());
CREATE POLICY "avatars_select"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
