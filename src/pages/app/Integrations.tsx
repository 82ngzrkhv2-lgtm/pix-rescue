import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, ChevronRight, X, CheckCircle, RefreshCw, Layers, Clock, Zap, ArrowRight } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import UpgradeModal from '../../components/UpgradeModal'
import { usePlan } from '../../hooks/usePlan'

type Platform = 'kiwify' | 'hotmart' | 'kirvano'

interface IntegrationData {
  id: string
  platform: Platform
  webhook_token: string
  status: 'active' | 'inactive'
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const PLATFORM_CONFIG: Record<Platform, {
  name: string; color: string; logoUrl: string; url: string; logoLabel: string
  steps: { title: string; description: string; action?: { label: string; url: string } }[]
}> = {
  kiwify: {
    name: 'Kiwify', color: '#10b981', logoUrl: '', logoLabel: '🟢 Kiwify', url: 'https://app.kiwify.com.br',
    steps: [
      { title: 'Acesse a Kiwify', description: 'Faça login na sua conta e vá em Configurações → Webhooks.', action: { label: 'Abrir Kiwify', url: 'https://app.kiwify.com.br' } },
      { title: 'Cole a URL do Webhook', description: 'Clique em "Adicionar Webhook" e cole a URL gerada pelo PIX RESCUE.' },
      { title: 'Cole o Token', description: 'Adicione o Token de autenticação no campo "Chave secreta".' },
      { title: 'Selecione os eventos', description: 'Ative: PIX Gerado, PIX Pago, Boleto Gerado e Compra Aprovada.' },
      { title: 'Salve e teste', description: 'Clique em "Salvar". Aguarde o primeiro evento para confirmar a integração.' },
    ],
  },
  hotmart: {
    name: 'Hotmart', color: '#f97316', logoUrl: '', logoLabel: '🔥 Hotmart', url: 'https://app.hotmart.com',
    steps: [
      { title: 'Acesse a Hotmart', description: 'Faça login e vá em Ferramentas → Webhooks.', action: { label: 'Abrir Hotmart', url: 'https://app.hotmart.com' } },
      { title: 'Crie um novo webhook', description: 'Clique em "Criar webhook" e insira a URL gerada pelo PIX RESCUE.' },
      { title: 'Insira o token', description: 'No campo "Token de autenticação", cole o token gerado pelo sistema.' },
      { title: 'Selecione os eventos', description: 'Marque: PURCHASE_BILLET_PRINTED, PURCHASE_APPROVED, PURCHASE_COMPLETE e eventos de PIX.' },
      { title: 'Ative o webhook', description: 'Clique em "Salvar" e ative o toggle.' },
    ],
  },
  kirvano: {
    name: 'Kirvano', color: '#0f172a', logoUrl: '', logoLabel: '🔴 Kirvano', url: 'https://app.kirvano.com',
    steps: [
      { title: 'Acesse a Kirvano', description: 'Faça login na sua conta e vá em Configurações → Integrações.', action: { label: 'Abrir Kirvano', url: 'https://app.kirvano.com' } },
      { title: 'Configure o webhook', description: 'Selecione "Webhook" e adicione a URL gerada pelo PIX RESCUE.' },
      { title: 'Adicione o token', description: 'Insira o token de segurança no campo correspondente.' },
      { title: 'Escolha os eventos', description: 'Selecione: Pix Gerado, Pix Pago, Boleto Gerado, Compra Aprovada.' },
      { title: 'Salve as configurações', description: 'Confirme e salve. Sua integração estará ativa em instantes.' },
    ],
  },
}

const PROGRESS_STEPS = [
  { label: 'Conectar WhatsApp' },
  { label: 'Conectar Plataforma' },
  { label: 'Textos e Integração' },
  { label: 'Ativar Recuperador' },
]

function CopyButton({ text }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
      <input
        type="text"
        readOnly
        value={text}
        className="input-field"
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#475569',
          background: '#f8fafc',
          flex: 1,
        }}
      />
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="btn btn-outline"
        style={{ minWidth: '100px', flexShrink: 0 }}
      >
        {copied ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  )
}

