export type EventType =
  | 'pix_generated'
  | 'pix_paid'
  | 'boleto_generated'
  | 'purchase_approved'

export type WhatsAppStatus = 'connected' | 'disconnected' | 'connecting'
export type IntegrationStatus = 'active' | 'inactive'
export type FlowStatus = 'active' | 'inactive'
export type MessageStatus = 'sent' | 'failed' | 'pending'
export type Platform = 'kiwify' | 'hotmart' | 'kirvano'

export interface UserProfile {
  id: string
  name: string | null
  email: string
  plan: string
  timezone: string
  evolution_api_url: string | null
  evolution_api_key: string | null
  created_at: string
}

export interface WhatsAppInstance {
  id: string
  user_id: string
  phone: string | null
  status: WhatsAppStatus
  instance_name: string
  session_data: Record<string, unknown> | null
  created_at: string
}

export interface Integration {
  id: string
  user_id: string
  platform: Platform
  webhook_token: string
  status: IntegrationStatus
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  product_name: string
  external_product_id: string
  platform: Platform
  checkout_url?: string | null
  created_at: string
}

export interface Lead {
  id: string
  user_id: string
  name: string | null
  phone: string
  email: string | null
  created_at: string
}

export interface Event {
  id: string
  user_id: string
  lead_id: string | null
  event_type: EventType
  payload: Record<string, unknown>
  created_at: string
  leads?: Lead
  products?: Product
}

export interface Flow {
  id: string
  user_id: string
  name: string
  status: FlowStatus
  created_at: string
  flow_steps?: FlowStep[]
}

export interface FlowStep {
  id: string
  flow_id: string
  delay_minutes: number
  message: string
  active: boolean
  step_order: number
}

export interface Message {
  id: string
  lead_id: string
  flow_step_id: string | null
  status: MessageStatus
  sent_at: string | null
  created_at: string
}

export interface DashboardStats {
  revenueRecovered: number
  pixGenerated: number
  pixRecovered: number
  recoveryRate: number
  messagesSent: number
}

export interface ChartDataPoint {
  date: string
  value: number
}
