import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatBrazilianPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '')
  if (!clean) return ''
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean
  }
  return clean
}

async function sendWhatsAppMessage(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  phone: string,
  text: string
) {
  const cleanPhone = formatBrazilianPhone(phone)
  if (!cleanPhone) {
    console.error('Invalid phone number:', phone)
    return false
  }

  const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: cleanPhone,
      options: { delay: 1200 },
      text: text,
    }),
  })

  return res.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar mensagens pendentes com joins
    const { data: pendingMessages, error } = await supabase
      .from('messages')
      .select(`
        id,
        created_at,
        flow_step_id,
        flow_steps (
          message,
          delay_minutes
        ),
        leads (
          id,
          name,
          phone,
          user_id
        )
      `)
      .eq('status', 'pending')

    if (error) throw error

    console.log(`Found ${pendingMessages?.length || 0} total pending messages in queue.`)

    const now = Date.now()
    let processedCount = 0

    if (pendingMessages && pendingMessages.length > 0) {
      for (const msg of pendingMessages) {
        const step = msg.flow_steps as any
        const lead = msg.leads as any
        
        if (!step || !lead) {
          console.warn(`Skipping message ${msg.id} due to missing relation data.`)
          continue
        }

        // Calcular se o tempo de atraso passou
        const msgCreatedAt = new Date(msg.created_at).getTime()
        const delayMs = step.delay_minutes * 60 * 1000
        const isDue = now >= (msgCreatedAt + delayMs)

        if (!isDue) {
          console.log(`Message ${msg.id} is not due yet. Scheduled in ${Math.round(((msgCreatedAt + delayMs) - now) / 1000)}s.`)
          continue
        }

        console.log(`Processing message ${msg.id} (Delay: ${step.delay_minutes}min) for lead: ${lead.phone}`)

        // Buscar dados da API Evolution do usuário
        const { data: profile } = await supabase
          .from('users_profile')
          .select('evolution_api_url, evolution_api_key')
          .eq('id', lead.user_id)
          .maybeSingle()

        // Buscar instância conectada
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('instance_name')
          .eq('user_id', lead.user_id)
          .eq('status', 'connected')
          .maybeSingle()

        if (!profile?.evolution_api_url || !instance?.instance_name) {
          console.error(`Skipping send for lead ${lead.id} due to missing API URL or instance configuration.`)
          continue
        }

        // Buscar dados adicionais do lead para placeholders (ex: produto, pix)
        const { data: lastEvent } = await supabase
          .from('events')
          .select('payload, products(product_name, checkout_url)')
          .eq('lead_id', lead.id)
          .in('event_type', ['pix_generated', 'boleto_generated'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const payload = lastEvent?.payload as any || {}
        const product = lastEvent?.products as any || {}
        const pixCode = payload.pix_code ?? payload.payment?.pix_qrcode ?? ''
        const checkoutUrl = product.checkout_url ?? payload.checkout_link ?? payload.checkout_url ?? ''
        const productName = product.product_name ?? ''

        // Renderizar a mensagem
        const vars = {
          nome: lead.name ?? 'cliente',
          produto: productName || 'produto',
          pix: pixCode || '00020101021226870014br.gov.bcb.pix2565qr.example.com/pix/test',
          link_checkout: checkoutUrl || 'https://pixrescue.com',
        }

        const renderMessage = (template: string, v: typeof vars) => {
          return template
            .replace(/{{nome}}/g, v.nome)
            .replace(/{{produto}}/g, v.produto)
            .replace(/{{pix}}/g, v.pix)
            .replace(/{{link_checkout}}/g, v.link_checkout)
            .replace(/{{checkout_url}}/g, v.link_checkout)
        }

        const renderedText = renderMessage(step.message, vars)

        // Enviar
        console.log(`Sending scheduled message ${msg.id} to ${lead.phone}`)
        const ok = await sendWhatsAppMessage(
          profile.evolution_api_url,
          profile.evolution_api_key ?? '',
          instance.instance_name,
          lead.phone,
          renderedText
        )

        // Atualizar status
        await supabase
          .from('messages')
          .update({
            status: ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            error_message: ok ? null : 'Falha Evolution API no agendamento',
          })
          .eq('id', msg.id)

        if (ok) {
          processedCount++
          console.log(`Message ${msg.id} processed and sent successfully.`)
        } else {
          console.error(`Message ${msg.id} failed to send.`)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Queue error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
