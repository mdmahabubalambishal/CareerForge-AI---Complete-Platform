'use client'
import { useState, useEffect } from 'react'
import { billingApi } from '@/lib/api'

export default function BillingPage() {
  const [plans, setPlans] = useState<any>(null)
  const [myPlan, setMyPlan] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [gateway, setGateway] = useState<'stripe' | 'sslcommerz'>('sslcommerz')

  useEffect(() => {
    fetchData()
    // URL params check করো
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setTimeout(fetchData, 1000)
    }
    // Mock payment handle করো
    if (params.get('mock_payment') === 'true') {
      const plan = params.get('plan')
      const userId = params.get('user_id')
      if (plan) handleMockPayment(plan)
    }
  }, [])

  async function fetchData() {
    try {
      const [p, m] = await Promise.all([billingApi.getPlans(), billingApi.getMyPlan()])
      setPlans(p)
      setMyPlan(m)
    } catch (e) { console.error(e) }
  }

  async function handleMockPayment(plan: string) {
    try {
      await billingApi.mockUpgrade(plan)
      await fetchData()
    } catch (e) { console.error(e) }
  }

  async function handleUpgrade(planKey: string) {
    setLoading(planKey)
    try {
      if (gateway === 'stripe') {
        const data = await billingApi.createStripeCheckout(planKey)
        window.location.href = data.checkout_url
      } else {
        const data = await billingApi.createSSLCommerzPayment(planKey)
        window.location.href = data.payment_url
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your subscription?')) return
    try {
      await billingApi.cancel()
      await fetchData()
      alert('Subscription cancelled. You are now on the Free plan.')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const currentPlan = myPlan?.plan || 'free'

  const planColors: Record<string, string> = {
    free: '#4a6680',
    pro: '#00f0c8',
    enterprise: '#9b7bff',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-[#4a6680] text-sm mt-1">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Current Plan */}
      {myPlan && (
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#4a6680] uppercase tracking-wide mb-1">Current Plan</div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-white capitalize">{currentPlan}</div>
                <span className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background: planColors[currentPlan] + '20', color: planColors[currentPlan] }}>
                  Active
                </span>
              </div>
              {myPlan.subscription?.current_period_end && (
                <div className="text-xs text-[#4a6680] mt-1">
                  Renews: {new Date(myPlan.subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-[#4a6680] mb-1">Usage Today</div>
              <div className="text-xs text-[#7a96b0]">
                AI Calls: {myPlan.usage?.ai_calls || 0}
                {currentPlan === 'free' ? '/20' : ' (unlimited)'}
              </div>
              <div className="text-xs text-[#7a96b0]">
                Resumes: {myPlan.usage?.resume_count || 0}
                {currentPlan === 'free' ? '/2' : ' (unlimited)'}
              </div>
            </div>
          </div>
          {currentPlan !== 'free' && (
            <button
              onClick={handleCancel}
              className="mt-3 text-xs text-[#4a6680] hover:text-red-400 transition-colors"
            >
              Cancel subscription
            </button>
          )}
        </div>
      )}

      {/* Payment Gateway Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-[#4a6680]">Pay with:</span>
        <div className="flex gap-2 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1">
          <button
            onClick={() => setGateway('sslcommerz')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${gateway === 'sslcommerz' ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0]'}`}
          >
            🇧🇩 SSLCommerz (BDT)
          </button>
          <button
            onClick={() => setGateway('stripe')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${gateway === 'stripe' ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0]'}`}
          >
            💳 Stripe (USD)
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      {plans && (
        <div className="grid grid-cols-3 gap-5">
          {Object.entries(plans).map(([key, plan]: any) => {
            const isCurrentPlan = currentPlan === key
            const isPopular = key === 'pro'
            const price = gateway === 'sslcommerz' ? plan.price_bdt : plan.price_usd
            const currency = gateway === 'sslcommerz' ? '৳' : '$'

            return (
              <div
                key={key}
                className={`relative bg-[#0c1018] border rounded-2xl p-6 transition-all ${
                  isPopular
                    ? 'border-[#00f0c8]'
                    : isCurrentPlan
                    ? 'border-[#9b7bff]'
                    : 'border-[#1e2838]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00f0c8] text-black text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#9b7bff] text-white text-xs font-bold px-4 py-1 rounded-full">
                    CURRENT PLAN
                  </div>
                )}

                <div className="text-xs font-bold uppercase tracking-widest text-[#4a6680] mb-3"
                  style={{ color: planColors[key] }}>
                  {plan.name}
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">{currency}{price}</span>
                  <span className="text-[#4a6680] text-sm">/month</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#7a96b0]">
                      <span style={{ color: planColors[key] }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button disabled
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#1e2838] text-[#4a6680] cursor-not-allowed">
                    Current Plan
                  </button>
                ) : key === 'free' ? (
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#111620] border border-[#1e2838] text-[#7a96b0] hover:text-white transition-all"
                  >
                    Downgrade to Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={loading === key}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                    style={{
                      background: isPopular ? '#00f0c8' : '#9b7bff',
                      color: isPopular ? '#000' : '#fff',
                    }}
                  >
                    {loading === key ? 'Processing...' : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Test Mode Notice */}
      <div className="mt-6 bg-[#ffd84d]/05 border border-[#ffd84d]/20 rounded-xl p-4">
        <div className="text-xs font-bold text-[#ffd84d] mb-1">⚠️ Test Mode</div>
        <div className="text-xs text-[#7a96b0]">
          Payment gateways are in sandbox/test mode. Use test credentials:
          <br />
          Stripe: card 4242 4242 4242 4242, any expiry, any CVC
          <br />
          SSLCommerz: sandbox test account
        </div>
      </div>
    </div>
  )
}