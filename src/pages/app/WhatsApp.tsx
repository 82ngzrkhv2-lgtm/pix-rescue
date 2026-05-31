import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Power, QrCode, Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import PlanUsageBar from '../../components/PlanUsageBar'
import UpgradeModal from '../../components/UpgradeModal'
import { usePlan } from '../../hooks/usePlan'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const EVOLUTION_URL = import.meta.env.DEV ? '/evolution-api' : import.meta.env.VITE_EVOLUTION_API_URL
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY

async function evolutionRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    ...options,
    headers: {
      'apikey': EVOLUTION_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errorMsg = data?.response?.message?.[0] || data?.message || `HTTP ${res.status}`
    throw new Error(errorMsg)
  }
  return data
}

export default function WhatsApp() {
  const { user } = useAuth()
  const instanceName = `pixrescue-${user?.id?.slice(0, 8) ?? 'user'}`
  const { plan, limits, usage } = usePlan()
  const atLimit = usage.whatsapps >= limits.whatsapps
  const [upgradeModal, setUpgradeModal] = useState(false)

  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [phone, setPhone] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    checkConnectionState()
    return () => stopPolling()
  }, [])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const checkConnectionState = async () => {
    try {
      const data = await evolutionRequest(`/instance/connectionState/${instanceName}`)
      const state = data?.instance?.state ?? data?.state
      if (state === 'open') {
        setStatus('connected')
        const phoneNumber = data?.instance?.profileName || data?.instance?.wuid?.split('@')[0]
        if (phoneNumber) setPhone(formatPhone(phoneNumber))
        stopPolling()
        await saveInstanceToDb('connected', phoneNumber)
      } else if (state === 'connecting' || state === 'qr') {
        setStatus('connecting')
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 13) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
    }
    return `+${digits}`
  }

  const saveInstanceToDb = async (st: string, ph?: string) => {
    if (!user) return
    try {
      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('whatsapp_instances')
          .update({
            status: st,
            phone: ph ?? null,
            instance_name: instanceName,
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('whatsapp_instances')
          .insert({
            user_id: user.id,
            instance_name: instanceName,
            status: st,
            phone: ph ?? null,
          })
      }
    } catch (err) {
      console.error('Error saving instance to DB:', err)
    }
  }

  const startPollingStatus = () => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const data = await evolutionRequest(`/instance/connectionState/${instanceName}`)
        const state = data?.instance?.state ?? data?.state
        if (state === 'open') {
          setStatus('connected')
          const phoneNumber = data?.instance?.profileName || data?.instance?.wuid?.split('@')[0]
          if (phoneNumber) setPhone(formatPhone(phoneNumber))
          setQrCode(null)
          stopPolling()
          await saveInstanceToDb('connected', phoneNumber)
        }
      } catch { /* continua polling */ }
    }, 3000)
  }

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    setStatus('connecting')

    try {
      try {
        await evolutionRequest('/instance/create', {
          method: 'POST',
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        })
      } catch (e: any) {
        if (!e.message?.includes('already') && !e.message?.includes('in use')) throw e
      }

      await new Promise(r => setTimeout(r, 1500))
      const qrData = await evolutionRequest(`/instance/connect/${instanceName}`)
      const base64 = qrData?.base64 ?? qrData?.qrcode?.base64 ?? qrData?.code

      if (base64) {
        setQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`)
        await saveInstanceToDb('connecting')
        startPollingStatus()
      } else {
        throw new Error('QR Code não retornado pela Evolution API')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar. Verifique a Evolution API.')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleReconnect = async () => {
    setQrCode(null)
    setPhone(null)
    setStatus('disconnected')
    stopPolling()
    await handleConnect()
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await evolutionRequest(`/instance/logout/${instanceName}`, { method: 'DELETE' })
    } catch { /* ignora */ }
    setStatus('disconnected')
    setPhone(null)
    setQrCode(null)
    stopPolling()
    await saveInstanceToDb('disconnected')
    setLoading(false)
  }

  return (
    <>
    <AppLayout title="WhatsApp" subtitle="Integre seu WhatsApp via Evolution API para disparar mensagens instantâneas">
      <div className="animate-fade-in space-y-6">

        {/* Plan usage counter */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApps Conectados</h3>
            <span className="badge badge-gray text-[10px]">{plan}</span>
          </div>
          <PlanUsageBar used={usage.whatsapps} total={limits.whatsapps} unit="números" showAlert={false} />
          {atLimit && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                🚑 Você atingiu o limite de números do seu plano.
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

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Two-Column split layout (Fidelidade ao UI Designer: TELA 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Column 1: Connection Status & Details */}
          <div className="space-y-6">
            
            {/* Connection Status Card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                {status === 'connected' ? (
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: '#ecfdf5', border: '1px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center'
                  }}>
                    <Wifi size={24} style={{ color: 'var(--green)' }} />
                  </div>
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: '#fef2f2', border: '1px solid #fee2e2',
                    display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center'
                  }}>
                    <WifiOff size={24} style={{ color: 'var(--red)' }} />
                  </div>
                )}
                <div>
                  <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">Status do WhatsApp</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span className={`status-dot ${status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected'}`} style={{ width: 6, height: 6 }} />
                    <span className="text-xs font-semibold" style={{ color: status === 'connected' ? 'var(--green-dark)' : 'var(--text-secondary)' }}>
                      {status === 'connected' ? 'WhatsApp Conectado' : status === 'connecting' ? 'Aguardando QR Code...' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status details list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="divider-list">
                {[
                  { label: 'Última atualização', value: status === 'connected' ? 'Hoje, às 14:32' : 'Nenhuma' },
                  { label: 'Número Conectado', value: phone ?? 'Nenhum' },
                  { label: 'Mensagens enviadas hoje', value: status === 'connected' ? '245 mensagens' : '—' },
                  { label: 'Conversas ativas hoje', value: status === 'connected' ? '82 conversas' : '—' },
                  { label: 'Taxa de entrega', value: status === 'connected' ? '98.2%' : '—' },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 10,
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span className="text-xs font-medium text-slate-400">{item.label}</span>
                    <span className="font-outfit text-xs font-extrabold text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick how-to card */}
            <div className="card" style={{ padding: 20 }}>
              <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Como conectar o número</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { num: '1', text: 'Clique em "Conectar WhatsApp" no painel ao lado.' },
                  { num: '2', text: 'Abra o WhatsApp em seu smartphone principal.' },
                  { num: '3', text: 'Acesse Aparelhos conectados e escolha Conectar dispositivo.' },
                  { num: '4', text: 'Aponte a câmera para ler o QR Code exibido ao lado.' },
                ].map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--primary-light)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: 'var(--primary)', flexShrink: 0
                    }}>{step.num}</div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Column 2: Connect / QR Code card */}
          <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: 380 }}>
            <h3 className="font-outfit text-base font-bold text-slate-800 mb-2">Conectar o número</h3>
            <p className="text-slate-400 text-xs font-medium mb-6 max-w-xs">
              Escaneie o QR Code gerado pelo sistema para ativar os disparos automáticos via Evolution API.
            </p>

            {/* QR Code Container */}
            <div style={{
              width: 230,
              height: 230,
              borderRadius: 'var(--radius-lg)',
              background: '#ffffff',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginBottom: 20
            }}>
              {qrCode && status === 'connecting' ? (
                <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 200, height: 200, display: 'block', borderRadius: 8 }} />
              ) : status === 'connected' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={32} style={{ color: 'var(--green)' }} />
                  </div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Dispositivo Ativo</span>
                </div>
              ) : loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={32} className="animate-spin text-slate-400" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gerando QR...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <QrCode size={48} className="text-slate-300" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sem Conexão</span>
                </div>
              )}
            </div>

            {/* Action text under QR */}
            {status === 'connecting' && qrCode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Loader2 size={12} className="animate-spin text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">Aguardando escaneamento no celular (verifica a cada 3s)...</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center', marginTop: 'auto' }}>
              {status === 'connected' ? (
                <>
                  <button onClick={handleReconnect} disabled={loading} className="btn btn-outline" style={{ flex: 1 }}>
                    <RefreshCw size={14} /> Reconectar
                  </button>
                  <button onClick={handleDisconnect} disabled={loading} className="btn btn-danger" style={{ flex: 1 }}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                    Desconectar
                  </button>
                </>
              ) : status === 'connecting' ? (
                <>
                  <button onClick={handleConnect} disabled={loading} className="btn btn-outline" style={{ flex: 1 }}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Novo QR Code
                  </button>
                  <button onClick={() => { stopPolling(); setStatus('disconnected'); setQrCode(null) }} className="btn btn-danger" style={{ flex: 1 }}>
                    Cancelar
                  </button>
                </>
              ) : atLimit ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
                  <button
                    disabled
                    className="btn btn-primary"
                    style={{ width: '100%', maxWidth: '240px', opacity: 0.4, cursor: 'not-allowed' }}
                  >
                    <QrCode size={14} /> Conectar WhatsApp
                  </button>
                  <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                    Limite atingido. Faça upgrade para conectar mais números.
                  </p>
                </div>
              ) : (
                <button id="whatsapp-connect" onClick={handleConnect} disabled={loading} className="btn btn-primary" style={{ width: '100%', maxWidth: '240px' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  {loading ? 'Inicializando...' : 'Conectar WhatsApp'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>

    {upgradeModal && (
      <UpgradeModal
        trigger="whatsapps"
        currentPlan={plan}
        onClose={() => setUpgradeModal(false)}
      />
    )}
    </>
  )
}
