import { useState, useEffect } from 'react'
import { Clock, Save, Loader2, CheckCircle, Info } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface FlowStep {
  id: string
  delay: string
  delayMinutes: number
  message: string
  active: boolean
  stepOrder: number
}

interface FlowConfig {
  id: string
  dbId: string | null
  name: string
  description: string
  color: string
  badge: string
  steps: FlowStep[]
  active: boolean
}

const VARIABLES = ['{{nome}}', '{{produto}}', '{{pix}}', '{{link_checkout}}']
const EMOJIS = ['🔔', '💰', '⚡', '✅', '🚀', '💬', '🎯', '👋', '🙏', '⏰', '💳', '📲']

const DEFAULT_FLOWS: Omit<FlowConfig, 'dbId'>[] = [
  {
    id: 'rapida', name: 'Recuperação Rápida', description: 'Ideal para PIX com urgência. Janelas muito curtas.', color: '#10b981', badge: '⚡ Alta Conversão', active: true,
    steps: [
      { id: 'r1', delay: '5 minutos', delayMinutes: 5, active: true, stepOrder: 0, message: 'Oi {{nome}}! 👋 Vi que você gerou um PIX para adquirir o *{{produto}}* mas ainda não finalizou. O seu código PIX copia e cola ainda está válido! Copie e pague no seu banco:\n\n{{pix}}\n\nQualquer dúvida, me chama!' },
      { id: 'r2', delay: '30 minutos', delayMinutes: 30, active: true, stepOrder: 1, message: '{{nome}}, ainda dá tempo! ⏰\n\nSua vaga no *{{produto}}* está garantida temporariamente. Pague o PIX para garantir:\n\n👉 {{link_checkout}}\n\nPrecisa de ajuda com o pagamento?' },
      { id: 'r3', delay: '2 horas', delayMinutes: 120, active: true, stepOrder: 2, message: 'Última chance, {{nome}}! 🚨\n\nSeu acesso ao *{{produto}}* expira em instantes. Garanta agora no link abaixo:\n\n👉 {{link_checkout}}\n\nAbraço e nos vemos lá!' },
    ],
  },
  {
    id: 'moderada', name: 'Recuperação Moderada', description: 'Equilíbrio ideal entre conversão e respeito ao lead.', color: '#6366f1', badge: '🎯 Recomendado', active: false,
    steps: [
      { id: 'm1', delay: '30 minutos', delayMinutes: 30, active: true, stepOrder: 0, message: 'Oi {{nome}}! 👋 Notei que seu pagamento do *{{produto}}* ficou pendente.\n\nSeu código PIX:\n{{pix}}\n\nAinda está válido! Cole no seu app do banco 📲' },
      { id: 'm2', delay: '6 horas', delayMinutes: 360, active: true, stepOrder: 1, message: '{{nome}}, tudo bem? 😊\n\nSó passando para lembrar que sua vaga no *{{produto}}* ainda está disponível!\n\n👉 {{link_checkout}}' },
      { id: 'm3', delay: '24 horas', delayMinutes: 1440, active: true, stepOrder: 2, message: 'Oi {{nome}}! Última mensagem, prometo 🙏\n\nSe ainda tiver interesse no *{{produto}}*, aqui está o link:\n👉 {{link_checkout}}\n\nFoi um prazer! Qualquer coisa, é só chamar.' },
    ],
  },
  {
    id: 'longa', name: 'Recuperação Longa', description: 'Para produtos de maior valor. Follow-up estratégico.', color: '#3b82f6', badge: '💎 Foco em LTV', active: false,
    steps: [
      { id: 'l1', delay: '2 horas', delayMinutes: 120, active: true, stepOrder: 0, message: 'Olá {{nome}}! 👋\n\nVi que você demonstrou interesse no *{{produto}}*. Ainda está pensando?\n\nSe tiver alguma dúvida, pode perguntar aqui mesmo! Estou à disposição 😊' },
      { id: 'l2', delay: '24 horas', delayMinutes: 1440, active: true, stepOrder: 1, message: '{{nome}}, boa tarde! ☀️\n\nQueria saber se você teve a chance de pensar sobre o *{{produto}}*.\n\nTenho certeza que vai transformar seus resultados. Posso te ajudar com algo?\n\n👉 {{link_checkout}}' },
      { id: 'l3', delay: '48 horas', delayMinutes: 2880, active: true, stepOrder: 2, message: 'Oi {{nome}}! Passando um último recado 🙏\n\nO *{{produto}}* continua disponível para você. Mas as vagas são limitadas!\n\nSe quiser garantir a sua: {{link_checkout}}\n\nGrande abraço! 🚀' },
    ],
  },
]

