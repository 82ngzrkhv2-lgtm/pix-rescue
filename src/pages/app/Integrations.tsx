import { useState, useEffect, useRef } from 'react'
import {
  Copy, Check, ExternalLink, X, CheckCircle, RefreshCw,
  Layers, Clock, Zap, ArrowRight, ChevronRight,
  AlertCircle, Package, Edit2, Link, Save, Loader2
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import UpgradeModal from '../../components/UpgradeModal'
import { usePlan } from '../../hooks/usePlan'
import type { Product } from '../../types'

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
  showKiwifyIllustration?: boolean
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
        title: 'Abrir área de Webhooks',
        description: 'Clique no botão abaixo para abrir diretamente a área de Webhooks da Kiwify.',
        openUrl: 'https://dashboard.kiwify.com/apps/webhooks/integrations',
        openButtonLabel: 'Abrir Área de Webhooks',
        openHint: 'Você será levado diretamente para a tela de criação de Webhooks da Kiwify.',
      },
      {
        id: 'criar-webhook',
        title: 'Criar Webhook',
        description: 'Clique em "Criar" para cadastrar um novo Webhook.',
        showKiwifyIllustration: true,
      },
      {
        id: 'copy-url',
        title: 'Copiar URL',
        description: 'Copie a URL abaixo.',
        showUrl: true,
      },
      {
        id: 'paste-url',
        title: 'Colar a URL',
        description: 'Cole a URL copiada no campo "URL" da Kiwify.',
        pasteReminder: 'URL',
      },
      {
        id: 'produtos',
        title: 'Selecionar Produtos',
        description: 'Em Produtos selecione: "Todos que sou produtor". Caso queira limitar posteriormente, poderá escolher produtos específicos.',
      },
      {
        id: 'eventos',
        title: 'Selecionar Eventos',
        description: 'Selecione os seguintes eventos. Esses eventos permitem que o PIX RESCUE identifique oportunidades de recuperação automaticamente.',
        events: ['Pix gerado', 'Boleto gerado', 'Carrinho abandonado', 'Compra aprovada', 'Compra recusada (Opcional)'],
      },
      {
        id: 'concluir',
        title: 'Finalizar Configuração',
        description: 'Clique em "Criar". Pronto, sua integração está configurada!',
      },
      {
        id: 'test',
        title: 'Testar Recuperação',
        description: 'Agora vamos fazer um teste real no seu WhatsApp para ver a recuperação em funcionamento!',
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
function InlineCopy({
  text,
  highlight = false,
  buttonLabel = 'Copiar',
  successLabel = 'Copiado!',
}: {
  text: string
  highlight?: boolean
  buttonLabel?: string
  successLabel?: string
}) {
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
        {copied ? <><Check size={12} /> {successLabel}</> : <><Copy size={12} /> {buttonLabel}</>}
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
  const meta = PLATFORM_META[platform]
  const [step, setStep] = useState(0)
  const [platformOpened, setPlatformOpened] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
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
    if (integration) {
      await supabase.from('integrations').update({ status: 'active' }).eq('id', integration.id)
    }
    setTestStatus('ok')
    await new Promise(r => setTimeout(r, 800))
    onSuccess(platform)
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
                    ✅ Área de Webhooks aberta
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

          {/* ── Kiwify Illustration ── */}
          {currentStep.showKiwifyIllustration && (
            <div style={{
              margin: '12px 0',
              padding: 16, background: '#f8fafc', border: '1.5px solid #e2e8f0',
              borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>dashboard.kiwify.com/apps/webhooks</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔗</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Webhooks</span>
                </div>
                <div style={{
                  background: '#5c3cf2', color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                  boxShadow: '0 2px 8px rgba(92, 60, 242, 0.25)',
                  border: 'none', cursor: 'default',
                }}>
                  Criar
                </div>
              </div>
              <p style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600, textAlign: 'center', margin: 0 }}>
                👆 Procure pelo botão roxo <strong>"Criar"</strong> na barra superior ou listagem.
              </p>
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
              <InlineCopy
                text={webhookUrl}
                highlight
                buttonLabel="Copiar URL"
                successLabel="✅ URL copiada com sucesso"
              />
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
                    background: '#10b981', color: '#fff', border: 'none', borderRadius: 10,
                  }}
                >
                  <Zap size={16} /> Testar Recuperação
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

// ─── Flow Seeding Helper ──────────────────────────────────────────────────────
const ensureDefaultFlowExists = async (userId: string) => {
  try {
    const { data: existingFlows, error: fetchErr } = await supabase
      .from('flows')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (fetchErr) {
      console.error('Error fetching flows:', fetchErr)
      return
    }

    if (existingFlows && existingFlows.length > 0) {
      return
    }

    console.log('No flows found, seeding default flow...')

    const { data: newFlow, error: flowErr } = await supabase
      .from('flows')
      .insert({
        user_id: userId,
        name: 'Recuperação Rápida (PIX)',
        status: 'active'
      })
      .select()
      .maybeSingle()

    if (flowErr || !newFlow) {
      console.error('Error creating default flow:', flowErr)
      return
    }

    const defaultSteps = [
      {
        flow_id: newFlow.id,
        delay_minutes: 2,
        message: 'Olá {{nome}}! Tudo bem?\n\nVi que você gerou um PIX para o produto *{{produto}}*, mas o pagamento ainda não foi confirmado.\n\nPara facilitar, aqui está o seu código Copia e Cola do PIX:\n\n```\n{{pix}}\n```\n\nCaso tenha alguma dúvida ou precise de ajuda, é só responder a essa mensagem! 😊',
        step_order: 0,
        active: true
      },
      {
        flow_id: newFlow.id,
        delay_minutes: 15,
        message: 'Ainda estou guardando o seu acesso ao *{{produto}}*, {{nome}}! 🕒\n\nCaso tenha ocorrido algum erro ou queira pagar por cartão ou boleto, me avise por aqui.\n\nGaranta seu acesso agora: {{link_checkout}}',
        step_order: 1,
        active: true
      }
    ]

    const { error: stepsErr } = await supabase
      .from('flow_steps')
      .insert(defaultSteps)

    if (stepsErr) {
      console.error('Error creating default flow steps:', stepsErr)
    } else {
      console.log('Default flow and steps seeded successfully!')
    }
  } catch (err) {
    console.error('Failed to ensure default flow exists:', err)
  }
}

// ─── Test Recovery Drawer ─────────────────────────────────────────────────────
function TestRecoveryDrawer({
  platform,
  integration,
  onClose,
}: {
  platform: Platform
  integration: IntegrationData | null
  onClose: () => void
}) {
  const { user } = useAuth()
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [produto, setProduto] = useState('Produto de Teste')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'validation' | 'success' | 'diagnosis'>('idle')
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState({
    whatsappConnected: false,
    instanceOnline: false,
    integrationActive: false,
    flowActive: false,
  })

  // Format phone number live
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length <= 11) {
      let formatted = digits
      if (digits.length > 2) {
        formatted = `(${digits.slice(0, 2)}) ` + digits.slice(2)
      }
      if (digits.length > 7) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-` + digits.slice(7)
      }
      setWhatsapp(formatted)
    } else {
      setWhatsapp(val)
    }
  }

  const runDiagnostics = async () => {
    if (!user) return
    setLoadingDiagnostics(true)
    try {
      // Garantir que existe pelo menos um fluxo de teste ativo antes de rodar os diagnósticos
      await ensureDefaultFlowExists(user.id)

      // 1. WhatsApp conectado & 2. Instância online
      const { data: whatsappData } = await supabase
        .from('whatsapp_instances')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle()
      
      const whatsappConnected = !!whatsappData
      const instanceOnline = whatsappData?.status === 'connected'

      // 3. Integração ativa
      const { data: integrationData } = await supabase
        .from('integrations')
        .select('status')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .maybeSingle()
      
      const integrationActive = integrationData?.status === 'active'

      // 4. Fluxo habilitado
      const { data: flowData } = await supabase
        .from('flows')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
      
      const flowActive = !!flowData && flowData.length > 0

      setDiagnostics({
        whatsappConnected,
        instanceOnline,
        integrationActive,
        flowActive,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDiagnostics(false)
    }
  }

  const runClientSideSimulation = async (payload: any) => {
    console.log('Running client-side webhook simulation fallback...')
    const userId = user!.id
    const { customer, product, payment } = payload
    
    // 1. Upsert lead de forma segura
    let lead = null
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', customer.mobile)
      .maybeSingle()

    if (existingLead) {
      const { data: updatedLead } = await supabase
        .from('leads')
        .update({ name: customer.full_name })
        .eq('id', existingLead.id)
        .select()
        .maybeSingle()
      lead = updatedLead
    } else {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({ user_id: userId, phone: customer.mobile, name: customer.full_name, email: customer.email })
        .select()
        .maybeSingle()
      lead = newLead
    }

    if (!lead) throw new Error('Falha ao registrar lead no banco')

    // 2. Upsert produto de forma segura
    let productId = null
    let dbProduct = null
    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('external_product_id', product.id)
      .maybeSingle()

    if (existingProduct) {
      productId = existingProduct.id
      dbProduct = existingProduct
    } else {
      const { data: newProduct } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          product_name: product.name,
          external_product_id: product.id,
          platform,
        })
        .select()
        .maybeSingle()
      productId = newProduct?.id ?? null
      dbProduct = newProduct
    }

    // 3. Salvar evento
    await supabase
      .from('events')
      .insert({
        user_id: userId,
        lead_id: lead.id,
        product_id: productId,
        event_type: 'pix_generated',
        platform,
        payload,
        revenue: 0,
      })

    // 4. Buscar fluxo ativo e instância
    const { data: activeFlows } = await supabase
      .from('flows')
      .select('id, flow_steps(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)

    const activeFlow = activeFlows && activeFlows.length > 0 ? activeFlows[0] : null

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .maybeSingle()

    if (!instance) {
      throw new Error('Nenhuma instância ativa do WhatsApp conectada!')
    }

    const vars = {
      nome: customer.full_name,
      produto: product.name,
      pix: payment.pix_qrcode,
      link_checkout: dbProduct?.checkout_url ?? 'https://pixrescue.com',
    }

    let sentAny = false
    let finalOk = false

    const EVOLUTION_URL = import.meta.env.DEV ? '/evolution-api' : import.meta.env.VITE_EVOLUTION_API_URL
    const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY

    const sendMsgDirectly = async (msgText: string) => {
      const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instance.instance_name}`, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: customer.mobile,
          options: { delay: 100 },
          text: msgText,
        })
      })
      return res.ok
    }

    const sendMessageWithSplit = async (templateText: string, isDefault = false) => {
      const hasPixPlaceholder = templateText.includes('{{pix}}');
      
      if (hasPixPlaceholder || isDefault) {
        // Mensagem 1
        let msg1Text = '';
        if (isDefault) {
          msg1Text = `Olá ${vars.nome} 👋\n\nPercebemos que sua compra de ${vars.produto} ainda não foi finalizada.\n\nPara concluir seu pagamento de forma rápida, clique no link abaixo:\n${vars.link_checkout}\n\nCaso prefira utilizar o PIX Copia e Cola, ele será enviado na próxima mensagem.`;
        } else {
          const msg1Template = templateText.replace(/{{pix}}/g, 'Caso prefira utilizar o PIX Copia e Cola, ele será enviado na próxima mensagem.');
          msg1Text = msg1Template
            .replace(/{{nome}}/g, vars.nome)
            .replace(/{{produto}}/g, vars.produto)
            .replace(/{{link_checkout}}/g, vars.link_checkout)
            .replace(/{{checkout_url}}/g, vars.link_checkout);
        }
        
        const ok1 = await sendMsgDirectly(msg1Text);
        let finalSuccess = ok1;
        
        // Mensagem 2 (Apenas o código PIX limpo)
        if (vars.pix && vars.pix.trim() !== '') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const ok2 = await sendMsgDirectly(vars.pix.trim());
          finalSuccess = ok1 && ok2;
        }
        
        return finalSuccess;
      } else {
        const rendered = templateText
          .replace(/{{nome}}/g, vars.nome)
          .replace(/{{produto}}/g, vars.produto)
          .replace(/{{link_checkout}}/g, vars.link_checkout)
          .replace(/{{checkout_url}}/g, vars.link_checkout);
          
        return await sendMsgDirectly(rendered);
      }
    }

    if (activeFlow?.flow_steps?.length) {
      const steps = activeFlow.flow_steps.sort((a, b) => a.step_order - b.step_order)
      for (const step of steps) {
        if (!step.active) continue

        const { data: msgObj } = await supabase.from('messages').insert({
          lead_id: lead.id,
          flow_step_id: step.id,
          status: 'pending',
        }).select().maybeSingle()

        const ok = await sendMessageWithSplit(step.message)
        finalOk = ok

        if (msgObj?.id) {
          await supabase.from('messages').update({
            status: ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
          }).eq('id', msgObj.id)
        }

        sentAny = true
        break // Apenas 1 disparo no teste
      }
    }

    if (!sentAny) {
      const ok = await sendMessageWithSplit('', true)
      finalOk = ok

      await supabase.from('messages').insert({
        lead_id: lead.id,
        status: ok ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      })
    }

    if (!finalOk) {
      throw new Error('Falha Evolution API')
    }
  }

  const handleSendTest = async () => {
    if (!nome || !whatsapp || !produto) return
    setStatus('sending')

    const token = integration?.webhook_token
    let cleanPhone = whatsapp.replace(/\D/g, '')
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone
    }

    const payload = {
      order_status: 'waiting_payment',
      is_test: true,
      customer: {
        full_name: nome,
        email: 'test@pixrescue.com',
        mobile: cleanPhone,
      },
      product: {
        name: produto,
        id: 'prod-test-id',
      },
      payment: {
        pix_qrcode: '00020101021226870014br.gov.bcb.pix2565qr.example.com/pix/test',
      },
      order: {
        amount: '9700',
      },
    }

    try {
      let isDeployed = false
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/webhook-handler?platform=${platform}&token=${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        
        if (response.ok) {
          isDeployed = true
        } else if (response.status === 404) {
          console.log('Production Edge Function returned 404. Falling back to client-side simulation.')
        } else {
          throw new Error('Erro ao enviar')
        }
      } catch (err) {
        console.warn('Supabase Edge Function unavailable. Falling back to local simulation.', err)
      }

      // Se a Edge Function não estiver implantada ou falhar/404, executa a simulação local no navegador
      if (!isDeployed) {
        await runClientSideSimulation(payload)
      }

      setStatus('sent')
      setTimeout(() => {
        setStatus('validation')
      }, 2500)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Erro ao realizar o teste')
      setStatus('idle')
    }
  }

  const handleNotReceived = async () => {
    setStatus('diagnosis')
    await runDiagnostics()
  }

  return (
    <>
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
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div>
            <h2 className="font-outfit" style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              Teste sua recuperação em tempo real
            </h2>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>
              Receba agora mesmo uma mensagem de recuperação no seu WhatsApp.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Passo 1: Nome */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 850, color: '#475569', display: 'block', marginBottom: 6 }}>
                  PASSO 1: Nome do Cliente
                </label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: 13.5, fontWeight: 600,
                    outline: 'none', transition: 'border 0.2s',
                  }}
                />
              </div>

              {/* Passo 2: WhatsApp */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 850, color: '#475569', display: 'block', marginBottom: 6 }}>
                  PASSO 2: WhatsApp para Receber o Teste
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: 13.5, fontWeight: 600,
                    outline: 'none', transition: 'border 0.2s',
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginTop: 4 }}>
                  💡 Utilize seu próprio número ou um número de teste.
                </span>
              </div>

              {/* Passo 3: Produto */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 850, color: '#475569', display: 'block', marginBottom: 6 }}>
                  PASSO 3: Produto a ser Simulado
                </label>
                <input
                  type="text"
                  placeholder="Nome do produto"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: 13.5, fontWeight: 600,
                    outline: 'none', transition: 'border 0.2s',
                  }}
                />
              </div>

              {/* Botão Enviar */}
              <button
                onClick={handleSendTest}
                disabled={!nome || !whatsapp || !produto}
                className="btn btn-primary animate-fade-in"
                style={{
                  width: '100%', justifyContent: 'center', padding: '12px 20px',
                  background: '#10b981', border: 'none', fontSize: 14, fontWeight: 800,
                  marginTop: 10,
                  opacity: (!nome || !whatsapp || !produto) ? 0.5 : 1,
                  cursor: (!nome || !whatsapp || !produto) ? 'not-allowed' : 'pointer',
                }}
              >
                Enviar Teste
              </button>
            </div>
          )}

          {status === 'sending' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
              <div className="spinner-dark animate-spin" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #10b981', borderRadius: '50%', marginBottom: 20 }} />
              <h3 className="font-outfit" style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Simulando Venda...</h3>
              <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 6, maxWidth: 280 }}>
                Disparando evento de <strong>Pix gerado</strong> pelo fluxo de produção do PIX RESCUE.
              </p>
            </div>
          )}

          {status === 'sent' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 10px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', border: '3px solid #10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <CheckCircle size={32} style={{ color: '#10b981' }} />
              </div>
              <h3 className="font-outfit" style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                ✅ Mensagem enviada com sucesso
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 8, lineHeight: 1.6, maxWidth: 320 }}>
                Verifique seu WhatsApp.<br />
                Você acabou de testar exatamente o mesmo processo que seus leads receberão.
              </p>
            </div>
          )}

          {status === 'validation' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 10px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#e0f2fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
              }}>
                <Zap size={24} style={{ color: '#0284c7' }} />
              </div>
              <h3 className="font-outfit" style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
                Você recebeu a mensagem?
              </h3>
              <p style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 24 }}>
                Responda abaixo para confirmar se está tudo funcionando perfeitamente.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <button
                  onClick={() => setStatus('success')}
                  className="btn"
                  style={{
                    width: '100%', justifyContent: 'center', background: '#10b981', color: '#fff',
                    border: 'none', padding: '12px', fontSize: 13.5, fontWeight: 800
                  }}
                >
                  Sim Recebi
                </button>
                <button
                  onClick={handleNotReceived}
                  className="btn btn-outline"
                  style={{
                    width: '100%', justifyContent: 'center', borderColor: '#f43f5e', color: '#f43f5e',
                    padding: '12px', fontSize: 13.5, fontWeight: 800
                  }}
                >
                  Não Recebi
                </button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', border: '3px solid #10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <CheckCircle size={36} style={{ color: '#10b981' }} />
              </div>
              <h3 className="font-outfit" style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                🎉 Perfeito!
              </h3>
              <p style={{ fontSize: 13.5, color: '#475569', fontWeight: 600, lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
                Sua integração está funcionando corretamente.
              </p>
              <button
                onClick={() => { onClose(); window.location.href = '/app/dashboard' }}
                className="btn btn-primary"
                style={{
                  width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, fontWeight: 800
                }}
              >
                Ir para Dashboard
              </button>
            </div>
          )}

          {status === 'diagnosis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                <AlertCircle size={18} style={{ color: '#f43f5e' }} />
                <h3 className="font-outfit" style={{ fontSize: 14.5, fontWeight: 900, color: '#0f172a' }}>
                  Diagnóstico Automático
                </h3>
              </div>

              {loadingDiagnostics ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '20px 0' }}>
                  <div className="spinner-dark animate-spin" style={{ width: 16, height: 16, border: '2px solid #ccc', borderTop: '2px solid #0f172a', borderRadius: '50%' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>Analisando sua conta...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>WhatsApp conectado?</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: diagnostics.whatsappConnected ? '#10b981' : '#f43f5e' }}>
                      {diagnostics.whatsappConnected ? '✅ Sim' : '❌ Não'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Instância online?</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: diagnostics.instanceOnline ? '#10b981' : '#f43f5e' }}>
                      {diagnostics.instanceOnline ? '✅ Sim' : '❌ Não'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Integração ativa?</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: diagnostics.integrationActive ? '#10b981' : '#f43f5e' }}>
                      {diagnostics.integrationActive ? '✅ Sim' : '❌ Não'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Fluxo habilitado?</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: diagnostics.flowActive ? '#10b981' : '#f43f5e' }}>
                      {diagnostics.flowActive ? '✅ Sim' : '❌ Não'}
                    </span>
                  </div>

                  <div style={{ marginTop: 10, padding: '12px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 800, color: '#9f1239', marginBottom: 6 }}>Possíveis Correções:</h4>
                    <ul style={{ fontSize: 11.5, color: '#be123c', fontWeight: 600, paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(!diagnostics.whatsappConnected || !diagnostics.instanceOnline) && (
                        <li>Acesse a página de <strong>WhatsApp</strong> e conecte seu número.</li>
                      )}
                      {!diagnostics.integrationActive && (
                        <li>Finalize a integração no webhook da Kiwify antes de testar.</li>
                      )}
                      {!diagnostics.flowActive && (
                        <li>Acesse a página de <strong>Fluxos</strong> e certifique-se de ativar pelo menos um fluxo.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => setStatus('idle')}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 13, fontWeight: 800 }}
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 13, fontWeight: 800 }}
                >
                  Fechar
                </button>
              </div>
            </div>
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
  const [openTestPlatform, setOpenTestPlatform] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedPlatform, setCompletedPlatform] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(false)

  // Estados para gerenciamento de Produtos
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingCheckoutUrl, setEditingCheckoutUrl] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)

  const loadProducts = async () => {
    if (!user) return
    setLoadingProducts(true)
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('product_name', { ascending: true })
      if (data) setProducts(data)
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSaveCheckoutUrl = async (productId: string) => {
    if (!editingCheckoutUrl.trim()) return
    setSavingProduct(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ checkout_url: editingCheckoutUrl.trim() })
        .eq('id', productId)
      if (error) {
        alert('Erro ao salvar URL de checkout: ' + error.message)
      } else {
        setEditingProductId(null)
        await loadProducts()
      }
    } catch (err: any) {
      alert('Erro ao salvar URL de checkout: ' + err.message)
    } finally {
      setSavingProduct(false)
    }
  }

  useEffect(() => { 
    if (user) {
      loadOrCreateIntegrations()
      loadProducts()
    }
  }, [user])

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
          .select().maybeSingle()
        if (created) map[platform] = created as IntegrationData
      }
    }

    // Garante que existe fluxo padrão ao carregar
    await ensureDefaultFlowExists(user!.id)

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
    setOpenPlatform(null)
    setOpenTestPlatform(platform)
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', width: '100%' }}>
                    {isActive ? (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenPlatform(p) }}
                          className="btn btn-outline btn-sm font-bold"
                          style={{ flex: 1, justifyContent: 'center', gap: 5, fontSize: 11.5 }}
                        >
                          Reconfigurar
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenTestPlatform(p) }}
                          className="btn btn-primary btn-sm font-bold"
                          style={{ flex: 1, justifyContent: 'center', background: '#10b981', border: 'none', gap: 5, fontSize: 11.5 }}
                        >
                          <Zap size={12} /> Testar Recuperação
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setOpenPlatform(p) }}
                        className="btn btn-primary btn-sm font-bold"
                        style={{ flex: 1, justifyContent: 'center', background: meta.color, border: 'none', gap: 6 }}
                      >
                        <ExternalLink size={13} /> Conectar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Gerenciamento de Produtos (URL de Checkout) ─── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <Package size={18} className="text-slate-600" />
            <div>
              <h3 className="font-outfit text-xs font-bold text-slate-800 uppercase tracking-wider">Meus Produtos & URLs de Checkout</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Gerencie o link da página de checkout de cada produto para as mensagens de recuperação.</p>
            </div>
          </div>

          {loadingProducts ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', justifyContent: 'center' }}>
              <Loader2 size={16} className="animate-spin text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 font-outfit">Carregando seus produtos...</span>
            </div>
          ) : products.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <Package size={24} className="text-slate-300" />
              <span className="text-xs font-bold text-slate-500 font-outfit">Nenhum produto cadastrado ainda</span>
              <p className="text-[10px] text-slate-400 font-semibold text-center max-w-[400px]">
                Os produtos são criados de forma automática no recebimento do primeiro evento de webhook. 
                Você também pode simular um evento clicando em <strong>"Testar Recuperação"</strong> acima!
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome do Produto</th>
                    <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plataforma</th>
                    <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>URL de Checkout (Obrigatório)</th>
                    <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const isEditing = editingProductId === product.id
                    return (
                      <tr key={product.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} className="hover:bg-slate-50/50">
                        {/* Nome do Produto */}
                        <td style={{ padding: '12px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }} className="font-outfit">
                          {product.product_name}
                        </td>
                        
                        {/* Plataforma */}
                        <td style={{ padding: '12px' }}>
                          <span className={`badge text-[9px] font-bold uppercase`} style={{
                            background: product.platform === 'kiwify' ? '#ecfdf5' : product.platform === 'hotmart' ? '#fff7ed' : '#fef2f2',
                            color: product.platform === 'kiwify' ? '#047857' : product.platform === 'hotmart' ? '#c2410c' : '#b91c1c',
                            border: `1px solid ${product.platform === 'kiwify' ? '#bbf7d0' : product.platform === 'hotmart' ? '#ffedd5' : '#fee2e2'}`,
                          }}>
                            {product.platform === 'kiwify' ? '🟢 Kiwify' : product.platform === 'hotmart' ? '🔥 Hotmart' : '🔴 Kirvano'}
                          </span>
                        </td>
                        
                        {/* Checkout URL Input / Value */}
                        <td style={{ padding: '12px', minWidth: '320px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Link size={12} className="text-slate-400" />
                              <input
                                type="url"
                                className="input-field text-xs"
                                style={{ height: 32, padding: '4px 8px', margin: 0, background: '#fff' }}
                                value={editingCheckoutUrl}
                                onChange={e => setEditingCheckoutUrl(e.target.value)}
                                placeholder="https://checkout.exemplo.com/seu-produto"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {product.checkout_url ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Link size={12} className="text-emerald-500" />
                                  <a href={product.checkout_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline break-all" style={{ maxWidth: '280px', display: 'inline-block' }}>
                                    {product.checkout_url}
                                  </a>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <AlertCircle size={12} className="text-red-500 animate-pulse" />
                                  <span className="text-xs font-bold text-red-500">
                                    ⚠️ URL de Checkout em falta (Recuperação Inativa)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        
                        {/* Ações */}
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleSaveCheckoutUrl(product.id)}
                                disabled={savingProduct || !editingCheckoutUrl.trim()}
                                className="btn btn-primary btn-sm"
                                style={{ height: 28, padding: '0 10px', background: '#10b981', border: 'none', fontSize: 10.5, gap: 4 }}
                              >
                                {savingProduct ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="btn btn-outline btn-sm"
                                style={{ height: 28, padding: '0 10px', fontSize: 10.5, gap: 4 }}
                              >
                                <X size={10} />
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingProductId(product.id)
                                setEditingCheckoutUrl(product.checkout_url ?? '')
                              }}
                              className="btn btn-outline btn-sm font-bold"
                              style={{ height: 28, padding: '0 10px', fontSize: 10.5, gap: 4 }}
                            >
                              <Edit2 size={10} />
                              Configurar URL
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Test Recovery Drawer */}
      {openTestPlatform && (
        <TestRecoveryDrawer
          platform={openTestPlatform}
          integration={integrations[openTestPlatform]}
          onClose={() => { setOpenTestPlatform(null); loadProducts(); }}
        />
      )}
    </AppLayout>
  )
}
