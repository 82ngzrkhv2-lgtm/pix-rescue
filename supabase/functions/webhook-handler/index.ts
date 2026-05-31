import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
}

// ─── Normalizar payload por plataforma ───────────────────────────────────────

function normalizeKiwify(body: any) {
  const status = body.order_status ?? body.status ?? ''
  const eventMap: Record<string, string> = {
    waiting_payment: 'pix_generated',
    paid: 'pix_paid',
    approved: 'purchase_approved',
    refunded: 'purchase_approved',
  }
  return {
    event_type: eventMap[status] ?? 'pix_generated',
    name: body.customer?.full_name ?? body.customer?.name ?? null,
    email: body.customer?.email ?? null,
    phone: body.customer?.mobile ?? body.customer?.phone ?? null,
    product_name: body.product?.name ?? null,
    external_product_id: body.product?.id ?? null,
    pix_code: body.payment?.pix_qrcode ?? null,
    checkout_url: body.checkout_url ?? null,
    revenue: parseFloat(body.order?.amount ?? '0') / 100,
    raw: body,
  }
}

function normalizeHotmart(body: any) {
  const event = body.event ?? ''
  const eventMap: Record<string, string> = {
    PURCHASE_BILLET_PRINTED: 'boleto_generated',
    PURCHASE_APPROVED: 'purchase_approved',
    PURCHASE_COMPLETE: 'purchase_approved',
    PURCHASE_CANCELED: 'pix_generated',
    PURCHASE_PROTEST: 'pix_generated',
  }
  const buyer = body.data?.buyer ?? {}
  const purchase = body.data?.purchase ?? {}
  const product = body.data?.product ?? {}
  return {
    event_type: eventMap[event] ?? 'pix_generated',
    name: buyer.name ?? null,
    email: buyer.email ?? null,
    phone: buyer.checkout_phone ?? null,
    product_name: product.name ?? null,
    external_product_id: String(product.id ?? ''),
    pix_code: purchase.payment?.pix_qrcode ?? null,
    checkout_url: null,
    revenue: parseFloat(purchase.price?.value ?? '0'),
    raw: body,
  }
}

function normalizeKirvano(body: any) {
  const status = body.status ?? body.payment_status ?? ''
  const eventMap: Record<string, string> = {
    pix_generated: 'pix_generated',
    pix_paid: 'pix_paid',
    approved: 'purchase_approved',
    boleto_generated: 'boleto_generated',
  }
  return {
    event_type: eventMap[status] ?? 'pix_generated',
    name: body.customer?.name ?? null,
    email: body.customer?.email ?? null,
    phone: body.customer?.phone ?? null,
    product_name: body.product?.name ?? null,
    external_product_id: body.product?.id ?? null,
    pix_code: body.pix?.qrcode ?? null,
    checkout_url: body.checkout_url ?? null,
    revenue: parseFloat(body.amount ?? '0'),
    raw: body,
  }
}

const normalizers: Record<string, (b: any) => any> = {
  kiwify: normalizeKiwify,
  hotmart: normalizeHotmart,
  kirvano: normalizeKirvano,
}

// ─── Enviar mensagem via Evolution API ───────────────────────────────────────

async function sendWhatsAppMessage(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  phone: string,
  text: string
) {
  const cleanPhone = phone.replace(/\D/g, '')
  const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: cleanPhone,
      options: { delay: 1200 },
      textMessage: { text },
    }),
  })
  return res.ok
}

// ─── Substituir variáveis na mensagem ────────────────────────────────────────

