import { useNavigate } from 'react-router-dom'
import { TrendingUp, Zap, ShieldCheck, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  // Custom Diamond Logo Component
  const Logo = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#0f172a" />
      <path d="M12 6L6 12L12 18L18 12L12 6Z" fill="#ffffff" />
      <path d="M12 9L9 12L12 15L15 12L12 9Z" fill="#0f172a" />
    </svg>
  )

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="font-sans">
      
      {/* Top Navbar */}
      <header style={{
        height: 72,
        background: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <span className="font-outfit" style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', letterSpacing: '0.05em' }}>
            PIX RESCUE
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="hidden md:flex text-sm font-semibold text-slate-500">
          <a href="#beneficios" className="hover:text-slate-900 transition-colors">Benefícios</a>
          <a href="#depoimentos" className="hover:text-slate-900 transition-colors">Depoimentos</a>
          <a href="#funciona" className="hover:text-slate-900 transition-colors">Como Funciona</a>
        </nav>

        <div>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700, padding: '8px 16px', borderRadius: 8 }}
          >
            Acessar Conta
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Main Banner (Fidelidade ao UI Designer: TELA 8) */}
        <section style={{
          padding: '80px 24px 60px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            
            {/* Promo badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ecfdf5',
              border: '1px solid #bbf7d0',
              padding: '6px 14px',
              borderRadius: 50,
              fontSize: 11,
              fontWeight: 700,
              color: '#047857',
              marginBottom: 24,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <Zap size={12} fill="currentColor" /> Recuperação Automática de Vendas
            </span>

            <h1 className="font-outfit" style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 16
            }}>
              Recupere PIX esquecidos <br />
              <span style={{ color: 'var(--green)' }}>automaticamente.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(14px, 2vw, 17px)',
              color: '#64748b',
              lineHeight: 1.6,
              maxWidth: 600,
              margin: '0 auto 36px',
              fontWeight: 500
            }}>
              Transforme PIX pendentes em vendas aprovadas com automações inteligentes. Conecte seu WhatsApp via Evolution API e converta leads perdidos em minutos.
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary btn-lg"
                style={{ background: '#0f172a', border: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                Começar Agora <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-outline btn-lg"
                style={{ fontWeight: 700 }}
              >
                Ver Demonstração
              </button>
            </div>

          </div>
        </section>

        {/* Proof / Stats Section (Fidelidade ao UI Designer: TELA 8 stats bar) */}
        <section style={{
          borderTop: '1px solid #f1f5f9',
          borderBottom: '1px solid #f1f5f9',
          padding: '40px 24px',
          background: '#ffffff'
        }}>
          <div style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 32,
            textAlign: 'center'
          }}>
            {[
              { label: 'Recuperado em vendas', value: 'R$ 8.2M+' },
              { label: 'Contatos criados', value: '12.000+' },
              { label: 'Taxa de satisfação', value: '99%' },
            ].map((stat, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="font-outfit" style={{ fontSize: '38px', fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>{stat.value}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature section */}
        <section id="beneficios" style={{ padding: '80px 24px', background: '#f8fafc' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 className="font-outfit" style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', textAlign: 'center', marginBottom: 48 }}>
              Por que usar o PIX Rescue?
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24
            }}>
              {[
                { icon: TrendingUp, title: 'Alta Taxa de Conversão', desc: 'Recupere até 35% dos PIX gerados que normalmente seriam perdidos sem nenhum esforço.' },
                { icon: Zap, title: 'Disparo Automático', desc: 'Dispare as mensagens automaticamente em janelas de 5m, 30m ou 2h baseando-se em eventos de webhooks.' },
                { icon: ShieldCheck, title: 'Segurança Total', desc: 'Chaves secretas por usuário e total conformidade com as diretrizes do WhatsApp.' },
              ].map((feature, idx) => (
                <div key={idx} className="card" style={{ padding: 28, background: '#ffffff' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#ecfdf5', border: '1px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20
                  }}>
                    <feature.icon size={22} style={{ color: 'var(--green)' }} />
                  </div>
                  <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">{feature.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{
        padding: '32px 24px',
        borderTop: '1px solid #f1f5f9',
        background: '#ffffff',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'space-between' }} className="sm:flex-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo />
            <span className="font-outfit" style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>PIX RESCUE</span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            © {new Date().getFullYear()} PIX RESCUE. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <style>{`
        @media (min-width: 640px) {
          .sm\\:flex-row { flex-direction: row !important; }
        }
      `}</style>
    </div>
  )
}
