import { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Scroll, RefreshCw, AlertCircle } from 'lucide-react'

interface EventRow {
  id: string
  event_type: string
  created_at: string
  revenue: number | null
  platform: string | null
  leads: { name: string; phone: string } | null
  products: { product_name: string } | null
}

const statusBadge: Record<string, { label: string; badge: string }> = {
  pix_generated:     { label: 'PIX Gerado',     badge: 'badge-yellow' },
  pix_paid:          { label: 'PIX Pago',        badge: 'badge-green'  },
  boleto_generated:  { label: 'Boleto Gerado',   badge: 'badge-blue'   },
  purchase_approved: { label: 'Compra Aprovada', badge: 'badge-green'  },
  purchase_canceled: { label: 'Compra Cancelada', badge: 'badge-red'    },
  pix_expired:       { label: 'PIX Expirado',    badge: 'badge-gray'   },
}

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return `+${digits}`
}

export default function Events() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('events')
        .select('id, event_type, created_at, revenue, platform, leads(name,phone), products(product_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setEvents((data ?? []) as any[])
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [user])

  return (
    <AppLayout title="Eventos" subtitle="Auditoria detalhada de webhooks e eventos recebidos das plataformas de pagamento">
      <div className="space-y-6 animate-fade-in">
        
        {/* Top actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Scroll size={20} className="text-slate-600" />
            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">Histórico de Eventos</h3>
          </div>
          <button onClick={loadEvents} disabled={loading} className="btn btn-outline btn-sm font-semibold">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Event logs table (Fidelidade ao UI Designer: TELA 6) */}
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Produto</th>
                  <th>Evento</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}>
                          <div className="skeleton" style={{ height: 14, width: j === 2 ? 140 : 80 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : events.length > 0 ? (
                  events.map(ev => {
                    const badgeCfg = statusBadge[ev.event_type] || { label: ev.event_type, badge: 'badge-gray' }
                    const dateObj = new Date(ev.created_at)
                    const dateStr = dateObj.toLocaleDateString('pt-BR')
                    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <tr key={ev.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.leads?.name ?? '—'}</td>
                        <td className="font-mono text-xs text-slate-500">{ev.leads?.phone ? formatPhone(ev.leads.phone) : '—'}</td>
                        <td className="font-medium">{ev.products?.product_name ?? '—'}</td>
                        <td className="text-xs font-semibold text-slate-400 capitalize">{ev.platform ? `${ev.platform} Webhook` : 'Webhook'}</td>
                        <td>
                          <span className={`badge ${badgeCfg.badge}`}>
                            {badgeCfg.label}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500 font-semibold">{dateStr}</td>
                        <td className="text-xs text-slate-500 font-semibold">{timeStr}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                      Nenhum evento registrado ainda. Vá em <strong>Integrações</strong> para configurar os webhooks das plataformas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
