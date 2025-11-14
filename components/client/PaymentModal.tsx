'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  Clock, 
  DollarSign, 
  MessageCircle, 
  Phone, 
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { API_URL } from '@/lib/config'

interface Publication {
  id: string
  slug: string
  display_name: string
  pricing_model: string
  price_per_session: number
  price_per_minute: number
  monthly_subscription_price: number
  free_trial_minutes: number
  primary_color: string
  secondary_color: string
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  publication: Publication
  sessionType: 'chat' | 'call'
  onPaymentSuccess: (sessionId: string) => void
  userToken?: string
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  publication,
  sessionType,
  onPaymentSuccess,
  userToken
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')

  const primaryColor = publication.primary_color || '#3B82F6'

  // Set default selected plan based on pricing model
  useEffect(() => {
    if (publication.pricing_model === 'per_session') {
      setSelectedPlan('session')
    } else if (publication.pricing_model === 'per_minute') {
      setSelectedPlan('minute')
    } else if (publication.pricing_model === 'subscription') {
      setSelectedPlan('subscription')
    }
  }, [publication.pricing_model])

  const getPricingPlans = () => {
    const plans = []

    // Free trial (if available)
    if (publication.free_trial_minutes > 0) {
      plans.push({
        id: 'free_trial',
        name: 'Free Trial',
        price: 0,
        description: `${publication.free_trial_minutes} minutes free`,
        features: [
          `${publication.free_trial_minutes} minutes included`,
          'Full access to AI expert',
          'No credit card required'
        ],
        badge: 'Popular',
        badgeColor: 'bg-green-500'
      })
    }

    // Per session pricing
    if (publication.pricing_model === 'per_session' || publication.price_per_session > 0) {
      plans.push({
        id: 'session',
        name: 'Per Session',
        price: publication.price_per_session,
        description: 'One-time session payment',
        features: [
          'Unlimited session duration',
          'Full access to AI expert',
          'Session recording available'
        ],
        badge: publication.pricing_model === 'per_session' ? 'Recommended' : '',
        badgeColor: 'bg-blue-500'
      })
    }

    // Per minute pricing
    if (publication.pricing_model === 'per_minute' || publication.price_per_minute > 0) {
      plans.push({
        id: 'minute',
        name: 'Per Minute',
        price: publication.price_per_minute,
        description: 'Pay as you go',
        features: [
          'Pay only for time used',
          'Flexible duration',
          'Stop anytime'
        ],
        badge: publication.pricing_model === 'per_minute' ? 'Recommended' : '',
        badgeColor: 'bg-blue-500'
      })
    }

    // Subscription pricing
    if (publication.pricing_model === 'subscription' || publication.monthly_subscription_price > 0) {
      plans.push({
        id: 'subscription',
        name: 'Monthly Subscription',
        price: publication.monthly_subscription_price,
        description: 'Unlimited access for 30 days',
        features: [
          'Unlimited sessions',
          'Priority support',
          'Advanced features',
          'Cancel anytime'
        ],
        badge: publication.pricing_model === 'subscription' ? 'Best Value' : '',
        badgeColor: 'bg-purple-500'
      })
    }

    return plans
  }

  const handlePayment = async () => {
    if (!selectedPlan) {
      setError('Please select a pricing plan')
      return
    }

    if (!userToken) {
      setError('Please log in to continue')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create payment session
      const response = await fetch(`${API_URL}/payments/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          publication_id: publication.id,
          session_type: sessionType,
          pricing_plan: selectedPlan,
          success_url: `${window.location.origin}/client/${publication.slug}/${sessionType}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/client/${publication.slug}`
        })
      })

      const data = await response.json()

      if (data.success) {
        if (selectedPlan === 'free_trial') {
          // For free trial, directly create session and redirect
          onPaymentSuccess(data.session_id)
        } else {
          // Redirect to Stripe Checkout
          window.location.href = data.checkout_url
        }
      } else {
        setError(data.message || 'Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError('Payment failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const plans = getPricingPlans()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Choose Your Plan
          </DialogTitle>
          <div className="flex items-center gap-2 text-gray-600">
            {sessionType === 'chat' ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <Phone className="h-5 w-5" />
            )}
            <span>
              {sessionType === 'chat' ? 'Chat' : 'Call'} with {publication.display_name}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedPlan === plan.id
                    ? 'ring-2 ring-offset-2'
                    : 'hover:border-gray-300'
                }`}
                style={selectedPlan === plan.id ? {
                  '--tw-ring-color': primaryColor
                } as React.CSSProperties : undefined}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <CardHeader className="text-center">
                  {plan.badge && (
                    <Badge 
                      className={`${plan.badgeColor} text-white mb-2 w-fit mx-auto`}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-3xl font-bold mt-2">
                    {plan.price === 0 ? (
                      'Free'
                    ) : (
                      <>
                        <span className="text-sm text-gray-500">$</span>
                        {plan.price}
                        <span className="text-sm text-gray-500">
                          {plan.id === 'subscription' ? '/month' : 
                           plan.id === 'minute' ? '/min' : ''}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {selectedPlan === plan.id && (
                    <div className="mt-4 p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Selected</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={loading || !selectedPlan}
                className="text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {selectedPlan === 'free_trial' ? 'Start Free Trial' : 'Continue to Payment'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PaymentModal
