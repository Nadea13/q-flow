export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type PlanType = 'starter' | 'growth'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'

export interface Merchant {
  id: string
  slug: string
  name: string
  phone: string | null
  promptpay_id: string
  promptpay_name: string | null
  default_deposit: number
  open_time: string
  close_time: string
  has_break?: boolean
  break_start_time?: string | null
  break_end_time?: string | null
  closed_days?: number[]
  branch_name?: string | null
  branch_address?: string | null
  branch_phone?: string | null
  slot_interval_min: number
  line_user_id: string | null
  line_notify_token: string | null
  admin_pin?: string
  plan?: PlanType
  subscription_status?: SubscriptionStatus
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  monthly_slip_quota?: number
  used_slips_this_month?: number
  current_period_end?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  merchant_id: string
  title: string
  description: string | null
  duration_min: number
  price: number
  deposit_amount: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Slot {
  id: string
  merchant_id: string
  start_time: string
  end_time: string
  reason: string | null
  is_blocked: boolean
  created_at: string
}

export interface Booking {
  id: string
  merchant_id: string
  service_id: string
  customer_name: string
  customer_phone: string
  customer_line_id: string | null
  customer_notes: string | null
  start_time: string
  end_time: string
  total_price: number
  deposit_amount: number
  status: BookingStatus
  slip_url: string | null
  slip_trans_ref: string | null
  slip_verified_at: string | null
  slip_raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // joined relations
  service?: Service
  services?: Service
  merchant?: Merchant
  merchants?: Merchant
}

export interface TimeSlotOption {
  startTime: string // ISO string
  endTime: string   // ISO string
  displayTime: string // "10:00 - 11:00"
  isAvailable: boolean
  reason?: string
}
