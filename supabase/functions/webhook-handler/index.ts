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

  // Real Kiwify payloads use capitalized keys: Customer, Product.
  // Mock/Simulated payloads might use lowercase keys.
  const customer = body.Customer ?? body.customer ?? {}
  const product = body.Product ?? body.product ?? {}
  const payment = body.payment ?? {}
  const commissions = body.Commissions ?? {}
  const order = body.order ?? {}

  return {
    event_type: eventMap[status] ?? 'pix_generated',
    name: customer.full_name ?? customer.name ?? null,
    email: customer.email ?? null,
    phone: customer.mobile ?? customer.phone ?? null,
    product_name: product.product_name ?? product.name ?? null,
    external_product_id: product.product_id ?? product.id ?? null,
    pix_code: body.pix_code ?? payment.pix_qrcode ?? null,
    checkout_url: body.checkout_link ?? body.checkout_url ?? null,
    revenue: parseFloat(commissions.charge_amount ?? order.amount ?? '0') / 100,
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
    console.error('Invalid phone number provided:', phone)
    return false
  }

  console.log(`Sending WhatsApp message to ${cleanPhone} using instance ${instanceName}`)

  const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: cleanPhone,
      options: { delay: 1200 },
      text: text,
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error(`Failed to send WhatsApp. Status: ${res.status}. Error:`, JSON.stringify(errBody))
  } else {
    console.log(`WhatsApp message sent successfully to ${cleanPhone}`)
  }

  return res.ok
}

// ─── Substituir variáveis na mensagem ────────────────────────────────────────

