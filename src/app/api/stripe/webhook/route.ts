import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICING_PLANS } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { PlanType } from '@/types/database'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      event = JSON.parse(body)
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`⚠️ Stripe Webhook signature verification failed: ${errorMsg}`)
    return NextResponse.json({ error: `Webhook Error: ${errorMsg}` }, { status: 400 })
  }

  // Create admin Supabase client using Service Role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const merchantId = session.metadata?.shop_id
        const planId = session.metadata?.plan_id as PlanType
        const lineUserId = session.metadata?.line_user_id

        if (planId && PRICING_PLANS[planId]) {
          const plan = PRICING_PLANS[planId]
          if (merchantId) {
            await supabase
              .from('shops')
              .update({
                plan: plan.id,
                subscription_status: 'active',
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                monthly_slip_quota: plan.quota,
              })
              .eq('id', merchantId)

            console.log(`✅ [Stripe Webhook] Upgraded merchant ${merchantId} to ${planId}`)
          } else if (lineUserId) {
            const { data: userShops } = await supabase
              .from('shops')
              .select('id')
              .eq('line_user_id', lineUserId)
              .order('created_at', { ascending: false })

            if (userShops && userShops.length > 0) {
              await supabase
                .from('shops')
                .update({
                  plan: plan.id,
                  subscription_status: 'active',
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: session.subscription as string,
                  monthly_slip_quota: plan.quota,
                })
                .eq('id', userShops[0].id)

              console.log(`✅ [Stripe Webhook] Upgraded user shop ${userShops[0].id} (LINE: ${lineUserId}) to ${planId}`)
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer as string
        const status = subscription.status // active, past_due, canceled

        await supabase
          .from('shops')
          .update({
            subscription_status: status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer as string

        await supabase
          .from('shops')
          .update({
            subscription_status: 'canceled',
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error)
    console.error('Error handling Stripe webhook:', errMessage)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
