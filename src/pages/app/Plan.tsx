import { useState } from 'react'
import {
  CreditCard, Zap, MessageSquare, Plug, Clock,
  CheckCircle, ArrowUpRight, CalendarDays, History
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import PlanUsageBar from '../../components/PlanUsageBar'
import UpgradeModal from '../../components/UpgradeModal'
import { usePlan, PLAN_LIMITS } from '../../hooks/usePlan'

const PLAN_FEATURES: Record<string, string[]> = {
  Starter: [
    '1.000 eventos/mês',
    '1 WhatsApp conectado',
    '1 plataforma de pagamento',
    '7 dias de histórico',
    'Fluxos de recuperação automática',
    'Suporte via chat',
  ],
  Pro: [
    '5.000 eventos/mês',
    '1 WhatsApp conectado',
    '1 plataforma de pagamento',
    '30 dias de histórico',
    'Fluxos de recuperação automática',
    'Métricas avançadas',
    'Suporte prioritário',
  ],
  Elite: [
    '20.000 eventos/mês',
    '3 WhatsApps conectados',
    '3 plataformas de pagamento',
    '90 dias de histórico',
    'Fluxos de recuperação automática',
    'Métricas avançadas + ROI',
    'Suporte VIP via WhatsApp',
    'Acesso antecipado a novidades',
  ],
}

const PLAN_ORDER = ['Starter', 'Pro', 'Elite']
const PLAN_PRICES: Record<string, number> = { Starter: 67, Pro: 147, Elite: 297 }

export default function Plan() {
  const { plan, limits, usage, eventsPct, renewalDate, roi } = usePlan()
  const [upgradeModal, setUpgradeModal] = useState<'events' | 'whatsapps' | 'platforms' | 'history' | null>(null)

  const nextPlanIdx = PLAN_ORDER.indexOf(plan) + 1
  const nextPlan = PLAN_ORDER[nextPlanIdx] ?? null
  const nextLimits = nextPlan ? PLAN_LIMITS[nextPlan] : null

  const renewalStr = renewalDate
    ? renewalDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <AppLayout title="Meu Plano" subtitle="Resumo da sua assinatura, uso e recursos disponíveis">
      <div className="space-y-6 animate-fade-in">

        {/* Top Row: Plan summary + renewal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Current plan card */}
          <div className="card md:col-span-2" style={{ padding: 24, borderTop: '4px solid #0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="font-outfit text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Plano Atual</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="font-outfit text-3xl font-extrabold text-slate-800">{plan}</span>
                  <span className="badge badge-green text-[10px] uppercase font-bold">ATIVO</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <CalendarDays size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400">
                    Renovação em: <strong className="text-slate-600">{renewalStr}</strong>
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="font-outfit text-xs font-bold text-slate-400 block mb-1">Mensalidade</span>
                <span className="font-outfit text-2xl font-extrabold text-slate-800">
                  R$ {PLAN_PRICES[plan] ?? 0}/mês
                </span>
              </div>
            </div>

            {/* ROI highlight */}
            {usage.revenueThisMonth > 0 && (
              <div style={{
                marginTop: 20, padding: '12px 16px',
                background: '#ecfdf5', border: '1px solid #bbf7d0',
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10
              }}>
                <ArrowUpRight size={18} className="text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    R$ {usage.revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recuperados este mês
                    {' '}— ROI estimado de <strong>{roi.toLocaleString('pt-BR')}%</strong>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Seu plano custa apenas R$ {PLAN_PRICES[plan]}/mês e já retornou muito mais.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              {nextPlan && (
                <button
                  onClick={() => setUpgradeModal('events')}
                  className="btn btn-primary font-semibold"
                  style={{ gap: 8 }}
                >
                  <Zap size={14} fill="currentColor" /> Fazer Upgrade para {nextPlan}
                </button>
              )}
              <button className="btn btn-outline font-semibold">
                <CreditCard size={14} /> Gerenciar Assinatura
              </button>
            </div>
          </div>

          {/* Quick stats card */}
          <div className="card" style={{ padding: 24 }}>
            <span className="font-outfit text-xs font-bold text-slate-400 uppercase tracking-wider block mb-16">
              Resumo de Uso
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Zap, label: 'Eventos', value: `${usage.events.toLocaleString('pt-BR')} / ${limits.events.toLocaleString('pt-BR')}` },
                { icon: MessageSquare, label: 'WhatsApps', value: `${usage.whatsapps} / ${limits.whatsapps}` },
                { icon: Plug, label: 'Plataformas', value: `${usage.platforms} / ${limits.platforms}` },
                { icon: History, label: 'Histórico', value: `${limits.historyDays} dias` },
              ].map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingBottom: 10, borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <item.icon size={13} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                  </div>
                  <span className="font-outfit text-xs font-extrabold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage bars section */}
        <div>
          <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Uso Detalhado dos Recursos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="card card-hover cursor-pointer"
              style={{ padding: 20 }}
              onClick={() => eventsPct >= 80 ? setUpgradeModal('events') : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Zap size={15} className="text-slate-500" />
                <span className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Eventos este Mês</span>
              </div>
              <PlanUsageBar used={usage.events} total={limits.events} unit="eventos" />
            </div>

            <div
              className="card card-hover cursor-pointer"
              style={{ padding: 20 }}
              onClick={() => usage.whatsapps >= limits.whatsapps ? setUpgradeModal('whatsapps') : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <MessageSquare size={15} className="text-slate-500" />
                <span className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApps Conectados</span>
              </div>
              <PlanUsageBar used={usage.whatsapps} total={limits.whatsapps} unit="números" showAlert={false} />
            </div>

            <div
              className="card card-hover cursor-pointer"
              style={{ padding: 20 }}
              onClick={() => usage.platforms >= limits.platforms ? setUpgradeModal('platforms') : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Plug size={15} className="text-slate-500" />
                <span className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Plataformas Ativas</span>
              </div>
              <PlanUsageBar used={usage.platforms} total={limits.platforms} unit="plataformas" showAlert={false} />
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={15} className="text-slate-500" />
                <span className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico de Eventos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="font-outfit font-extrabold text-2xl text-slate-800">{limits.historyDays}</span>
                <span className="text-sm font-semibold text-slate-500">dias de histórico disponível</span>
              </div>
              {limits.historyDays < 90 && (
                <button
                  onClick={() => setUpgradeModal('history')}
                  className="btn btn-outline btn-sm font-semibold mt-3"
                  style={{ fontSize: 11 }}
                >
                  <ArrowUpRight size={11} /> Ver planos com mais histórico
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Features comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current plan features */}
          <div className="card" style={{ padding: 24 }}>
            <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Recursos do seu Plano ({plan})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(PLAN_FEATURES[plan] ?? []).map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-slate-600">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next plan features */}
          {nextPlan && nextLimits && (
            <div className="card" style={{ padding: 24, border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Plano {nextPlan} — desbloqueie mais
                </h3>
                <span className="badge badge-purple text-[10px]">UPGRADE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(PLAN_FEATURES[nextPlan] ?? []).map((feat, idx) => {
                  const currentFeats = PLAN_FEATURES[plan] ?? []
                  const isNew = !currentFeats.includes(feat)
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isNew ? 1 : 0.4 }}>
                      {isNew
                        ? <Zap size={14} style={{ color: '#6366f1', flexShrink: 0 }} fill="#6366f1" />
                        : <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                      }
                      <span className="text-xs font-semibold text-slate-600">
                        {feat}
                        {isNew && <span className="badge badge-purple text-[9px] ml-2">NOVO</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => setUpgradeModal('events')}
                className="btn btn-primary font-semibold mt-5"
                style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              >
                <Zap size={13} fill="currentColor" />
                Fazer Upgrade — R$ {PLAN_PRICES[nextPlan]}/mês
              </button>
            </div>
          )}
        </div>

      </div>

      {upgradeModal && (
        <UpgradeModal
          trigger={upgradeModal}
          currentPlan={plan}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </AppLayout>
  )
}
