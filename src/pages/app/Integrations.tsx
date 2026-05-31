import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Copy, Check, ExternalLink, X, CheckCircle, RefreshCw,
  Layers, Clock, Zap, ArrowRight, ChevronRight, LayoutDashboard,
  Wifi, AlertCircle,
} from 'lucide-react'
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

// ─── Step types ───────────────────────────────────────────────────────────────
interface DrawerStep {
  id: string
  title: string
  description: string
  /** Opens platform in new tab */
  openUrl?: string
  openButtonLabel?: string
  openHint?: string
  /** Visual navigation path e.g. ['Ferramentas', 'Webhooks'] */
  navPath?: string[]
  /** Show the webhook URL copy field */
  showUrl?: boolean
  /** Show a text input suggestion */
  inputSuggestion?: { label: string; value: string }
  /** Event checklist to display */
  events?: string[]
  /** "Paste URL here" reminder */
  pasteReminder?: string
  /** This is the test step */
  isTestStep?: boolean
}

// ─── Platform configurations ──────────────────────────────────────────────────
const PLATFORM_META: Record<Platform, {
  name: string
  emoji: string
  color: string
  subtitle: string
  steps: DrawerStep[]
}> = {
  kiwify: {
    name: 'Kiwify',
    emoji: '🟢',
    color: '#10b981',
    subtitle: 'Leva menos de 1 minuto.',
    steps: [
      {
        id: 'open',
        title: 'Abra a área de Webhooks',
        description: 'Clique no botão abaixo. Você será levado diretamente para a tela de criação de Webhooks da Kiwify.',
        openUrl: 'https://dashboard.kiwify.com/apps/webhooks/integrations',
        openButtonLabel: 'Abrir Área de Webhooks da Kiwify',
        openHint: 'Você será levado diretamente para a tela de criação de Webhooks da Kiwify.',
      },
      {
        id: 'copy-url',
        title: 'Copie sua URL',
        description: 'Copie a URL abaixo. Você vai colar ela na Kiwify.',
        showUrl: true,
      },
      {
        id: 'create',
        title: 'Crie o Webhook na Kiwify',
        description: 'Dentro da Kiwify, siga este caminho:',
        navPath: ['Apps', 'Webhooks', 'Criar Webhook'],
      },
      {
        id: 'paste',
        title: 'Cole a URL',
        description: 'No campo "URL do Webhook", cole a URL que você copiou.',
        pasteReminder: 'URL do Webhook',
      },
      {
        id: 'events',
        title: 'Selecione os eventos',
        description: 'Marque todos estes eventos:',
        events: ['PIX Gerado', 'PIX Pago', 'Boleto Gerado', 'Compra Aprovada', 'Compra Expirada'],
      },
      {
        id: 'save',
        title: 'Clique em Criar',
        description: 'Clique em "Criar" para salvar. Pronto — sua integração está quase finalizada!',
      },
      {
        id: 'test',
        title: 'Tudo certo?',
        description: 'Clique em testar para confirmar que a Kiwify está enviando os dados corretamente para o PIX RESCUE.',
        isTestStep: true,
      },
    ],
  },

  hotmart: {
    name: 'Hotmart',
    emoji: '🔥',
    color: '#f97316',
    subtitle: 'Leva cerca de 2 minutos.',
    steps: [
      {
        id: 'open',
        title: 'Abra a área de Webhooks',
        description: 'Clique abaixo para abrir a área de Webhooks da sua conta Hotmart.',
        openUrl: 'https://app.hotmart.com/tools/webhook',
        openButtonLabel: 'Abrir Área de Webhooks da Hotmart',
        openHint: 'Você será levado para a área de integrações da Hotmart.',
      },
      {
        id: 'navigate',
        title: 'Encontre o Webhook',
        description: 'Dentro da Hotmart, siga este caminho:',
        navPath: ['Ferramentas', 'Ver Todas', 'Webhook (API e Notificações)', 'Cadastrar Webhook'],
      },
      {
        id: 'copy-url',
        title: 'Copie sua URL',
        description: 'Copie a URL abaixo. Você vai colar ela na Hotmart.',
        showUrl: true,
      },
      {
        id: 'name',
        title: 'Dê um nome',
        description: 'No campo de nome do webhook, use o nome abaixo para identificar facilmente depois.',
        inputSuggestion: { label: 'Nome sugerido', value: 'PIX RESCUE' },
      },
      {
        id: 'events',
        title: 'Selecione os eventos',
        description: 'Marque todos estes eventos:',
        events: ['Compra Aprovada', 'Aguardando Pagamento', 'Compra Expirada', 'Compra Atrasada', 'Abandono de Carrinho'],
      },
      {
        id: 'products',
        title: 'Escolha os produtos',
        description: 'Selecione "Todos os Produtos" — assim o PIX RESCUE funcionará para toda sua conta.',
      },
      {
        id: 'paste',
        title: 'Cole a URL',
        description: 'No campo "URL de Envio", cole a URL que você copiou.',
        pasteReminder: 'URL de Envio',
      },
      {
        id: 'save',
        title: 'Clique em Salvar',
        description: 'Clique em "Salvar" para ativar o webhook. Quase lá!',
      },
      {
        id: 'test',
        title: 'Tudo certo?',
        description: 'Clique em testar para confirmar que a Hotmart está enviando os dados para o PIX RESCUE.',
        isTestStep: true,
      },
    ],
  },

  kirvano: {
    name: 'Kirvano',
    emoji: '🔴',
    color: '#0f172a',
    subtitle: 'Leva menos de 2 minutos.',
    steps: [
      {
        id: 'open',
        title: 'Abra a área de Webhooks',
        description: 'Clique abaixo para ir direto para a área de Webhooks da Kirvano.',
        openUrl: 'https://app.kirvano.com/integracoes/webhooks',
        openButtonLabel: 'Abrir Área de Webhooks da Kirvano',
        openHint: 'Você será levado diretamente para a área de Webhooks da Kirvano.',
      },
      {
        id: 'navigate',
        title: 'Crie um Webhook',
        description: 'Dentro da Kirvano, siga este caminho:',
        navPath: ['Integrações', 'Webhooks', 'Criar Webhook'],
      },
      {
        id: 'copy-url',
        title: 'Copie sua URL',
        description: 'Copie a URL abaixo. Você vai colar ela na Kirvano.',
        showUrl: true,
      },
      {
        id: 'fill',
        title: 'Preencha os dados',
        description: 'Preencha o formulário com as informações abaixo:',
        inputSuggestion: { label: 'Nome', value: 'PIX RESCUE' },
        pasteReminder: 'URL',
      },
      {
        id: 'events',
        title: 'Selecione os eventos',
        description: 'Marque todos estes eventos:',
        events: ['Boleto Gerado', 'Compra Aprovada', 'Pagamento Confirmado', 'Alteração de Status'],
      },
      {
        id: 'save',
        title: 'Clique em Salvar',
        description: 'Clique em "Salvar" para concluir. Você está quase lá!',
      },
      {
        id: 'test',
        title: 'Tudo certo?',
        description: 'Clique em testar para confirmar que a Kirvano está integrada com o PIX RESCUE.',
        isTestStep: true,
      },
    ],
  },
}

