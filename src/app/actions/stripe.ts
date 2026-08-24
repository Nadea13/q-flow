'use server'

import { createClient } from '@/lib/supabase/server'
import { stripe, PRICING_PLANS } from '@/lib/stripe'
import type { PlanType } from '@/types/database'

interface CreateCheckoutInput {
  merchantSlug?: string
  planId: PlanType
  returnUrl?: string
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
      .from('merchants')
      .select('id, slug, name, stripe_customer_id, plan')
      .eq('slug', input.merchantSlug)
      .single()
    merchant = mData
  }

  const successUrl = merchant
    ? `${siteUrl}/${merchant.slug}/dashboard?tab=billing&session_id={CHECKOUT_SESSION_ID}&upgraded=${plan.id}`
    : `${siteUrl}/onboarding?plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`
  
  const cancelUrl = merchant
    ? `${siteUrl}/${merchant.slug}/dashboard?tab=billing`
    : `${siteUrl}/pricing`

  // If Stripe Secret Key is not configured or in mock test, perform instant simulated upgrade
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock')) {
    if (merchant) {
      await supabase
        .from('merchants')
        .update({
          plan: plan.id,
          subscription_status: 'active',
          monthly_slip_quota: plan.quota,
        })
        .eq('id', merchant.id)

      return {
        success: true,
        url: `${siteUrl}/${merchant.slug}/dashboard?tab=billing&upgraded=${plan.id}`,
        simulated: true,
      }
    }

    return {
      success: true,
      url: `${siteUrl}/onboarding?plan=${plan.id}`,
      simulated: true,
    }
  }

  try {
    // 1. Get or create Stripe Customer if merchant exists
    let customerId = merchant?.stripe_customer_id
    if (merchant && !customerId) {
      const customer = await stripe.customers.create({
        name: merchant.name,
        metadata: {
          merchant_id: merchant.id,
          merchant_slug: merchant.slug,
        },
      })
      customerId = customer.id
      await supabase
        .from('merchants')
        .update({ stripe_customer_id: customerId })
        .eq('id', merchant.id)
    }

    // 2. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : {}),
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: `QFlow ${plan.name} Plan`,
              description: `${plan.tagline} (โควตา ${plan.quota} สลิป/เดือน)`,
            },
            unit_amount: plan.priceTHB * 100, // THB in Satang
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...(merchant ? { merchant_id: merchant.id, merchant_slug: merchant.slug } : {}),
        plan_id: plan.id,
        slip_quota: String(plan.quota),
      },
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
    .from('merchants')
    .select('stripe_customer_id, slug')
    .eq('slug', merchantSlug)
    .single()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (!merchant?.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'ยังไม่มีประวัติการสมัครสมาชิกผ่าน Stripe' }
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: merchant.stripe_customer_id,
      return_url: `${siteUrl}/${merchant.slug}/dashboard?tab=billing`,
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
    .from('merchants')
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
