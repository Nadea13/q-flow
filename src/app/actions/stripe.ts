'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { stripe, PRICING_PLANS } from '@/lib/stripe'
import type { PlanType } from '@/types/database'

interface CreateCheckoutInput {
  merchantSlug?: string
  planId: PlanType
  billingCycle?: 'monthly' | 'yearly'
  returnUrl?: string
  lineUserId?: string
}

/**
 * Creates a Stripe Checkout Session for subscribing to a plan
 */
export async function createStripeCheckoutSessionAction(input: CreateCheckoutInput) {
  const plan = PRICING_PLANS[input.planId]
  if (!plan) {
    return { success: false, error: 'ไม่พบแพ็กเกจที่เลือก' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const supabase = await createClient()

  let merchant = null
  if (input.merchantSlug && input.merchantSlug !== 'public') {
    const { data: mData } = await supabase
      .from('shops')
      .select('id, slug, name, stripe_customer_id, plan')
      .eq('slug', input.merchantSlug)
      .single()
    merchant = mData
  }

  const lineQuery = input.lineUserId ? `&line_uid=${encodeURIComponent(input.lineUserId)}` : ''

  const successUrl = merchant
    ? `${siteUrl}/${merchant.slug}/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=${plan.id}`
    : `${siteUrl}/create-shop?plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}${lineQuery}`
  
  const cancelUrl = merchant
    ? `${siteUrl}/${merchant.slug}/settings?tab=billing`
    : `${siteUrl}/pricing`

  // 0. Handle Free / Basic Plan: No payment session required
  if (input.planId === 'basic' || input.planId === 'free' || plan.priceTHB === 0) {
    if (merchant) {
      await supabase
        .from('shops')
        .update({
          plan: 'basic',
          subscription_status: 'active',
          monthly_slip_quota: plan.quota || 30,
        })
        .eq('id', merchant.id)

      revalidatePath(`/${merchant.slug}/settings`)
      revalidatePath(`/${merchant.slug}/dashboard`)
      revalidatePath('/')

      return {
        success: true,
        url: `${siteUrl}/${merchant.slug}/settings?tab=billing&upgraded=basic`,
        simulated: true,
      }
    }

    return {
      success: true,
      url: `${siteUrl}/create-shop?plan=basic${lineQuery}`,
      simulated: true,
    }
  }

  // If Stripe Secret Key is not configured or in mock test, perform instant simulated upgrade
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
    if (merchant) {
      await supabase
        .from('shops')
        .update({
          plan: plan.id,
          subscription_status: 'active',
          monthly_slip_quota: plan.quota,
        })
        .eq('id', merchant.id)

      revalidatePath(`/${merchant.slug}/settings`)
      revalidatePath(`/${merchant.slug}/dashboard`)
      revalidatePath('/')

      return {
        success: true,
        url: `${siteUrl}/${merchant.slug}/settings?tab=billing&upgraded=${plan.id}`,
        simulated: true,
      }
    }

    return {
      success: true,
      url: `${siteUrl}/create-shop?plan=${plan.id}`,
      simulated: true,
    }
  }

  // 1. Get or create Stripe Customer if merchant exists
  let customerId = merchant?.stripe_customer_id
  if (merchant && !customerId) {
    const customer = await stripe.customers.create({
      name: merchant.name,
      metadata: {
        shop_id: merchant.id,
        merchant_slug: merchant.slug,
      },
    })
    customerId = customer.id
    await supabase
      .from('shops')
      .update({ stripe_customer_id: customerId })
      .eq('id', merchant.id)
  }

  // 2. Create Checkout Session
  const isYearly = input.billingCycle === 'yearly'
  const unitAmount = isYearly ? plan.priceYearlyTHB * 100 : plan.priceTHB * 100
  const interval = isYearly ? 'year' : 'month'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: `${plan.name} (${isYearly ? 'รายปี / Yearly' : 'รายเดือน / Monthly'})`,
              description: `${plan.tagline} • ${plan.quota.toLocaleString()} คิว/เดือน`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      customer: customerId || undefined,
      customer_email: undefined,
      metadata: {
        shop_id: merchant?.id || '',
        merchant_slug: input.merchantSlug || '',
        plan_id: plan.id,
        billing_cycle: input.billingCycle || 'monthly',
        line_user_id: input.lineUserId || '',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { success: true, url: session.url }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Stripe Error: ${errorMsg}` }
  }
}

/**
 * Creates a Stripe Customer Portal session to manage card and subscription
 */
export async function createStripeCustomerPortalAction(merchantSlug: string) {
  const supabase = await createClient()

  const { data: merchant } = await supabase
    .from('shops')
    .select('id, name, stripe_customer_id, slug, phone')
    .eq('slug', merchantSlug)
    .single()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (!merchant) {
    return { success: false, error: 'ไม่พบข้อมูลร้านค้า' }
  }

  // If secret key is not configured or in mock test mode
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
    return { 
      success: false, 
      error: 'โหมดทดสอบ Local: สามารถดูใบเสร็จจริงได้เมื่อเชื่อมต่อ Stripe Live/Test Key' 
    }
  }

  try {
    let customerId = merchant.stripe_customer_id

    // If merchant does not have a Stripe customer ID yet, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: merchant.name,
        phone: merchant.phone || undefined,
        metadata: {
          shop_id: merchant.id,
          merchant_slug: merchant.slug,
        },
      })
      customerId = customer.id
      await supabase
        .from('shops')
        .update({ stripe_customer_id: customerId })
        .eq('id', merchant.id)
    }

    // Create billing portal session pointing directly to invoices and payment methods
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/${merchant.slug}/settings?tab=billing`,
    })

    return { success: true, url: portalSession.url }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}

