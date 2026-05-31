-- ========================================================
-- PIX RESCUE - Adicionar URL de Checkout no Cadastro de Produto
-- Execute este comando no SQL Editor do painel do Supabase
-- ========================================================

-- Adiciona a coluna checkout_url se ela não existir
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- Adiciona comentário explicativo à coluna para documentação
COMMENT ON COLUMN public.products.checkout_url IS 'Link da página de checkout externo do produto utilizado nas automações';