function renderMessage(template: string, vars: Record<string, string>) {
  return template
    .replace(/{{nome}}/g, vars.nome ?? '')
    .replace(/{{produto}}/g, vars.produto ?? '')
    .replace(/{{pix}}/g, vars.pix ?? '')
    .replace(/{{link_checkout}}/g, vars.link_checkout ?? '')
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const platform = url.searchParams.get('platform') as string
    const token = req.headers.get('x-webhook-token') ?? url.searchParams.get('token') ?? ''

    if (!['kiwify', 'hotmart', 'kirvano'].includes(platform)) {
      return new Response(JSON.stringify({ error: 'Plataforma inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()

    // Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Validar token da integração
    const { data: integration } = await supabase
      .from('integrations')
      .select('user_id, webhook_token')
      .eq('platform', platform)
      .eq('webhook_token', token)
      .single()

    if (!integration) {
      // Token inválido — mas retornamos 200 para não expor a falha
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = integration.user_id

    // 2. Normalizar payload
    const normalizer = normalizers[platform]
    const normalized = normalizer(body)
    const { event_type, name, email, phone, product_name, external_product_id, pix_code, checkout_url, revenue, raw } = normalized

    if (!phone) {
      return new Response(JSON.stringify({ received: true, warning: 'Sem telefone no payload' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Upsert lead
    const { data: lead } = await supabase
      .from('leads')
      .upsert({ user_id: userId, phone, name, email }, { onConflict: 'user_id,phone' })
      .select()
      .single()

    // 4. Upsert produto
    let productId: string | null = null
    if (product_name) {
      const { data: product } = await supabase
        .from('products')
        .upsert({
          user_id: userId,
          product_name,
          external_product_id: external_product_id ?? '',
          platform,
        }, { onConflict: 'user_id,external_product_id' })
        .select()
        .single()
      productId = product?.id ?? null
    }

    // 5. Salvar evento
    await supabase.from('events').insert({
      user_id: userId,
      lead_id: lead?.id ?? null,
      product_id: productId,
      event_type,
      platform,
      payload: raw,
      revenue: event_type === 'pix_paid' || event_type === 'purchase_approved' ? revenue : 0,
    })

    // 6. Lógica de automação

    if (event_type === 'pix_paid' || event_type === 'purchase_approved') {
      // Cancelar fluxo pendente — apenas registra (implementação futura com job scheduler)
      // Enviar mensagem de confirmação
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, status')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .single()

      const { data: profile } = await supabase
        .from('users_profile')
        .select('evolution_api_url, evolution_api_key')
        .eq('id', userId)
        .single()

      if (instance && profile?.evolution_api_url && phone) {
        const msg = event_type === 'purchase_approved'
          ? `✅ Pagamento confirmado, ${name ?? 'cliente'}! Seu acesso ao *${product_name ?? 'produto'}* foi liberado. Obrigado pela compra! 🎉`
          : `✅ PIX confirmado! Seu acesso ao *${product_name ?? 'produto'}* está sendo liberado. Obrigado, ${name ?? 'cliente'}! 🚀`

        await sendWhatsAppMessage(
          profile.evolution_api_url,
          profile.evolution_api_key ?? '',
          instance.instance_name,
          phone,
          msg
        )
      }
    }

    if (event_type === 'pix_generated' || event_type === 'boleto_generated') {
      // Buscar fluxo ativo do usuário
      const { data: activeFlow } = await supabase
        .from('flows')
        .select('id, flow_steps(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (activeFlow?.flow_steps?.length) {
        const steps = (activeFlow.flow_steps as any[]).sort((a, b) => a.step_order - b.step_order)
        const vars = {
          nome: name ?? 'cliente',
          produto: product_name ?? 'produto',
          pix: pix_code ?? '',
          link_checkout: checkout_url ?? '',
        }

        // Buscar instância e credenciais
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('instance_name')
          .eq('user_id', userId)
          .eq('status', 'connected')
          .single()

        const { data: profile } = await supabase
          .from('users_profile')
          .select('evolution_api_url, evolution_api_key')
          .eq('id', userId)
          .single()

        if (instance && profile?.evolution_api_url && lead?.id) {
          for (const step of steps) {
            if (!step.active) continue

            // Registrar mensagem como pendente
            await supabase.from('messages').insert({
              lead_id: lead.id,
              flow_step_id: step.id,
              status: 'pending',
            })

            // Disparar após delay (Edge Functions não têm sleep longo — aqui simula o 1º disparo imediato)
            // Para delays reais, usar Supabase pg_cron ou Deno.cron
            if (step.delay_minutes === 0) {
              const rendered = renderMessage(step.message, vars)
              const ok = await sendWhatsAppMessage(
                profile.evolution_api_url,
                profile.evolution_api_key ?? '',
                instance.instance_name,
                phone,
                rendered
              )
              await supabase.from('messages').update({
                status: ok ? 'sent' : 'failed',
                sent_at: new Date().toISOString(),
              }).eq('lead_id', lead.id).eq('flow_step_id', step.id)
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true, event: event_type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