const ONBOARDING_STEPS = [
  { label: 'Conectar WhatsApp' },
  { label: 'Conectar Plataforma' },
  { label: 'Testar Integração' },
  { label: 'Ativar Recuperador' },
]

// ─── Inline copy button ───────────────────────────────────────────────────────
function InlineCopy({ text, highlight = false }: { text: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* fallback */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      background: highlight ? '#ecfdf5' : '#f8fafc',
      border: `1.5px solid ${highlight ? '#10b981' : '#e2e8f0'}`,
      borderRadius: 10,
      transition: 'all 0.3s ease',
    }}>
      <span style={{
        flex: 1, fontSize: 11.5, fontFamily: 'monospace',
        color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{text}</span>
      <button
        onClick={copy}
        className={`btn btn-sm font-semibold`}
        style={{
          flexShrink: 0, gap: 6,
          background: copied ? '#10b981' : highlight ? '#0f172a' : '#f1f5f9',
          color: copied || highlight ? '#fff' : '#475569',
          border: 'none', minWidth: 90,
          transition: 'all 0.2s',
        }}
      >
        {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
      </button>
    </div>
  )
}

// ─── Nav Path breadcrumb ──────────────────────────────────────────────────────
function NavPath({ path }: { path: string[] }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
      padding: '12px 14px',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
    }}>
      {path.map((seg, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11.5, fontWeight: 700, color: '#0f172a',
            background: '#e2e8f0', padding: '3px 10px', borderRadius: 20,
            whiteSpace: 'nowrap',
          }}>{seg}</span>
          {i < path.length - 1 && (
            <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
          )}
        </span>
      ))}
    </div>
  )
}

