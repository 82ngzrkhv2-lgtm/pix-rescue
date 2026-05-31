import { useState, useEffect } from 'react'
import { User, Server, Webhook, Save, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface Profile { name: string; plan: string; timezone: string; evolution_api_url: string; evolution_api_key: string }

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (BRT -3)' },
  { value: 'America/Manaus', label: 'Manaus (AMT -4)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (AMT -4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (ACT -5)' },
]

export default function Settings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>({ name: '', plan: 'Pro', timezone: 'America/Sao_Paulo', evolution_api_url: '', evolution_api_key: '' })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [webhooks, setWebhooks] = useState<{ platform: string; token: string }[]>([])

  useEffect(() => {
    if (!user) return
    loadProfile()
    loadWebhooks()
  }, [user])

  const loadProfile = async () => {
    const { data } = await supabase.from('users_profile').select('*').eq('id', user!.id).single()
    if (data) setProfile({
      name: data.name ?? '',
      plan: data.plan ?? 'Pro',
      timezone: data.timezone ?? 'America/Sao_Paulo',
      evolution_api_url: data.evolution_api_url ?? import.meta.env.VITE_EVOLUTION_API_URL ?? '',
      evolution_api_key: data.evolution_api_key ?? '',
    })
  }

  const loadWebhooks = async () => {
    const { data } = await supabase.from('integrations').select('platform, webhook_token').eq('user_id', user!.id)
    setWebhooks(data?.map(d => ({ platform: d.platform, token: d.webhook_token })) ?? [])
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('users_profile').upsert({
      id: user.id,
      email: user.email ?? '',
      name: profile.name,
      plan: profile.plan,
      timezone: profile.timezone,
      evolution_api_url: profile.evolution_api_url,
      evolution_api_key: profile.evolution_api_key,
    })
    if (error) showToast('Erro ao salvar: ' + error.message, false)
    else showToast('Configurações salvas com sucesso!')
    setSaving(false)
  }


  return (
    <AppLayout title="Configurações" subtitle="Gerencie as configurações da sua conta, perfil e Evolution API">
      <div className="space-y-6 animate-fade-in">

        {/* Toast Alert */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 100,
            padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
            background: toast.ok ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${toast.ok ? '#bbf7d0' : '#fee2e2'}`,
            boxShadow: 'var(--shadow-md)',
          }} className="animate-fade-in">
            {toast.ok
              ? <CheckCircle size={15} style={{ color: 'var(--green)' }} />
              : <AlertCircle size={15} style={{ color: 'var(--red)' }} />}
            <span style={{ fontSize: 13, fontWeight: 600, color: toast.ok ? '#047857' : '#b91c1c' }}>{toast.msg}</span>
          </div>
        )}

        {/* Two-Column split layout (Fidelidade ao UI Designer: TELA 7) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Left / Main Section: Profile & API Setup (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Profile Form Card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <User size={16} className="text-slate-600" />
                <h3 className="font-outfit text-xs font-bold text-slate-800 uppercase tracking-wider">Dados do Perfil</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Nome Completo</label>
                  <input
                    className="input-field"
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="label">Endereço de Email</label>
                  <input className="input-field" value={user?.email ?? ''} disabled style={{ background: '#f8fafc' }} />
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">O email não pode ser alterado diretamente por segurança.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Plano de Assinatura</label>
                    <select className="input-field" value={profile.plan} onChange={e => setProfile(p => ({ ...p, plan: e.target.value }))}>
                      <option value="Starter">Starter Plan</option>
                      <option value="Pro">Pro Plan</option>
                      <option value="Elite">Elite Plan</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">Fuso Horário</label>
                    <select className="input-field" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
                      {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Evolution API setup card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <Server size={16} className="text-slate-600" />
                <h3 className="font-outfit text-xs font-bold text-slate-800 uppercase tracking-wider">Conexão Evolution API</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">URL Base da API</label>
                  <input
                    className="input-field"
                    value={profile.evolution_api_url}
                    onChange={e => setProfile(p => ({ ...p, evolution_api_url: e.target.value }))}
                    placeholder="https://sua-evolution-api.cloud"
                  />
                </div>

                <div>
                  <label className="label">Chave de Autenticação (API Key)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input-field"
                      type={showKey ? 'text' : 'password'}
                      style={{ paddingRight: 36 }}
                      value={profile.evolution_api_key}
                      onChange={e => setProfile(p => ({ ...p, evolution_api_key: e.target.value }))}
                      placeholder="evolution_api_key_••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth: '160px' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Alterações
              </button>
            </div>

          </div>

          {/* Right Column: Plan / Subscription Summary (1 col) */}
          <div className="space-y-6">
            
            {/* Plan Card */}
            <div className="card" style={{ padding: 24, borderTop: '4px solid var(--primary)' }}>
              <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Seu Plano Atual</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, padding: '16px 0', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 20 }}>
                <span className="font-outfit text-2xl font-extrabold text-slate-800">{profile.plan} Plan</span>
                <span className="badge badge-green text-[10px] uppercase font-bold">ATIVO</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { desc: 'Recuperação de PIX automática', ok: true },
                  { desc: 'Envios ilimitados de lembretes', ok: true },
                  { desc: 'Painel completo de conversões', ok: true },
                  { desc: 'Integração de checkout nativo', ok: true },
                  { desc: 'Suporte VIP via WhatsApp', ok: profile.plan !== 'Starter' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: item.ok ? 1 : 0.4 }}>
                    <CheckCircle size={14} style={{ color: item.ok ? 'var(--green)' : 'var(--text-muted)' }} />
                    <span className="text-xs font-semibold text-slate-600">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Webhooks info */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Webhook size={14} className="text-slate-500" />
                <h4 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider">Webhooks Ativos</h4>
              </div>

              {webhooks.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">Nenhum webhook integrado. Configure no painel de Plataformas.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {webhooks.map(({ platform }) => (
                    <div key={platform} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      border: '1px solid var(--border)',
                      borderRadius: 8
                    }}>
                      <span className="text-xs font-bold text-slate-600 capitalize">{platform}</span>
                      <span className="badge badge-green text-[9px] font-bold">ONLINE</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  )
}
