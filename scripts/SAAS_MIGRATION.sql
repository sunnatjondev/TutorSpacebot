-- 1. Create Subscription Plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  price_uzs INTEGER NOT NULL DEFAULT 0,
  max_groups INTEGER,
  max_students INTEGER,
  trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'expired', 'cancelled'
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id)
);

-- 3. Create Billing Transactions table (for Click)
CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  click_trans_id BIGINT UNIQUE,
  click_paydoc_id BIGINT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'preparing', 'paid', 'cancelled', 'error'
  merchant_prepare_id TEXT,
  error_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 4. Add Subscription column to Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none';

-- 5. Insert default plans
INSERT INTO subscription_plans (slug, name_uz, name_ru, price_uzs, max_groups, max_students, trial_days)
VALUES
  ('trial', 'Sinov', 'Пробный', 0, 4, 40, 14),
  ('solo', 'Start', 'Start', 89000, 4, 40, 0),
  ('pro', 'Pro', 'Pro', 189000, 12, 120, 0),
  ('center', 'Center', 'Center', 390000, NULL, NULL, 0)
ON CONFLICT (slug) DO UPDATE SET
  name_uz = EXCLUDED.name_uz,
  name_ru = EXCLUDED.name_ru,
  price_uzs = EXCLUDED.price_uzs,
  max_groups = EXCLUDED.max_groups,
  max_students = EXCLUDED.max_students,
  trial_days = EXCLUDED.trial_days,
  is_active = true;

-- 6. RLS Policies for new tables

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active plans" ON subscription_plans FOR SELECT TO authenticated USING (is_active = true);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher can read own subscription" ON subscriptions FOR SELECT TO authenticated USING (teacher_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'telegram_id')::bigint LIMIT 1));

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher can read own transactions" ON billing_transactions FOR SELECT TO authenticated USING (teacher_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'telegram_id')::bigint LIMIT 1));
CREATE POLICY "Teacher can insert pending transactions" ON billing_transactions FOR INSERT TO authenticated WITH CHECK (teacher_id = (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'telegram_id')::bigint LIMIT 1) AND status = 'pending');

