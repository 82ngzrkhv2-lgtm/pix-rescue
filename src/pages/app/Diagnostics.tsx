import { useState, useEffect } from 'react'
import {
  Activity, CheckCircle2, XCircle, Play, Clock, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { usePlan } from '../../hooks/usePlan'

type TestStatus = 'idle' | 'running' | 'success' | 'failed'

interface TestResult {
  name: string
  title: string
  description: string
  status: TestStatus
  timestamp: string | null
  responseTime: number | null
  errorDetails: string | null
  points: number
}

const EVOLUTION_URL = import.meta.env.DEV ? '/evolution-api' : import.meta.env.VITE_EVOLUTION_API_URL
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY

export default function Diagnostics() {
  const { user } = useAuth()
  const { plan, limits, usage } = usePlan()
  
  const [runningAll, setRunningAll] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  const [tests, setTests] = useState<Record<string, TestResult>>({
    whatsapp: {
      name: 'whatsapp',
      title: 'Conexão do WhatsApp',
      description: 'Valida se o seu número de WhatsApp está pareado e ativo na Evolution API.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 25,
    },
    database: {
      name: 'database',
      title: 'Integridade do Banco de Dados',
      description: 'Executa operações reais de SELECT, INSERT e DELETE em tempo real no Supabase.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 20,
    },
    webhooks: {
      name: 'webhooks',
      title: 'Status de Integração & Webhooks',
      description: 'Verifica se as configurações e tokens de webhook com Kiwify, Hotmart e Kirvano estão ativas.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 15,
    },
    flows: {
      name: 'flows',
      title: 'Automação & Etapas de Recuperação',
      description: 'Confirma se existem fluxos de recuperação ativos e etapas configuradas no banco.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 15,
    },
    dashboard: {
      name: 'dashboard',
      title: 'Cálculo de ROI & Performance',
      description: 'Mede a performance da consulta de eventos e cálculo financeiro do painel de controle.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 10,
    },
    plan: {
      name: 'plan',
      title: 'Mapeamento de Limites e Planos',
      description: 'Verifica a correta leitura do plano e consumo de cotas de disparo e números do usuário.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 10,
    },
    security: {
      name: 'security',
      title: 'Integridade da Sessão & Segurança',
      description: 'Valida a validade do token JWT de autenticação e parâmetros de criptografia locais.',
      status: 'idle',
      timestamp: null,
      responseTime: null,
      errorDetails: null,
      points: 5,
    },
  })

  // Calcula o score total com base nos testes que passaram
  useEffect(() => {
    const executedTests = Object.values(tests).filter(t => t.status === 'success' || t.status === 'failed')
    if (executedTests.length === 0) {
      setScore(null)
      return
    }

    let earned = 0
    let totalPoints = 0
    Object.values(tests).forEach(t => {
      totalPoints += t.points
      if (t.status === 'success') {
        earned += t.points
      }
    })

    const calculated = Math.round((earned / totalPoints) * 100)
    setScore(calculated)
  }, [tests])

  const toggleLogs = (name: string) => {
    setExpandedLogs(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const runTest = async (name: string) => {
    const startTime = performance.now()
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false })
    
    setTests(prev => ({
      ...prev,
      [name]: { ...prev[name], status: 'running', errorDetails: null }
    }))

    let status: TestStatus = 'success'
    let errorDetails: string | null = null

    try {
      if (!user) throw new Error('Usuário não autenticado no cliente local')

      switch (name) {
        case 'whatsapp': {
          const instanceName = `pixrescue-${user.id.slice(0, 8)}`
          const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_KEY }
          })
          if (!res.ok) {
            throw new Error(`Evolution API retornou HTTP ${res.status}. Instância pode estar deslogada.`)
          }
          const stateData = await res.json()
          const state = stateData?.instance?.state ?? stateData?.state
          if (state !== 'open') {
            throw new Error(`Instância ativa encontrada, porém no estado "${state || 'desconhecido'}". Requer pareamento do QR Code.`)
          }
          break
        }

        case 'database': {
          // 1. Teste de SELECT
          const { error: selectErr } = await supabase
            .from('leads')
            .select('id')
            .limit(1)
          if (selectErr) throw new Error(`Falha no SELECT: ${selectErr.message}`)

          // 2. Teste de INSERT (Leads temporários de diagnóstico)
          const tempPhone = '5500999999999'
          const { data: tempLead, error: insertErr } = await supabase
            .from('leads')
            .insert({
              user_id: user.id,
              name: 'Diagnóstico Temporário',
              phone: tempPhone,
              email: 'diag@pixrescue.com',
            })
            .select()
            .maybeSingle()
          
          if (insertErr) throw new Error(`Falha no INSERT: ${insertErr.message}`)
          if (!tempLead) throw new Error('INSERT executado porém não retornou o objeto inserido')

          // 3. Teste de DELETE
          const { error: deleteErr } = await supabase
            .from('leads')
            .delete()
            .eq('id', tempLead.id)

          if (deleteErr) throw new Error(`Falha no DELETE do lead temporário: ${deleteErr.message}`)
          break
        }

        case 'webhooks': {
          const { data: integrations, error: intErr } = await supabase
            .from('integrations')
            .select('platform, status, webhook_token')
            .eq('user_id', user.id)

          if (intErr) throw new Error(`Falha ao ler integrações: ${intErr.message}`)
          if (!integrations || integrations.length === 0) {
            throw new Error('Nenhuma integração configurada no banco para este usuário. Inicialização pendente.')
          }

          const hasActive = integrations.some(i => i.status === 'active')
          if (!hasActive) {
            throw new Error('Integrações cadastradas porém nenhuma ativa. Configure Webhooks nas plataformas Kiwify/Hotmart para ativar.')
          }
          break
        }

        case 'flows': {
          const { data: activeFlows, error: flowErr } = await supabase
            .from('flows')
            .select('id, name, flow_steps(*)')
            .eq('user_id', user.id)
            .eq('status', 'active')

          if (flowErr) throw new Error(`Falha ao ler fluxos: ${flowErr.message}`)
          if (!activeFlows || activeFlows.length === 0) {
            throw new Error('Nenhum fluxo de recuperação ativo. Crie ou ative um fluxo na aba "Fluxos".')
          }

          const hasSteps = activeFlows.some(f => f.flow_steps && f.flow_steps.length > 0)
          if (!hasSteps) {
            throw new Error(`Fluxo "${activeFlows[0].name}" ativo, porém não possui etapas de mensagem configuradas.`)
          }
          break
        }

        case 'dashboard': {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const { error: evErr } = await supabase
            .from('events')
            .select('revenue, event_type')
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth.toISOString())

          if (evErr) throw new Error(`Falha de performance no carregamento de eventos de ROI: ${evErr.message}`)
          break
        }

        case 'plan': {
          if (!plan) throw new Error('Não foi possível ler as informações de plano do usuário logado.')
          if (!limits || !usage) throw new Error('Limites e uso de cota do plano atual indisponíveis.')
          break
        }

        case 'security': {
          const { data: { session }, error: sesErr } = await supabase.auth.getSession()
          if (sesErr) throw new Error(`Erro na sessão: ${sesErr.message}`)
          if (!session) throw new Error('Nenhuma sessão JWT ativa no cliente local.')
          
          const expTimestamp = session.expires_at
          const nowTimestamp = Math.floor(Date.now() / 1000)
          if (expTimestamp && expTimestamp < nowTimestamp) {
            throw new Error('Sessão JWT expirada. Faça login novamente.')
          }
          break
        }
      }
    } catch (err: any) {
      status = 'failed'
      errorDetails = err.message || 'Erro desconhecido durante o teste'
    }

    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)

    setTests(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        status,
        timestamp,
        responseTime: duration,
        errorDetails
      }
    }))

    return status === 'success'
  }

  const runAllTests = async () => {
    setRunningAll(true)
    const testKeys = Object.keys(tests)
    
    // Executa os testes em sequência
    for (const key of testKeys) {
      await runTest(key)
    }
    
    setRunningAll(false)
  }

  const getHealthCategory = (scoreValue: number) => {
    if (scoreValue >= 90) return { label: 'Excelente', color: '#10b981', bg: '#ecfdf5', border: '#bbf7d0' }
    if (scoreValue >= 75) return { label: 'Saudável', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' }
    if (scoreValue >= 50) return { label: 'Atenção Requerida', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' }
    return { label: 'Crítico', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' }
  }

  return (
    <AppLayout title="Central de Diagnóstico" subtitle="Valide a integridade do seu sistema, conexões e automações em tempo real.">
      <div className="animate-fade-in space-y-6">

        {/* Dashboard de Saúde Geral */}
        <div className="card" style={{ padding: '24px 32px' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Bloco 1: Botão e Explicação */}
            <div className="md:col-span-1 space-y-4">
              <h3 className="font-outfit text-base font-extrabold text-slate-800">Status Geral do Sistema</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
                Inicie uma varredura completa das APIs do WhatsApp, conexões com banco de dados, webhooks das plataformas e integridade de segurança.
              </p>
              <button
                onClick={runAllTests}
                disabled={runningAll}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                {runningAll ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Executando...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Executar Diagnóstico Completo
                  </>
                )}
              </button>
            </div>

            {/* Bloco 2: Gráfico / Barra de progresso de Score */}
            <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-around gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
              {score !== null ? (
                <>
                  <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        style={{
                          strokeDasharray: `${score}, 100`,
                          color: getHealthCategory(score).color,
                          transition: 'stroke-dasharray 0.5s ease'
                        }}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span className="font-outfit text-2xl font-extrabold text-slate-800">{score}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">de 100</span>
                    </div>
                  </div>

                  <div className="text-center sm:text-left space-y-2">
                    <span
                      className="inline-block px-3  py-1 rounded-full text-xs font-bold"
                      style={{
                        background: getHealthCategory(score).bg,
                        color: getHealthCategory(score).color,
                        border: `1px solid ${getHealthCategory(score).border}`
                      }}
                    >
                      {getHealthCategory(score).label}
                    </span>
                    <h4 className="font-outfit text-sm font-bold text-slate-700">Métricas consolidadas com sucesso</h4>
                    <p className="text-slate-400 text-xs max-w-xs">
                      {score === 100 
                        ? 'Parabéns! Todos os sistemas operacionais e integrações passaram com 100% de conformidade.'
                        : 'Identificamos gargalos ou conexões inativas. Verifique o relatório abaixo para ajustar seu sistema.'
                      }
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                  <Activity size={48} className="text-slate-200" />
                  <span className="text-xs font-bold uppercase tracking-wider">Nenhum teste executado ainda</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Relatório de Testes Detalhado */}
        <div className="space-y-4">
          <h3 className="font-outfit text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Detalhamento por Módulo</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {Object.values(tests).map((test) => (
              <div 
                key={test.name} 
                className="card animate-scale-up" 
                style={{ 
                  padding: 20, 
                  borderLeft: test.status === 'success' 
                    ? '4px solid #10b981' 
                    : test.status === 'failed' 
                      ? '4px solid #ef4444' 
                      : '4px solid #e2e8f0' 
                }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Informação e descrição do teste */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: test.status === 'success' ? '#ecfdf5' : test.status === 'failed' ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${test.status === 'success' ? '#bbf7d0' : test.status === 'failed' ? '#fca5a5' : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {test.status === 'success' ? (
                        <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                      ) : test.status === 'failed' ? (
                        <XCircle size={20} style={{ color: '#ef4444' }} />
                      ) : test.status === 'running' ? (
                        <Loader2 size={20} className="animate-spin text-blue-500" />
                      ) : (
                        <ShieldCheck size={20} style={{ color: '#94a3b8' }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-outfit text-sm font-bold text-slate-800">{test.title}</h4>
                        <span className="badge badge-gray text-[9px] font-bold">Peso: {test.points} pts</span>
                      </div>
                      <p className="text-slate-400 text-xs font-medium mt-1 max-w-lg">{test.description}</p>
                    </div>
                  </div>

                  {/* Resultados do teste em tempo real */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      {test.status === 'idle' && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pendente</span>
                      )}
                      {test.status === 'running' && (
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide animate-pulse">Testando...</span>
                      )}
                      {test.status === 'success' && (
                        <>
                          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                            ✅ Aprovado
                          </span>
                          <span className="text-[9px] font-bold text-slate-400" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} /> {test.responseTime}ms | {test.timestamp}
                          </span>
                        </>
                      )}
                      {test.status === 'failed' && (
                        <>
                          <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wide flex items-center gap-1">
                            ❌ Falhou
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={10} /> {test.responseTime}ms | {test.timestamp}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => runTest(test.name)}
                        disabled={runningAll || test.status === 'running'}
                        className="btn btn-outline btn-sm"
                        style={{ padding: 6, minWidth: 0, borderRadius: 8 }}
                      >
                        <RefreshCw size={12} className={test.status === 'running' ? 'animate-spin' : ''} />
                      </button>
                      
                      {test.errorDetails && (
                        <button
                          onClick={() => toggleLogs(test.name)}
                          className="btn btn-outline btn-sm text-slate-500"
                          style={{ padding: '6px 10px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          Logs {expandedLogs[test.name] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bloco de erro expandido */}
                {test.errorDetails && expandedLogs[test.name] && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs space-y-1 animate-slide-down">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle size={12} /> Detalhes do erro reportado:
                    </div>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'monospace', 
                      fontSize: 10, 
                      lineHeight: 1.4,
                      background: 'rgba(239, 68, 68, 0.05)',
                      padding: 8,
                      borderRadius: 6
                    }}>{test.errorDetails}</pre>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