function OnboardingModal({ platform, integration, onClose }: {
  platform: Platform; integration: IntegrationData | null; onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const cfg = PLATFORM_CONFIG[platform]
  const totalSteps = cfg.steps.length
  const isLast = step === totalSteps - 1
  const webhookUrl = integration
    ? `${SUPABASE_URL}/functions/v1/webhook-handler?platform=${platform}&token=${integration.webhook_token}`
    : ''
  const token = integration?.webhook_token ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-lg animate-fade-in" style={{ border: `1px solid var(--border)` }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="font-outfit text-xl">{cfg.logoLabel.split(' ')[0]}</span>
            <div>
              <h2 className="font-bold font-outfit text-sm text-slate-800 uppercase tracking-wider">Configurar {cfg.name}</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Passo {step + 1} de {totalSteps}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%`, background: 'var(--green)' }} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{step + 1}</div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 mb-2 font-outfit uppercase tracking-wider">{cfg.steps[step].title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{cfg.steps[step].description}</p>
            </div>
          </div>

          {cfg.steps[step].action && (
            <a href={cfg.steps[step].action!.url} target="_blank" rel="noopener noreferrer"
              className="btn btn-outline w-full justify-center mb-4 text-xs font-semibold">
              <ExternalLink size={13} /> {cfg.steps[step].action!.label}
            </a>
          )}

          {step === 1 && webhookUrl && (
            <div className="mb-4"><CopyButton text={webhookUrl} label="URL" /></div>
          )}
          {step === 2 && token && (
            <div className="mb-4"><CopyButton text={token} label="Token" /></div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => step > 0 && setStep(s => s - 1)} className="btn btn-outline btn-sm" disabled={step === 0}>Anterior</button>
          {isLast
            ? <button onClick={onClose} className="btn btn-green btn-sm font-semibold"><CheckCircle size={14} /> Integração configurada!</button>
            : <button onClick={() => setStep(s => s + 1)} className="btn btn-primary btn-sm font-semibold">Próximo <ChevronRight size={14} /></button>}
        </div>
      </div>
    </div>
  )
}

export default function Integrations() {
  const { user } = useAuth()
  const { plan, limits, usage, canSwapPlatform, daysUntilSwap, activePlatform } = usePlan()
  const [integrations, setIntegrations] = useState<Record<Platform, IntegrationData | null>>({ kiwify: null, hotmart: null, kirvano: null })
  const [openPlatform, setOpenPlatform] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedPlatform, setCompletedPlatform] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(false)

  useEffect(() => { if (user) loadOrCreateIntegrations() }, [user])

  const loadOrCreateIntegrations = async () => {
    setLoading(true)
    const platforms: Platform[] = ['kiwify', 'hotmart', 'kirvano']

    // Load integrations from Supabase
    const { data: existing } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user!.id)

    const map: Record<Platform, IntegrationData | null> = { kiwify: null, hotmart: null, kirvano: null }

    for (const platform of platforms) {
      const found = existing?.find(i => i.platform === platform)
      if (found) {
        map[platform] = found as IntegrationData
      } else {
        // Auto-create integration
        const { data: created } = await supabase
          .from('integrations')
          .insert({ user_id: user!.id, platform, status: 'inactive' })
          .select()
          .single()
        if (created) map[platform] = created as IntegrationData
      }
    }

    setIntegrations(map)
    setCompletedPlatform(Object.values(map).some(i => i?.status === 'active'))
    setLoading(false)
  }

  const handleOnboardingClose = async (platform: Platform) => {
    const integration = integrations[platform]
    if (integration) {
      await supabase.from('integrations').update({ status: 'active' }).eq('id', integration.id)
      setIntegrations(prev => ({ ...prev, [platform]: { ...prev[platform]!, status: 'active' } }))
      setCompletedPlatform(true)
    }
    setOpenPlatform(null)
  }

  const hasWhatsApp = true
  const progress = [hasWhatsApp, completedPlatform, completedPlatform, completedPlatform]

  // We choose Kirvano as default displayed webhooks values
  const defaultIntegration = integrations['kirvano'] || integrations['kiwify'] || integrations['hotmart']
  const defaultPlatform = defaultIntegration?.platform || 'kirvano'
  const webhookUrl = defaultIntegration
    ? `${SUPABASE_URL}/functions/v1/webhook-handler?platform=${defaultPlatform}&token=${defaultIntegration.webhook_token}`
    : 'Aguardando inicialização...'
  const token = defaultIntegration?.webhook_token ?? 'Aguardando inicialização...'

  return (
    <AppLayout title="Plataformas" subtitle="Conecte as plataformas de pagamento que você utiliza para vender">
      <div className="space-y-6 animate-fade-in">

        {/* Top Progress / Onboarding bar (Fidelidade ao UI Designer: TELA 4) */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Progresso de ativação</h4>
            <button onClick={loadOrCreateIntegrations} disabled={loading} className="btn btn-outline btn-icon btn-sm" title="Atualizar">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {PROGRESS_STEPS.map((step, idx) => (
              <div key={idx} style={{
                background: progress[idx] ? '#ecfdf5' : '#f8fafc',
                border: `1px solid ${progress[idx] ? '#bbf7d0' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: progress[idx] ? 'var(--green)' : '#cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: '#ffffff', flexShrink: 0
                }}>{progress[idx] ? '✓' : idx + 1}</div>
                <div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: progress[idx] ? 'var(--green-dark)' : 'var(--text-secondary)'
                  }} className="font-outfit block">{step.label}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    {progress[idx] ? 'Concluído' : 'Aguardando'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {completedPlatform && (
            <div style={{
              marginTop: 16,
              background: '#ecfdf5',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }} className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} style={{ color: 'var(--green)' }} />
                <span className="text-xs font-semibold text-emerald-800">Seu recuperador já está ativo e pronto para vendas! 🚀</span>
              </div>
              <button onClick={() => setCompletedPlatform(true)} className="btn btn-green btn-sm font-semibold">Selecionar</button>
            </div>
          )}
        </div>

        {/* Card: Plataforma Ativa com Cooldown */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Plataforma Ativa</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-gray text-[10px]">{plan}</span>
              <span className="badge badge-gray text-[10px]">{usage.platforms} / {limits.platforms} plataformas</span>
            </div>
          </div>

          {activePlatform ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  {activePlatform === 'hotmart' ? '🔥' : activePlatform === 'kiwify' ? '🟢' : '🔴'}
                </div>
                <div>
                  <span className="font-outfit font-extrabold text-sm text-slate-800 block capitalize">{activePlatform}</span>
                  <span className="badge badge-green text-[10px]">Ativa</span>
                </div>
              </div>

              {canSwapPlatform ? (
                <button
                  onClick={() => setOpenPlatform('hotmart')}
                  className="btn btn-primary btn-sm font-semibold"
                  style={{ gap: 6 }}
                >
                  <ArrowRight size={12} /> Trocar Plataforma
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <button
                    disabled
                    className="btn btn-outline btn-sm font-semibold"
                    style={{ opacity: 0.4, cursor: 'not-allowed', gap: 6 }}
                  >
                    <Clock size={12} /> Trocar Plataforma
                  </button>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Próxima troca disponível em <strong>{daysUntilSwap} dias</strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Nenhuma plataforma ativa ainda. Configure uma integração abaixo.
              </span>
            </div>
          )}

          {usage.platforms >= limits.platforms && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                Limite de plataformas atingido. Faça upgrade para adicionar mais.
              </p>
              <button
                onClick={() => setUpgradeModal(true)}
                className="btn btn-outline btn-sm font-bold"
                style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: 10, flexShrink: 0 }}
              >
                <Zap size={10} /> Upgrade
              </button>
            </div>
          )}
        </div>

        {/* Grid of Platform Cards (Fidelidade ao UI Designer: TELA 3) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Layers size={18} className="text-slate-600" />
            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">Integrações de Pagamento</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['kiwify', 'hotmart', 'kirvano'] as Platform[]).map(p => {
              const cfg = PLATFORM_CONFIG[p]
              const integration = integrations[p]
              const isActive = integration?.status === 'active'

              return (
                <div key={p} className="card card-hover" style={{
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  borderTop: isActive ? `4px solid ${cfg.color}` : '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="text-2xl font-outfit">{cfg.logoLabel.split(' ')[0]}</span>
                      <div>
                        <span className="font-outfit font-extrabold text-sm text-slate-800">{cfg.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">+ associação</span>
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'} text-[10px]`}>
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button onClick={() => setOpenPlatform(p)} className="btn btn-outline btn-sm font-semibold" style={{ flex: 1 }}>
                      Configurar
                    </button>
                    <button onClick={() => setOpenPlatform(p)} className="btn btn-primary btn-sm font-semibold" style={{ flex: 1 }}>
                      Conectar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Integration Credentials Section (Fidelidade ao UI Designer: TELA 3 Webhook URL & Token) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card" style={{ padding: 20 }}>
            <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Webhook URL</h4>
            <p className="text-xs text-slate-400 font-semibold mb-4">Insira esta URL em sua plataforma para enviar os dados de PIX gerados.</p>
            <CopyButton text={webhookUrl} label="URL" />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Webhook Token</h4>
            <p className="text-xs text-slate-400 font-semibold mb-4">Utilize esta chave como token de segurança na autenticação do webhook.</p>
            <CopyButton text={token} label="Token" />
          </div>
        </div>

      </div>

      {openPlatform && (
        <OnboardingModal
          platform={openPlatform}
          integration={integrations[openPlatform]}
          onClose={() => handleOnboardingClose(openPlatform)}
        />
      )}

      {upgradeModal && (
        <UpgradeModal
          trigger="platforms"
          currentPlan={plan}
          onClose={() => setUpgradeModal(false)}
        />
      )}
    </AppLayout>
  )
}