/**
 * Direct Instant Plan Upgrade action for merchant testing
 */
export async function upgradeMerchantPlanAction(merchantSlug: string, planId: PlanType) {
  const supabase = await createClient()
  const plan = PRICING_PLANS[planId]
  if (!plan) return { success: false, error: 'Invalid plan' }

  const { error } = await supabase
    .from('shops')
    .update({
      plan: plan.id,
      subscription_status: 'active',
      monthly_slip_quota: plan.quota,
    })
    .eq('slug', merchantSlug)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, plan }
}

/**
 * Creates a Stripe Payment Intent for embedded in-app card checkout
 */
export async function createStripePaymentIntentAction(input: {
  planId: PlanType
  lineUserId?: string
  merchantSlug?: string
}) {
  const plan = PRICING_PLANS[input.planId]
  if (!plan) {
    return { success: false, error: 'ไม่พบแพ็กเกจที่เลือก' }
  }

  // If mock / no stripe key
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
    return {
      success: true,
      clientSecret: 'mock_secret_12345',
      amount: plan.priceTHB,
      simulated: true,
    }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.priceTHB * 100, // in satang
      currency: 'thb',
      payment_method_types: ['card'],
      metadata: {
        plan_id: plan.id,
        line_user_id: input.lineUserId || '',
        merchant_slug: input.merchantSlug || '',
      },
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: plan.priceTHB,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Stripe Error: ${errorMsg}` }
  }
}

/**
 * Syncs and verifies a Stripe Checkout Session on return to update merchant plan
 */
export async function syncStripeSessionAction(sessionId: string, merchantSlug?: string) {
  if (!sessionId) {
    return { success: false, error: 'No session ID provided' }
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
    return { success: true }
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const merchantId = session.metadata?.shop_id
    const planId = session.metadata?.plan_id as PlanType
    const plan = PRICING_PLANS[planId]

    if (!plan) {
      return { success: false, error: 'Invalid plan from session' }
    }

    const supabase = await createClient()

    if (merchantId) {
      await supabase
        .from('shops')
        .update({
          plan: plan.id,
          subscription_status: 'active',
          stripe_customer_id: (session.customer as string) || undefined,
          stripe_subscription_id: (session.subscription as string) || undefined,
          monthly_slip_quota: plan.quota,
        })
        .eq('id', merchantId)
    } else if (merchantSlug) {
      await supabase
        .from('shops')
        .update({
          plan: plan.id,
          subscription_status: 'active',
          stripe_customer_id: (session.customer as string) || undefined,
          stripe_subscription_id: (session.subscription as string) || undefined,
          monthly_slip_quota: plan.quota,
        })
        .eq('slug', merchantSlug)
    }

    if (merchantSlug) {
      revalidatePath(`/${merchantSlug}/settings`)
      revalidatePath(`/${merchantSlug}/dashboard`)
    }
    revalidatePath('/')

    return { success: true, plan }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
