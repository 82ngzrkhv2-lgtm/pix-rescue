import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── Plan limits definition ───────────────────────────────────────────────────
export interface PlanLimits {
  events: number       // events per month
  whatsapps: number    // connected WhatsApp numbers
  platforms: number    // active integrations
  historyDays: number  // days of event history
  costMonthly: number  // monthly cost in BRL
  label: string
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  Starter: { events: 1_000,  whatsapps: 1, platforms: 1, historyDays: 7,  costMonthly: 67,   label: 'Starter' },
  Pro:     { events: 5_000,  whatsapps: 1, platforms: 1, historyDays: 30, costMonthly: 147,  label: 'Pro'     },
  Elite:   { events: 20_000, whatsapps: 3, platforms: 3, historyDays: 90, costMonthly: 297,  label: 'Elite'   },
}

export interface PlanUsage {
  events: number
  whatsapps: number
  platforms: number
  revenueThisMonth: number
}

export interface PlanState {
  plan: string
  limits: PlanLimits
  usage: PlanUsage
  /** pct 0–100 */
  eventsPct: number
  /** true if user can switch platform (cooldown of 30d elapsed) */
  canSwapPlatform: boolean
  /** days until swap is allowed (0 if already allowed) */
  daysUntilSwap: number
  /** active platform name */
  activePlatform: string | null
  /** renewal date (derived: 30 days from account creation) */
  renewalDate: Date | null
  /** estimated ROI this month (%) */
  roi: number
  loading: boolean
}

const DEFAULT_LIMITS = PLAN_LIMITS['Starter']

export function usePlan(): PlanState {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('Starter')
  const [usage, setUsage] = useState<PlanUsage>({ events: 0, whatsapps: 0, platforms: 0, revenueThisMonth: 0 })
  const [platformActivatedAt, setPlatformActivatedAt] = useState<Date | null>(null)
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [renewalDate, setRenewalDate] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    if (!user) return
    setLoading(true)

    // 1. Load profile for plan name
    const { data: profile } = await supabase
      .from('users_profile')
      .select('plan, created_at')
      .eq('id', user.id)
      .single()

    const currentPlan = profile?.plan ?? 'Starter'
    setPlan(currentPlan)

    // Renewal = 30d from account creation (approximation)
    if (profile?.created_at) {
      const created = new Date(profile.created_at)
      const renewal = new Date(created)
      renewal.setDate(renewal.getDate() + 30)
      setRenewalDate(renewal)
    }

    // 2. Count events this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    // 3. Revenue this month from paid events
    const { data: revenueData } = await supabase
      .from('events')
      .select('revenue')
      .eq('user_id', user.id)
      .in('event_type', ['pix_paid', 'purchase_approved'])
      .gte('created_at', startOfMonth.toISOString())

    const revenue = (revenueData ?? []).reduce((sum, e) => sum + (e.revenue ?? 0), 0)

    // 4. Count active WhatsApp instances
    const { count: waCount } = await supabase
      .from('whatsapp_instances')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'connected')

    // 5. Load integrations – find the most recently activated one
    const { data: integData } = await supabase
      .from('integrations')
      .select('platform, status, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    const activeIntegrations = (integData ?? []).filter(i => i.status === 'active')
    const activePlatformCount = activeIntegrations.length

    if (activeIntegrations.length > 0) {
      setActivePlatform(activeIntegrations[0].platform)
      setPlatformActivatedAt(new Date(activeIntegrations[0].updated_at))
    } else {
      setActivePlatform(null)
      setPlatformActivatedAt(null)
    }

    setUsage({
      events: eventsCount ?? 0,
      whatsapps: waCount ?? 0,
      platforms: activePlatformCount,
      revenueThisMonth: revenue,
    })

    setLoading(false)
  }

  const limits = PLAN_LIMITS[plan] ?? DEFAULT_LIMITS
  const eventsPct = limits.events > 0 ? Math.min(100, Math.round((usage.events / limits.events) * 100)) : 0

  // Cooldown: 30 days from last platform activation
  let canSwapPlatform = true
  let daysUntilSwap = 0
  if (platformActivatedAt) {
    const cooldownEnd = new Date(platformActivatedAt)
    cooldownEnd.setDate(cooldownEnd.getDate() + 30)
    const now = new Date()
    if (now < cooldownEnd) {
      canSwapPlatform = false
      daysUntilSwap = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  // ROI = (revenue / cost) * 100
  const roi = limits.costMonthly > 0 && usage.revenueThisMonth > 0
    ? Math.round((usage.revenueThisMonth / limits.costMonthly) * 100)
    : 0

  return {
    plan,
    limits,
    usage,
    eventsPct,
    canSwapPlatform,
    daysUntilSwap,
    activePlatform,
    renewalDate,
    roi,
    loading,
  }
}