export default function Flows() {
  const { user } = useAuth()
  const [flows, setFlows] = useState<FlowConfig[]>(DEFAULT_FLOWS.map(f => ({ ...f, dbId: null })))
  
  // Selection of currently edited flow
  const [activeFlowId, setActiveFlowId] = useState<string>('moderada')
  
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Load flows from Supabase
  useEffect(() => {
    if (!user) return
    loadFlows()
  }, [user])

  const loadFlows = async () => {
    const { data } = await supabase
      .from('flows')
      .select('id, name, status, flow_steps(*)')
      .eq('user_id', user!.id)
      .order('created_at')

    if (!data?.length) return

    setFlows(prev => prev.map(localFlow => {
      const dbFlow = data.find(d => d.name === localFlow.name)
      if (!dbFlow) return localFlow
      const dbSteps = (dbFlow.flow_steps as any[] ?? []).sort((a, b) => a.step_order - b.step_order)
      
      // If we loaded a flow that is active in DB, set it as the active editing flow
      if (dbFlow.status === 'active') {
        setActiveFlowId(localFlow.id)
      }

      return {
        ...localFlow,
        dbId: dbFlow.id,
        active: dbFlow.status === 'active',
        steps: localFlow.steps.map((s, i) => {
          const dbStep = dbSteps[i]
          return dbStep ? { ...s, message: dbStep.message, active: dbStep.active, delay: formatMinutesToDelay(dbStep.delay_minutes), delayMinutes: dbStep.delay_minutes } : s
        }),
      }
    }))
  }

  const formatMinutesToDelay = (min: number) => {
    if (min === 5) return '5 minutos'
    if (min === 30) return '30 minutos'
    if (min === 60) return '1 hora'
    if (min === 120) return '2 horas'
    if (min === 360) return '6 horas'
    if (min === 1440) return '24 horas'
    if (min === 2880) return '48 horas'
    if (min === 4320) return '72 horas'
    return `${min} min`
  }

  const saveFlow = async (flow: FlowConfig) => {
    if (!user) return
    setSavingId(flow.id)

    try {
      let flowDbId = flow.dbId

      // Upsert flow
      if (!flowDbId) {
        const { data } = await supabase
          .from('flows')
          .insert({ user_id: user.id, name: flow.name, status: flow.active ? 'active' : 'inactive' })
          .select()
          .single()
        flowDbId = data?.id ?? null
      } else {
        await supabase.from('flows')
          .update({ status: flow.active ? 'active' : 'inactive' })
          .eq('id', flowDbId)
      }

      if (!flowDbId) throw new Error('Falha ao salvar fluxo')

      // Deleta etapas anteriores de forma segura (evita erro de constraint no upsert)
      await supabase.from('flow_steps')
        .delete()
        .eq('flow_id', flowDbId)

      // Insere as novas etapas
      const stepsToInsert = flow.steps.map(step => ({
        flow_id: flowDbId,
        delay_minutes: step.delayMinutes,
        message: step.message,
        active: step.active,
        step_order: step.stepOrder,
      }))

      const { error: stepsErr } = await supabase
        .from('flow_steps')
        .insert(stepsToInsert)

      if (stepsErr) throw stepsErr

      // If active, deactivate other flows
      if (flow.active) {
        await supabase.from('flows')
          .update({ status: 'inactive' })
          .eq('user_id', user.id)
          .neq('id', flowDbId)
      }

      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, dbId: flowDbId, active: flow.active } : flow.active ? { ...f, active: false } : f))
      showToast(`✅ Fluxo "${flow.name}" salvo com sucesso!`)
    } catch (err: any) {
      showToast(`❌ Erro ao salvar: ${err.message}`)
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleFlow = async (id: string) => {
    // Enable this flow and disable others
    setFlows(prev => prev.map(f => {
      const isTarget = f.id === id
      const updated = { ...f, active: isTarget ? !f.active : false }
      // Trigger save in background
      if (isTarget) {
        setTimeout(() => saveFlow(updated), 100)
      }
      return updated
    }))
  }

  const selectedFlow = flows.find(f => f.id === activeFlowId) ?? flows[0]

  return (
    <AppLayout title="Estratégias de Recuperação" subtitle="Escolha e configure a sequência de lembretes automáticos">
      <div className="space-y-6 animate-fade-in">
        
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 card px-5 py-3 flex items-center gap-3 animate-fade-in"
            style={{
              border: toast.startsWith('✅') ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-lg)'
            }}>
            <CheckCircle size={16} style={{ color: toast.startsWith('✅') ? 'var(--green)' : '#ef4444' }} />
            <span className="text-sm font-semibold text-slate-800">{toast}</span>
          </div>
        )}

        {/* Split view (Fidelidade ao UI Designer: TELA 5) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          
          {/* Left Column: 3 Strategy Cards (40% width / 2 cols on md) */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estratégias Disponíveis</h3>
            
            {flows.map(flow => {
              const isSelected = flow.id === activeFlowId
              
              return (
                <div
                  key={flow.id}
                  onClick={() => setActiveFlowId(flow.id)}
                  className="card card-hover"
                  style={{
                    padding: 20,
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--indigo)' : flow.active ? 'var(--green)' : 'var(--border)',
                    background: isSelected ? 'var(--bg-hover)' : '#ffffff',
                    borderWidth: isSelected ? '2px' : '1px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span className="font-outfit font-extrabold text-sm text-slate-800 block">{flow.name}</span>
                      <span className="badge badge-purple text-[10px] mt-1">{flow.badge}</span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFlow(flow.id)
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {flow.active ? (
                        <span className="badge badge-green text-[10px] uppercase font-bold">ATIVA</span>
                      ) : (
                        <span className="badge badge-gray text-[10px] uppercase font-semibold">INATIVA</span>
                      )}
                    </button>
                  </div>

                  {/* Summary of delays */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Intervalos: {flow.steps.map(s => s.delay).join(' / ')}
                    </span>
                  </div>
                </div>
              )
            })}

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start'
            }}>
              <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                Dica: O fluxo <strong>Recomendado</strong> possui janelas otimizadas para balancear conversões com a melhor experiência de atendimento do WhatsApp.
              </p>
            </div>
          </div>

          {/* Right Column: Personalizer Panel (60% width / 3 cols on md) */}
          <div className="md:col-span-3 card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Personalizar Estratégia
                </h3>
                <span className="text-xs text-slate-400 font-semibold block mt-0.5">{selectedFlow.name}</span>
              </div>
              
              <button
                onClick={() => saveFlow(selectedFlow)}
                disabled={savingId === selectedFlow.id}
                className="btn btn-primary btn-sm font-semibold"
              >
                {savingId === selectedFlow.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar Alterações
              </button>
            </div>

            {/* Steps loop */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {selectedFlow.steps.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="label" style={{ marginBottom: 0 }}>Mensagem {idx + 1}</label>
                    
                    {/* Time delay dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} className="text-slate-400" />
                      <select
                        value={step.delayMinutes}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const updatedSteps = selectedFlow.steps.map(s => s.id === step.id ? {
                            ...s,
                            delayMinutes: val,
                            delay: formatMinutesToDelay(val)
                          } : s)
                          setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, steps: updatedSteps } : f))
                        }}
                        className="input-field py-1 px-2 text-xs"
                        style={{ width: 'auto', background: 'transparent', border: 'none', fontWeight: 600, color: 'var(--text-secondary)' }}
                      >
                        <option value={5}>5 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={120}>2 horas</option>
                        <option value={360}>6 horas</option>
                        <option value={1440}>24 horas</option>
                        <option value={2880}>48 horas</option>
                        <option value={4320}>72 horas</option>
                      </select>
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={step.message}
                    onChange={(e) => {
                      const updatedSteps = selectedFlow.steps.map(s => s.id === step.id ? { ...s, message: e.target.value } : s)
                      setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, steps: updatedSteps } : f))
                    }}
                    className="input-field font-sans"
                    rows={4}
                    style={{ fontSize: 13, lineHeight: 1.5, borderColor: step.active ? 'var(--border)' : '#fee2e2' }}
                    placeholder={`Escreva o lembrete ${idx + 1}...`}
                  />

                  {/* Variables pills & emojis */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Variáveis:</span>
                    {VARIABLES.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const updatedSteps = selectedFlow.steps.map(s => s.id === step.id ? { ...s, message: s.message + ' ' + v } : s)
                          setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, steps: updatedSteps } : f))
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono font-bold border border-slate-200 transition-colors"
                        style={{ cursor: 'pointer' }}
                      >
                        {v}
                      </button>
                    ))}
                    
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                      {EMOJIS.slice(0, 6).map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            const updatedSteps = selectedFlow.steps.map(s => s.id === step.id ? { ...s, message: s.message + em } : s)
                            setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, steps: updatedSteps } : f))
                          }}
                          className="hover:scale-110 transition-transform text-sm"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom variables instructions */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Significado das variáveis</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-semibold">
                <div><code>{"{{nome}}"}</code>: Nome completo do cliente</div>
                <div><code>{"{{produto}}"}</code>: Nome do produto comprado</div>
                <div><code>{"{{pix}}"}</code>: Linha copia e cola do PIX</div>
                <div><code>{"{{link_checkout}}"}</code>: Link para concluir checkout</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  )
}
