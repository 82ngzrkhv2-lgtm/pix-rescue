import { ArrowRight, X, Zap } from 'lucide-react'

interface UpgradeModalProps {
  trigger: 'events' | 'whatsapps' | 'platforms' | 'history'
  currentPlan: string
  onClose: () => void
  onUpgrade?: () => void
}

const MESSAGES: Record<string, { title: string; body: string; emoji: string }> = {
  events: {
    emoji: '⚡',
    title: 'Você está aproveitando muito bem seu plano!',
    body: 'Seus eventos estão chegando ao limite. Faça upgrade agora e continue recuperando vendas sem interrupções.',
  },
  whatsapps: {
    emoji: '📱',
    title: 'Limite de WhatsApps atingido!',
    body: 'Você atingiu o limite de números conectados do seu plano. Faça upgrade para conectar mais números e recuperar mais vendas.',
  },
  platforms: {
    emoji: '🔌',
    title: 'Limite de plataformas atingido!',
    body: 'Você atingiu o limite de integrações ativas. Faça upgrade para conectar mais plataformas de pagamento.',
  },
  history: {
    emoji: '📊',
    title: 'Histórico de eventos limitado!',
    body: 'Seu plano atual permite visualizar apenas um histórico reduzido. Faça upgrade para acessar dados completos e tomar decisões mais precisas.',
  },
}

const NEXT_PLAN: Record<string, string> = {
  Starter: 'Pro',
  Pro: 'Elite',
  Elite: 'Elite',
}

export default function UpgradeModal({ trigger, currentPlan, onClose, onUpgrade }: UpgradeModalProps) {
  const msg = MESSAGES[trigger] ?? MESSAGES['events']
  const nextPlan = NEXT_PLAN[currentPlan] ?? 'Pro'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{ width: '100%', maxWidth: 440, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #10b981, #6366f1)' }} />

        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: '#ecfdf5', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {msg.emoji}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, marginTop: -4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 0' }}>
          <h2 className="font-outfit" style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.3 }}>
            {msg.title}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, fontWeight: 500 }}>
            {msg.body}
          </p>
        </div>

        {/* Plan comparison strip */}
        <div style={{ margin: '20px 24px', padding: '14px 18px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <span className="font-outfit text-xs font-bold text-slate-400 uppercase block">Plano Atual</span>
              <span className="font-outfit text-lg font-extrabold text-slate-700">{currentPlan}</span>
            </div>
            <ArrowRight size={20} className="text-slate-300" />
            <div style={{ textAlign: 'center' }}>
              <span className="font-outfit text-xs font-bold text-green-600 uppercase block">Recomendado</span>
              <span className="font-outfit text-lg font-extrabold text-green-700">{nextPlan}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { onUpgrade?.(); onClose() }}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 8, fontWeight: 700 }}
          >
            <Zap size={15} fill="currentColor" /> Fazer Upgrade para {nextPlan}
          </button>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', color: '#64748b', fontWeight: 600 }}
          >
            Continuar no Plano Atual
          </button>
        </div>
      </div>
    </div>
  )
}
