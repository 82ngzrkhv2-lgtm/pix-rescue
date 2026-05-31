interface PlanUsageBarProps {
  used: number
  total: number
  label?: string
  unit?: string
  showAlert?: boolean
  alertThreshold?: number
}

function getColor(pct: number) {
  if (pct >= 91) return { bar: '#ef4444', bg: '#fef2f2', text: '#b91c1c', badge: 'badge-red' }
  if (pct >= 71) return { bar: '#f59e0b', bg: '#fffbeb', text: '#b45309', badge: 'badge-yellow' }
  return { bar: '#10b981', bg: '#ecfdf5', text: '#047857', badge: 'badge-green' }
}

export default function PlanUsageBar({
  used,
  total,
  label,
  unit = 'eventos',
  showAlert = true,
  alertThreshold = 80,
}: PlanUsageBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const colors = getColor(pct)
  const isNearLimit = pct >= alertThreshold

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
          <span className={`badge ${colors.badge} text-[10px]`}>{pct}%</span>
        </div>
      )}

      {/* Progress track */}
      <div style={{
        height: 8,
        background: '#f1f5f9',
        borderRadius: 50,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: colors.bar,
          borderRadius: 50,
          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      {/* Numbers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-outfit font-extrabold text-sm" style={{ color: colors.text }}>
          {used.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')} {unit}
        </span>
        <span className="text-[11px] text-slate-400 font-semibold">
          {(total - used).toLocaleString('pt-BR')} restantes
        </span>
      </div>

      {/* Alert banner */}
      {showAlert && isNearLimit && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: pct >= 91 ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${pct >= 91 ? '#fca5a5' : '#fde68a'}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{pct >= 91 ? '🚨' : '⚠️'}</span>
          <div>
            <p style={{
              fontSize: 12,
              fontWeight: 700,
              color: pct >= 91 ? '#991b1b' : '#92400e',
              marginBottom: 2,
            }}>
              Você já utilizou {pct}% dos {unit} do seu plano.
            </p>
            <p style={{ fontSize: 11, color: pct >= 91 ? '#b91c1c' : '#b45309', fontWeight: 500 }}>
              Considere fazer upgrade para continuar recuperando vendas sem interrupções.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
