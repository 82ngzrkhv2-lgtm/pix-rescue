import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Zap, ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPassword(email)
    if (error) {
      setError('Não foi possível enviar o email. Tente novamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, var(--bg-primary) 70%)' }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #7c3aed, #00d26a)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            PIX <span className="gradient-text">RESCUE</span>
          </h1>
        </div>

        <div className="glass-card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--accent-green-dim)' }}>
                <CheckCircle size={32} style={{ color: 'var(--accent-green)' }} />
              </div>
              <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Email enviado!</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Enviamos um link de recuperação para <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Verifique sua caixa de entrada.
              </p>
              <Link to="/login" className="btn btn-outline">
                <ArrowLeft size={16} /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-purple-dim)' }}>
                  <Mail size={20} style={{ color: '#a78bfa' }} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Recuperar senha</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enviaremos um link para seu email</p>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="seu@email.com"
                    required
                    autoFocus
                  />
                </div>
                <button id="forgot-submit" type="submit" disabled={loading} className="btn btn-primary btn-lg w-full justify-center">
                  {loading ? <span className="spinner" /> : null}
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  <ArrowLeft size={14} /> Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
