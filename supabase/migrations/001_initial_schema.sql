-- ============================================
-- PIX RESCUE - Schema completo do banco de dados
-- Execute no Supabase SQL Editor
-- ============================================

-- ==========================================
-- 1. Perfis de usuário (extensão do auth.users)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'Starter',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  evolution_api_url TEXT,
  evolution_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
CREATE POLICY "Users can view own profile" ON public.users_profile
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
CREATE POLICY "Users can update own profile" ON public.users_profile
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
CREATE POLICY "Users can insert own profile" ON public.users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 2. Instâncias WhatsApp
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  instance_name TEXT NOT NULL,
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Users manage own whatsapp instances" ON public.whatsapp_instances
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 3. Integrações de plataformas
-- ==========================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('kiwify', 'hotmart', 'kirvano')),
  webhook_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own integrations" ON public.integrations;
CREATE POLICY "Users manage own integrations" ON public.integrations
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 4. Produtos
-- ==========================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  external_product_id TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('kiwify', 'hotmart', 'kirvano')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own products" ON public.products;
CREATE POLICY "Users manage own products" ON public.products
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 5. Leads
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own leads" ON public.leads;
CREATE POLICY "Users manage own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 6. Eventos (webhooks recebidos)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pix_generated', 'pix_paid', 'boleto_generated', 'purchase_approved')),
  platform TEXT NOT NULL CHECK (platform IN ('kiwify', 'hotmart', 'kirvano')),
  payload JSONB NOT NULL DEFAULT '{}',
  revenue NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own events" ON public.events;
CREATE POLICY "Users view own events" ON public.events
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 7. Fluxos de automação
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own flows" ON public.flows;
CREATE POLICY "Users manage own flows" ON public.flows
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 8. Etapas dos fluxos
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  delay_minutes INTEGER NOT NULL,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  step_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage flow steps via flow" ON public.flow_steps;
CREATE POLICY "Users manage flow steps via flow" ON public.flow_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_id AND f.user_id = auth.uid()
    )
  );

-- ==========================================
-- 9. Mensagens enviadas
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  flow_step_id UUID REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own messages" ON public.messages;
CREATE POLICY "Users view own messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id AND l.user_id = auth.uid()
    )
  );

-- ==========================================
-- 10. Índices de performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_events_user_type ON public.events(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_lead ON public.events(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON public.messages(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_flow_steps_flow ON public.flow_steps(flow_id, step_order);

SELECT 'Schema criado com sucesso! ✅' AS status;


-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 2. Instâncias WhatsApp
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  instance_name TEXT NOT NULL,
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own whatsapp instances" ON public.whatsapp_instances
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 3. Integrações de plataformas
-- ==========================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('kiwify', 'hotmart', 'kirvano')),
  webhook_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations" ON public.integrations
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 4. Produtos
-- ==========================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  external_product_id TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('kiwify', 'hotmart', 'kirvano')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products" ON public.products
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 5. Leads
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 6. Eventos (webhooks recebidos)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pix_generated', 'pix_paid', 'boleto_generated', 'purchase_approved')),
  platform TEXT NOT NULL CHECK (platform IN ('kiwify', 'hotmart', 'kirvano')),
  payload JSONB NOT NULL DEFAULT '{}',
  revenue NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own events" ON public.events
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 7. Fluxos de automação
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flows" ON public.flows
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 8. Etapas dos fluxos
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  delay_minutes INTEGER NOT NULL,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  step_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage flow steps via flow" ON public.flow_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_id AND f.user_id = auth.uid()
    )
  );

-- ==========================================
-- 9. Mensagens enviadas
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  flow_step_id UUID REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id AND l.user_id = auth.uid()
    )
  );

-- ==========================================
-- 10. Índices de performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_events_user_type ON public.events(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_lead ON public.events(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON public.messages(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_flow_steps_flow ON public.flow_steps(flow_id, step_order);
