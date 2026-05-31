import { type ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Plug, GitBranch, Settings,
  LogOut, Menu, X, Scroll, CreditCard
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface AppLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

const NAV = [
  { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/whatsapp',     icon: MessageSquare,   label: 'WhatsApp' },
  { to: '/app/integrations', icon: Plug,            label: 'Integrações' },
  { to: '/app/flows',        icon: GitBranch,       label: 'Fluxos' },
  { to: '/app/events',       icon: Scroll,          label: 'Eventos' },
  { to: '/app/plan',         icon: CreditCard,      label: 'Meu Plano' },
  { to: '/app/settings',     icon: Settings,        label: 'Configurações' },
]

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'US'
  const email = user?.email ?? ''

  // Custom Diamond Logo Component (Fidelidade ao UI Designer)
  const Logo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 transition-transform duration-200 hover:scale-105">
      <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#0f172a" />
      <path d="M12 6L6 12L12 18L18 12L12 6Z" fill="#ffffff" />
      <path d="M12 9L9 12L12 15L15 12L12 9Z" fill="#0f172a" />
    </svg>
  )

  const Sidebar = () => (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      padding: '20px 0',
      flexShrink: 0,
    }}>
      {/* Navigation Icons Only */}
      <nav style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '0 8px'
      }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              width: 48,
              height: 48,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: isActive ? '#0f172a' : '#94a3b8',
              background: isActive ? '#f1f5f9' : 'transparent',
              border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            })}
            className="group"
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={`transition-transform group-hover:scale-105 ${isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
                
                {/* Active left indicator bar */}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: -8,
                    top: '25%',
                    height: '50%',
                    width: 3,
                    background: '#0f172a',
                    borderRadius: '0 4px 4px 0'
                  }} />
                )}

                {/* Premium tooltip */}
                <div style={{
                  position: 'absolute',
                  left: 60,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  pointerEvents: 'none',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'opacity 0.15s ease',
                  zIndex: 60
                }} className="group-hover:opacity-100 font-outfit">
                  {label}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout button at bottom of sidebar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        padding: '0 8px'
      }}>
        <button
          onClick={handleSignOut}
          title="Sair da Conta"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#ef4444'
            e.currentTarget.style.background = '#fef2f2'
            e.currentTarget.style.borderColor = '#fee2e2'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#94a3b8'
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Header Global (Fidelidade ao UI Designer) */}
      <header style={{
        height: 64,
        background: '#ffffff',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 30,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo />
            <div>
              <span className="font-outfit" style={{ fontWeight: 900, fontSize: 16, color: '#0f172a', letterSpacing: '0.05em' }}>
                PIX RESCUE
              </span>
            </div>
          </div>

          <div style={{
            width: 1,
            height: 16,
            background: 'var(--border)',
            margin: '0 12px'
          }} className="hidden md:block" />

          {/* Subtitle in Header */}
          <p className="text-slate-400 text-xs hidden md:block" style={{ fontWeight: 500 }}>
            Recupere vendas perdidas automaticamente pelo WhatsApp
          </p>
        </div>

        {/* User profile & status right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 50,
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            fontSize: 11,
            fontWeight: 600,
            color: '#047857',
          }} className="hidden sm:flex">
            <span className="status-dot connected" style={{ width: 6, height: 6 }} />
            Recuperador ativo
          </div>

          {/* Profile Circle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div className="hidden lg:block text-left" style={{ lineHeight: 1.2 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{email.split('@')[0]}</p>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Plano Elite</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar desktop */}
        <div className="hidden md:flex" style={{ flexDirection: 'column', height: '100%', flexShrink: 0 }}>
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, top: 64, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
            className="md:hidden"
          />
        )}

        {/* Mobile sidebar */}
        <div className="md:hidden" style={{
          position: 'fixed',
          left: 0,
          top: 64,
          bottom: 0,
          width: 'var(--sidebar-width)',
          zIndex: 50,
          background: 'white',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-app)' }}>
          {/* Internal view header */}
          <div style={{
            padding: '20px 24px 8px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <h2 className="font-outfit text-xl font-extrabold text-slate-800" style={{ lineHeight: 1.1 }}>{title}</h2>
            {subtitle && <p className="text-slate-400 text-xs font-medium">{subtitle}</p>}
          </div>

          <main style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
            {children}
          </main>
        </div>
      </div>

      <style>{`
        .hidden { display: none; }
        @media (min-width: 768px) {
          .hidden.md\\:flex { display: flex !important; }
          .md\\:hidden { display: none !important; }
        }
        @media (min-width: 640px) {
          .sm\\:flex { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
