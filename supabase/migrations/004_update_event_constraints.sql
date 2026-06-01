-- Migration: 004_update_event_constraints
-- Objetivo: Relaxar/atualizar restrições CHECK da tabela events para permitir registrar logs de webhooks brutos (webhook_received) e origens desconhecidas.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check CHECK (event_type = ANY (ARRAY['pix_generated'::text, 'pix_paid'::text, 'boleto_generated'::text, 'purchase_approved'::text, 'webhook_received'::text]));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_platform_check;
ALTER TABLE public.events ADD CONSTRAINT events_platform_check CHECK (platform = ANY (ARRAY['kiwify'::text, 'hotmart'::text, 'kirvano'::text, 'desconhecido'::text]));