function renderMessage(template: string, vars: Record<string, string>) {
  return template
    .replace(/{{nome}}/g, vars.nome ?? '')
    .replace(/{{produto}}/g, vars.produto ?? '')
    .replace(/{{pix}}/g, vars.pix ?? '')
    .replace(/{{link_checkout}}/g, vars.link_checkout ?? '')
    .replace(/{{checkout_url}}/g, vars.link_checkout ?? '')
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

    // REGISTRAR LOG DE WEBHOOK BRUTO IMEDIATAMENTE (COM USER_ID PADRÃO PARA DEBUG OPERACIONAL)
    const debugUserId = "b89e217e-e536-48d2-9960-a0ffe7624e8a"
    const { error: dbgErr } = await supabase.from('events').insert({
      user_id: debugUserId,
      event_type: 'webhook_received',
      platform: platform ?? 'desconhecido',
      payload: {
        debug_token: token,
        debug_platform: platform,
        raw_body: body,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries())
      },
      revenue: 0
    })

    if (dbgErr) {
      console.error('ERRO DE BANCO NO DEBUG INSERT:', dbgErr)
      throw new Error(`Erro ao salvar debug do webhook: ${dbgErr.message} (Code: ${dbgErr.code})`)
    }

    // 1. Validar token da integração
    const { data: integration, error: intErr } = await supabase
      .from('integrations')
      .select('user_id, webhook_token')
      .eq('platform', platform)
      .eq('webhook_token', token)
      .maybeSingle()

    if (intErr) {
      console.error('Erro de banco de dados ao buscar integração:', intErr)
      throw new Error(`Erro ao buscar integração: ${intErr.message}`)
    }

    if (!integration) {
      // Token inválido — mas retornamos 200 para não expor a falha
      console.warn(`[Aviso] Token de integração inválido ou não encontrado para plataforma ${platform} e token ${token}`)
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = integration.user_id

    // REGISTRAR WEBHOOK BRUTO PARA DEBUG (Garante visibilidade de payloads recebidos)
    await supabase.from('events').insert({
      user_id: userId,
      event_type: 'webhook_received',
      platform,
      payload: body,
      revenue: 0
    })

    // 2. Normalizar payload
    const normalizer = normalizers[platform]
    const normalized = normalizer(body)
    const { event_type, name, email, phone: rawPhone, product_name, external_product_id, pix_code, checkout_url, revenue, raw } = normalized
    const phone = rawPhone ? formatBrazilianPhone(rawPhone) : ''

    if (!phone) {
      return new Response(JSON.stringify({ received: true, warning: 'Sem telefone válido no payload' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Upsert lead de forma segura (evita erro de constraint 42P10)
    let lead = null
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', phone)
      .maybeSingle()

    if (existingLead) {
      const { data: updatedLead } = await supabase
        .from('leads')
        .update({ name, email })
        .eq('id', existingLead.id)
        .select()
        .maybeSingle()
      lead = updatedLead
    } else {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({ user_id: userId, phone, name, email })
        .select()
        .maybeSingle()
      lead = newLead
    }

    // 4. Upsert produto de forma segura (evita erro de constraint 42P10)
    let productId: string | null = null
    let dbProduct: any = null
    if (product_name) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('external_product_id', external_product_id ?? '')
        .maybeSingle()

      if (existingProduct) {
        productId = existingProduct.id
        dbProduct = existingProduct
        await supabase
          .from('products')
          .update({ product_name, platform })
          .eq('id', existingProduct.id)
      } else {
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            user_id: userId,
            product_name,
            external_product_id: external_product_id ?? '',
            platform,
          })
          .select()
          .maybeSingle()
        productId = newProduct?.id ?? null
        dbProduct = newProduct
      }
    }

    // 5. Salvar evento
    const { data: insertedEvent } = await supabase.from('events').insert({
      user_id: userId,
      lead_id: lead?.id ?? null,
      product_id: productId,
      event_type,
      platform,
      payload: raw,
      revenue: event_type === 'pix_paid' || event_type === 'purchase_approved' ? revenue : 0,
    }).select('id').maybeSingle()

    // 6. Lógica de automação

    if (event_type === 'pix_paid' || event_type === 'purchase_approved') {
      // Cancelar futuras mensagens de recuperação pendentes para este lead
      if (lead?.id) {
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_message: 'Compra finalizada (fluxo interrompido)'
          })
          .eq('lead_id', lead.id)
          .eq('status', 'pending')
      }

      // Enviar mensagem de confirmação
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, status')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .maybeSingle()

      const { data: profile } = await supabase
        .from('users_profile')
        .select('evolution_api_url, evolution_api_key')
        .eq('id', userId)
        .maybeSingle()

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

    const isTest = body.is_test === true
    const nameLower = (name ?? '').toLowerCase()
    const emailLower = (email ?? '').toLowerCase()
    const isValidationTest = isTest || nameLower.includes('teste') || emailLower.includes('test')

    if (event_type === 'pix_generated' || event_type === 'boleto_generated') {
      // 1. Evitar spam de múltiplos PIX para o mesmo lead em curto período (apenas em produção, ignorando testes manuais)
      if (!isValidationTest && lead?.id) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        
        // Verificar se houve outro evento do mesmo tipo nos últimos 5 minutos (excluindo o atual)
        let query = supabase
          .from('events')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('event_type', event_type)
          .gte('created_at', fiveMinutesAgo)

        if (insertedEvent?.id) {
          query = query.neq('id', insertedEvent.id)
        }

        const { data: recentEvents } = await query.limit(1)

        // Verificar se já possui alguma mensagem pendente na fila
        const { data: pendingMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('status', 'pending')
          .limit(1)

        if ((recentEvents && recentEvents.length > 0) || (pendingMessages && pendingMessages.length > 0)) {
          console.log(`[Anti-Spam] Ignorando automação repetida para o lead: ${lead.id}`)
          return new Response(JSON.stringify({ received: true, ignored: true, reason: 'anti-spam' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Buscar fluxo ativo do usuário (limita a 1 para evitar falha se houver duplicados)
      const { data: activeFlows } = await supabase
        .from('flows')
        .select('id, flow_steps(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)

      const activeFlow = activeFlows && activeFlows.length > 0 ? activeFlows[0] : null

      // Buscar instância e credenciais
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .maybeSingle()

      const { data: profile } = await supabase
        .from('users_profile')
        .select('evolution_api_url, evolution_api_key')
        .eq('id', userId)
        .maybeSingle()

      const vars = {
        nome: name ?? 'cliente',
        produto: product_name ?? 'produto',
        pix: pix_code ?? '00020101021226870014br.gov.bcb.pix2565qr.example.com/pix/test',
        link_checkout: dbProduct?.checkout_url ?? checkout_url ?? 'https://pixrescue.com',
      }

      if (instance && profile?.evolution_api_url && lead?.id) {
        let sentAny = false

        const sendMessageWithSplit = async (templateText: string, isDefault = false) => {
          const hasPixPlaceholder = templateText.includes('{{pix}}');
          
          if (hasPixPlaceholder || isDefault) {
            // Mensagem 1
            let msg1Text = '';
            if (isDefault) {
              msg1Text = `Olá ${vars.nome} 👋\n\nPercebemos que sua compra de ${vars.produto} ainda não foi finalizada.\n\nPara concluir seu pagamento de forma rápida, clique no link abaixo:\n${vars.link_checkout}\n\nCaso prefira utilizar o PIX Copia e Cola, ele será enviado na próxima mensagem.`;
            } else {
              const msg1Template = templateText.replace(/{{pix}}/g, 'Caso prefira utilizar o PIX Copia e Cola, ele será enviado na próxima mensagem.');
              msg1Text = renderMessage(msg1Template, vars);
            }
            
            const ok1 = await sendWhatsAppMessage(
              profile.evolution_api_url,
              profile.evolution_api_key ?? '',
              instance.instance_name,
              phone,
              msg1Text
            );
            let finalSuccess = ok1;
            
            // Mensagem 2 (Apenas o código PIX limpo)
            if (vars.pix && vars.pix.trim() !== '') {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const ok2 = await sendWhatsAppMessage(
                profile.evolution_api_url,
                profile.evolution_api_key ?? '',
                instance.instance_name,
                phone,
                vars.pix.trim()
              );
              finalSuccess = ok1 && ok2;
            }
            
            return finalSuccess;
          } else {
            const rendered = renderMessage(templateText, vars);
            return await sendWhatsAppMessage(
              profile.evolution_api_url,
              profile.evolution_api_key ?? '',
              instance.instance_name,
              phone,
              rendered
            );
          }
        }

        if (activeFlow?.flow_steps?.length) {
          const steps = (activeFlow.flow_steps as any[]).sort((a, b) => a.step_order - b.step_order)
          
          for (const step of steps) {
            if (!step.active) continue

            // Registrar mensagem como pendente
            const { data: msgObj } = await supabase.from('messages').insert({
              lead_id: lead.id,
              flow_step_id: step.id,
              status: 'pending',
            }).select().single()

            // Disparar após delay (se for teste, dispara a primeira ativa imediatamente!)
            if (step.delay_minutes === 0 || (isValidationTest && !sentAny)) {
              const ok = await sendMessageWithSplit(step.message)
              if (msgObj?.id) {
                await supabase.from('messages').update({
                  status: ok ? 'sent' : 'failed',
                  sent_at: new Date().toISOString(),
                }).eq('id', msgObj.id)
              }
              
              if (isValidationTest) {
                sentAny = true
                break // apenas um disparo no teste
              }
            }
          }
        }

        // Se for teste e não enviou nada porque não tem passos ativos ou fluxo ativo, enviar o padrão
        if (isValidationTest && !sentAny) {
          const ok = await sendMessageWithSplit('', true)

          await supabase.from('messages').insert({
            lead_id: lead.id,
            status: ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            error_message: ok ? null : 'Falha Evolution API',
          })
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