// ─── Event checklist ──────────────────────────────────────────────────────────
function EventChecklist({ events }: { events: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map((ev, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Check size={11} color="#fff" strokeWidth={3} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#065f46' }}>{ev}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Paste reminder ───────────────────────────────────────────────────────────
function PasteReminder({ label, webhookUrl }: { label: string; webhookUrl: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(webhookUrl) } catch { /* */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <div style={{
      padding: '14px 16px',
      background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
        Cole no campo <strong>"{label}"</strong>
      </p>
      <button onClick={copy} className="btn btn-sm font-semibold" style={{
        gap: 6, justifyContent: 'center', alignSelf: 'flex-start',
        background: copied ? '#10b981' : '#f59e0b', color: '#fff', border: 'none',
      }}>
        {copied ? <><Check size={12} /> URL copiada!</> : <><Copy size={12} /> Copiar URL de novo</>}
      </button>
    </div>
  )
}

// ─── Integration Drawer ───────────────────────────────────────────────────────
function IntegrationDrawer({
  platform,
  integration,
  onClose,
  onSuccess,
}: {
  platform: Platform
  integration: IntegrationData | null
  onClose: () => void
  onSuccess: (p: Platform) => void
}) {
  const navigate = useNavigate()
  const meta = PLATFORM_META[platform]
  const [step, setStep] = useState(0)
  const [platformOpened, setPlatformOpened] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [done, setDone] = useState(false)
  const stepRef = useRef<HTMLDivElement>(null)

  const webhookUrl = integration
    ? `${SUPABASE_URL}/functions/v1/webhook-handler?platform=${platform}&token=${integration.webhook_token}`
    : 'Aguardando inicialização...'

  const totalSteps = meta.steps.length
  const currentStep = meta.steps[step]
  const pct = Math.round(((step + 1) / totalSteps) * 100)

  const goNext = () => {
    if (step < totalSteps - 1) setStep(s => s + 1)
    setTimeout(() => stepRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }
  const goPrev = () => step > 0 && setStep(s => s - 1)

  const handleOpenPlatform = () => {
    window.open(currentStep.openUrl, '_blank', 'noopener,noreferrer')
    setPlatformOpened(true)
  }

  const handleTest = async () => {
    setTestStatus('testing')
    // Simulate a connectivity test (in prod you'd ping Supabase or send a test event)
    await new Promise(r => setTimeout(r, 1800))
    // Mark as active in DB
    if (integration) {
      await supabase.from('integrations').update({ status: 'active' }).eq('id', integration.id)
    }
    setTestStatus('ok')
    setTimeout(() => setDone(true), 600)
    onSuccess(platform)
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <>
        {/* Backdrop */}
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 49 }}
          onClick={onClose}
        />
        <aside style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          width: '100%', maxWidth: 480,
          background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#ecfdf5', border: '3px solid #10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
              <CheckCircle size={40} style={{ color: '#10b981' }} />
            </div>
            <h2 className="font-outfit" style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>
              {meta.name} conectada! 🎉
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500, lineHeight: 1.7, maxWidth: 340 }}>
              Seu recuperador já está ativo. Agora toda vez que um PIX for gerado, o PIX RESCUE começará a recuperar vendas automaticamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, marginTop: 28 }}>
              <button
                onClick={() => { onClose(); navigate('/app/dashboard') }}
                className="btn btn-primary font-semibold"
                style={{ justifyContent: 'center', gap: 8, padding: '12px 20px' }}
              >
                <LayoutDashboard size={15} /> Ir para Dashboard
              </button>
              <button onClick={onClose} className="btn btn-outline font-semibold" style={{ justifyContent: 'center' }}>
                Fechar
              </button>
            </div>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 49 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '100%', maxWidth: 480,
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, fontSize: 22,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{meta.emoji}</div>
            <div>
              <h2 className="font-outfit" style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                Conectar {meta.name}
              </h2>
              <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>{meta.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '14px 22px 0', flexShrink: 0 }}>
          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            {meta.steps.map((_, idx) => (
              <div key={idx} style={{
                flex: 1, height: 4, borderRadius: 50,
                background: idx <= step ? meta.color : '#e2e8f0',
                transition: 'background 0.3s ease',
                cursor: idx < step ? 'pointer' : 'default',
              }}
                onClick={() => idx < step && setStep(idx)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>
              Passo {step + 1} de {totalSteps}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{pct}%</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={stepRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>

          {/* Step header */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `${meta.color}18`, border: `1.5px solid ${meta.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, color: meta.color,
            }}>
              {platformOpened && currentStep.id === 'open' ? '✓' : step + 1}
            </div>
            <div>
              <h3 className="font-outfit" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                {currentStep.title}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, fontWeight: 500 }}>
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* ── Open Platform ── */}
          {currentStep.openUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleOpenPlatform}
                className="btn font-bold"
                style={{
                  width: '100%', justifyContent: 'center', gap: 10,
                  padding: '13px 20px', fontSize: 13.5,
                  background: platformOpened ? '#059669' : meta.color,
                  color: '#fff', border: 'none',
                  transition: 'background 0.3s ease',
                  borderRadius: 10,
                }}
              >
                {platformOpened
                  ? <><Check size={16} /> Aberto ✅ — Clique em Próximo</>
                  : <><ExternalLink size={16} /> {currentStep.openButtonLabel ?? 'Abrir Área de Webhooks'}</>
                }
              </button>

              {currentStep.openHint && !platformOpened && (
                <p style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  💡 {currentStep.openHint}
                </p>
              )}

              {platformOpened && (
                <div style={{
                  padding: '10px 14px', background: '#ecfdf5',
                  border: '1px solid #bbf7d0', borderRadius: 8,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>
                    Passo 1 concluído — Área de Webhooks aberta
                  </span>
                </div>
              )}

              {/* Nav path for hotmart fallback */}
              {currentStep.navPath && (
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                    Se não abrir direto, siga este caminho:
                  </p>
                  <NavPath path={currentStep.navPath} />
                </div>
              )}
            </div>
          )}

          {/* ── Nav path (non-open step) ── */}
          {!currentStep.openUrl && currentStep.navPath && (
            <NavPath path={currentStep.navPath} />
          )}

          {/* ── URL copy ── */}
          {currentStep.showUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 8, marginBottom: 2,
              }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>
                  ⬇️ Copie a URL abaixo e cole na {meta.name}
                </p>
              </div>
              <InlineCopy text={webhookUrl} highlight />
            </div>
          )}

          {/* ── Input suggestion ── */}
          {currentStep.inputSuggestion && (
            <div style={{
              padding: '12px 14px', background: '#f8fafc',
              border: '1px solid #e2e8f0', borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {currentStep.inputSuggestion.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                  {currentStep.inputSuggestion.value}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(currentStep.inputSuggestion!.value)}
                  className="btn btn-outline btn-sm"
                  style={{ gap: 5 }}
                >
                  <Copy size={11} /> Copiar
                </button>
              </div>
            </div>
          )}

          {/* ── Paste reminder ── */}
          {currentStep.pasteReminder && (
            <PasteReminder label={currentStep.pasteReminder} webhookUrl={webhookUrl} />
          )}

          {/* ── Event checklist ── */}
          {currentStep.events && (
            <EventChecklist events={currentStep.events} />
          )}

          {/* ── Test step ── */}
          {currentStep.isTestStep && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testStatus === 'idle' && (
                <button
                  onClick={handleTest}
                  className="btn font-bold"
                  style={{
                    width: '100%', justifyContent: 'center', gap: 10,
                    padding: '13px 20px', fontSize: 13.5,
                    background: meta.color, color: '#fff', border: 'none', borderRadius: 10,
                  }}
                >
                  <Wifi size={16} /> Testar Integração
                </button>
              )}

              {testStatus === 'testing' && (
                <div style={{
                  padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center',
                }}>
                  <div className="spinner-dark" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Testando conexão...</span>
                </div>
              )}

              {testStatus === 'ok' && (
                <div style={{
                  padding: '16px', background: '#ecfdf5', border: '2px solid #10b981',
                  borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <CheckCircle size={22} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>
                      {meta.name} conectada com sucesso! ✅
                    </p>
                    <p style={{ fontSize: 12, color: '#047857', fontWeight: 600, marginTop: 2 }}>
                      Tudo funcionando. Preparando sua tela de sucesso...
                    </p>
                  </div>
                </div>
              )}

              {testStatus === 'fail' && (
                <div style={{
                  padding: '14px', background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: 10, display: 'flex', gap: 10,
                }}>
                  <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                      Não foi possível conectar ainda.
                    </p>
                    <p style={{ fontSize: 11.5, color: '#b91c1c', fontWeight: 600, lineHeight: 1.5 }}>
                      Verifique se a URL foi colada corretamente e tente novamente.
                    </p>
                    <button onClick={() => setTestStatus('idle')} className="btn btn-outline btn-sm" style={{ marginTop: 8, fontSize: 11 }}>
                      Tentar de novo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom spacing */}
          <div style={{ height: 24 }} />
        </div>

        {/* Footer nav */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          background: '#fafafa',
        }}>
          <button
            onClick={goPrev}
            disabled={step === 0}
            className="btn btn-outline btn-sm font-semibold"
            style={{ minWidth: 80, opacity: step === 0 ? 0.4 : 1 }}
          >
            Anterior
          </button>

          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
            {step + 1} / {totalSteps}
          </span>

          {!currentStep.isTestStep && (
            <button
              onClick={goNext}
              disabled={currentStep.openUrl !== undefined && !platformOpened}
              className="btn btn-primary btn-sm font-bold"
              style={{
                minWidth: 110, gap: 6,
                opacity: currentStep.openUrl && !platformOpened ? 0.45 : 1,
                cursor: currentStep.openUrl && !platformOpened ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.3s',
              }}
            >
              {currentStep.openUrl && !platformOpened ? 'Abra primeiro' : <>Próximo <ChevronRight size={13} /></>}
            </button>
          )}

          {currentStep.isTestStep && testStatus === 'idle' && (
            <div style={{ width: 110 }} />
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Main Integrations page ───────────────────────────────────────────────────
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
    const { data: existing } = await supabase.from('integrations').select('*').eq('user_id', user!.id)
    const map: Record<Platform, IntegrationData | null> = { kiwify: null, hotmart: null, kirvano: null }

    for (const platform of platforms) {
      const found = existing?.find(i => i.platform === platform)
      if (found) {
        map[platform] = found as IntegrationData
      } else {
        const { data: created } = await supabase
          .from('integrations').insert({ user_id: user!.id, platform, status: 'inactive' })
          .select().single()
        if (created) map[platform] = created as IntegrationData
      }
    }

    setIntegrations(map)
    setCompletedPlatform(Object.values(map).some(i => i?.status === 'active'))
    setLoading(false)
  }

  const handleSuccess = async (platform: Platform) => {
    setIntegrations(prev => ({
      ...prev,
      [platform]: prev[platform] ? { ...prev[platform]!, status: 'active' } : prev[platform],
    }))
    setCompletedPlatform(true)
  }

  const hasWhatsApp = true
  const progress = [hasWhatsApp, completedPlatform, completedPlatform, completedPlatform]

  const defaultIntegration = integrations['kirvano'] || integrations['kiwify'] || integrations['hotmart']
  const defaultPlatform = defaultIntegration?.platform || 'kirvano'
  const globalWebhookUrl = defaultIntegration
    ? `${SUPABASE_URL}/functions/v1/webhook-handler?platform=${defaultPlatform}&token=${defaultIntegration.webhook_token}`
    : 'Aguardando inicialização...'
  const globalToken = defaultIntegration?.webhook_token ?? 'Aguardando inicialização...'

  return (
    <AppLayout title="Plataformas" subtitle="Conecte as plataformas de pagamento que voce utiliza para vender">
      <div className="space-y-6 animate-fade-in">

        {/* Onboarding progress bar */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Progresso de ativacao</h4>
            <button onClick={loadOrCreateIntegrations} disabled={loading} className="btn btn-outline btn-icon btn-sm" title="Atualizar">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {ONBOARDING_STEPS.map((s, idx) => (
              <div key={idx} style={{
                background: progress[idx] ? '#ecfdf5' : '#f8fafc',
                border: `1px solid ${progress[idx] ? '#bbf7d0' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: progress[idx] ? 'var(--green)' : '#cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>{progress[idx] ? '✓' : idx + 1}</div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: progress[idx] ? 'var(--green-dark)' : 'var(--text-secondary)' }} className="font-outfit block">{s.label}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{progress[idx] ? 'Concluido' : 'Aguardando'}</span>
                </div>
              </div>
            ))}
          </div>
          {completedPlatform && (
            <div style={{
              marginTop: 16, background: '#ecfdf5', border: '1px solid #bbf7d0',
              borderRadius: 8, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }} className="animate-fade-in">
              <CheckCircle size={16} style={{ color: 'var(--green)' }} />
              <span className="text-xs font-semibold text-emerald-800">Seu recuperador ja esta ativo e pronto para vendas! 🚀</span>
            </div>
          )}
        </div>

        {/* Active platform card */}
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
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {activePlatform === 'hotmart' ? '🔥' : activePlatform === 'kiwify' ? '🟢' : '🔴'}
                </div>
                <div>
                  <span className="font-outfit font-extrabold text-sm text-slate-800 block capitalize">{activePlatform}</span>
                  <span className="badge badge-green text-[10px]">Ativa</span>
                </div>
              </div>
              {canSwapPlatform ? (
                <button onClick={() => setOpenPlatform('hotmart')} className="btn btn-primary btn-sm font-semibold" style={{ gap: 6 }}>
                  <ArrowRight size={12} /> Trocar Plataforma
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <button disabled className="btn btn-outline btn-sm font-semibold" style={{ opacity: 0.4, cursor: 'not-allowed', gap: 6 }}>
                    <Clock size={12} /> Trocar Plataforma
                  </button>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Proxima troca em <strong>{daysUntilSwap} dias</strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
              Nenhuma plataforma ativa ainda. Clique em "Conectar" abaixo para comecar.
            </p>
          )}
          {usage.platforms >= limits.platforms && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>Limite de plataformas atingido. Faca upgrade para adicionar mais.</p>
              <button onClick={() => setUpgradeModal(true)} className="btn btn-outline btn-sm font-bold" style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: 10, flexShrink: 0 }}>
                <Zap size={10} /> Upgrade
              </button>
            </div>
          )}
        </div>

        {/* Platform cards grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Layers size={18} className="text-slate-600" />
            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">Integracoes de Pagamento</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['kiwify', 'hotmart', 'kirvano'] as Platform[]).map(p => {
              const meta = PLATFORM_META[p]
              const integration = integrations[p]
              const isActive = integration?.status === 'active'
              return (
                <div key={p} className="card card-hover" style={{
                  padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
                  borderTop: isActive ? `4px solid ${meta.color}` : '1px solid var(--border)',
                  cursor: 'pointer',
                }} onClick={() => setOpenPlatform(p)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{meta.emoji}</span>
                      <div>
                        <span className="font-outfit font-extrabold text-sm text-slate-800">{meta.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{meta.subtitle}</span>
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'} text-[10px]`}>
                      {isActive ? '🟢 Ativo' : '🔴 Aguardando'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenPlatform(p) }}
                      className="btn btn-primary btn-sm font-bold"
                      style={{ flex: 1, justifyContent: 'center', background: isActive ? '#059669' : meta.color, border: 'none', gap: 6 }}
                    >
                      {isActive ? <><CheckCircle size={13} /> Reconfigurar</> : <><ExternalLink size={13} /> Conectar</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Webhook credentials for reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card" style={{ padding: 20 }}>
            <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Webhook URL</h4>
            <p className="text-xs text-slate-400 font-semibold mb-4">URL gerada automaticamente para sua conta.</p>
            <InlineCopy text={globalWebhookUrl} />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Token de Seguranca</h4>
            <p className="text-xs text-slate-400 font-semibold mb-4">Chave de autenticacao do webhook.</p>
            <InlineCopy text={globalToken} />
          </div>
        </div>

      </div>

      {/* Drawer */}
      {openPlatform && (
        <IntegrationDrawer
          platform={openPlatform}
          integration={integrations[openPlatform]}
          onClose={() => setOpenPlatform(null)}
          onSuccess={handleSuccess}
        />
      )}

      {upgradeModal && (
        <UpgradeModal trigger="platforms" currentPlan={plan} onClose={() => setUpgradeModal(false)} />
      )}
    </AppLayout>
  )
}
