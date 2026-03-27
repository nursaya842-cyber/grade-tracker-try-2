-- ============================================
-- Phase 2: RLS + Auth trigger + Audit log RLS
-- ============================================

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON users FOR ALL
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
CREATE POLICY "Users read own row" ON users FOR SELECT
  USING (id = auth.uid() AND deleted_at IS NULL);

-- Audit log RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit_log" ON audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Auth trigger: auto-create public.users row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'role'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
