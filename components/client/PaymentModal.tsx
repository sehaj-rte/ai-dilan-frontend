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

interface Plan {
  id: string
  expert_id: string
  name: string
  price: number
  currency: string
  billing_interval: string
  billing_interval_count?: number
  stripe_product_id: string | null
  stripe_price_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  const primaryColor = publication.primary_color || '#3B82F6'

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      if (!isOpen) return
      
      try {
        setLoadingPlans(true)
        setError(null)
        
        const response = await fetch(`${API_URL}/public/expert/${publication.slug}/plans`)
        const data = await response.json()
        
        if (data.success && data.plans) {
          setPlans(data.plans)
          // Auto-select first plan if available
          if (data.plans.length > 0 && !selectedPlan) {
            setSelectedPlan(data.plans[0].id)
          }
        } else {
          setError('No pricing plans available for this expert')
        }
      } catch (err) {
        console.error('Error fetching plans:', err)
        setError('Failed to load pricing plans')
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [isOpen, publication.slug])

  const getPricingPlans = () => {
    // Map dynamic plans from API to display format
    return plans.map((plan, index) => {
      let description = ''
      let billingFeature = ''
      
      if (plan.billing_interval_count && plan.billing_interval_count > 1) {
        // Multi-month plan (e.g., 6 months)
        const monthlyPrice = (plan.price / plan.billing_interval_count).toFixed(2)
        description = `£${monthlyPrice}/month (£${plan.price} for ${plan.billing_interval_count} ${plan.billing_interval}${plan.billing_interval_count > 1 ? 's' : ''})`
        billingFeature = `${plan.billing_interval_count}-${plan.billing_interval} commitment plan`
      } else {
        // Regular monthly/yearly plan
        const billingDisplay = plan.billing_interval === 'month' 
          ? '/month' 
          : plan.billing_interval === 'year' 
          ? '/year' 
          : ''
        description = `£${plan.price}${billingDisplay}`
        billingFeature = `${plan.billing_interval.charAt(0).toUpperCase() + plan.billing_interval.slice(1)}ly billing`
      }
      
      return {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        description: description,
        features: [
          billingFeature,
          'Full access to AI expert',
          'Session recording available',
          'Cancel anytime'
        ],
        badge: index === 0 ? 'Recommended' : '',
        badgeColor: 'bg-blue-500',
        currency: plan.currency,
        billing_interval: plan.billing_interval,
        billing_interval_count: plan.billing_interval_count
      }
    })
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
          success_url: `${window.location.origin}/expert/${publication.slug}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/expert/${publication.slug}`
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

  const displayPlans = getPricingPlans()

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

          {loadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">Loading pricing plans...</span>
            </div>
          ) : displayPlans.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>No pricing plans available</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayPlans.map((plan) => (
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
                        <span className="text-sm text-gray-500">{plan.currency || '$'}</span>
                        {plan.price}
                        <span className="text-sm text-gray-500">
                          {plan.billing_interval === 'month' ? '/month' : 
                           plan.billing_interval === 'year' ? '/year' : ''}
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
          )}

          {!loadingPlans && displayPlans.length > 0 && (
            <>
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
                  'Continue to Payment'
                )}
              </Button>
            </div>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PaymentModal
