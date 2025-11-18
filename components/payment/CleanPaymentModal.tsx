'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Lock,
  Shield,
  Star,
  Zap,
  ArrowRight
} from 'lucide-react'
import { API_URL } from '@/lib/config'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_interval: string
  features: string[]
  recommended?: boolean
}

interface CleanPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  plans: Plan[]
  expertName: string
  expertSlug?: string
  onPaymentSuccess: (subscriptionId: string) => void
  userToken: string
}

const CleanPaymentModal: React.FC<CleanPaymentModalProps> = ({
  isOpen,
  onClose,
  plans,
  expertName,
  expertSlug,
  onPaymentSuccess,
  userToken
}) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasExistingCard, setHasExistingCard] = useState<boolean | null>(null)
  const [checkingPaymentMethods, setCheckingPaymentMethods] = useState(true)

  // Auto-select recommended plan or first plan
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      const recommended = plans.find(p => p.recommended)
      setSelectedPlan(recommended || plans[0])
    }
  }, [plans, selectedPlan])

  // Check if user has existing payment methods
  useEffect(() => {
    const checkPaymentMethods = async () => {
      if (!isOpen || !userToken) return
      
      try {
        setCheckingPaymentMethods(true)
        const response = await fetch(`${API_URL}/payments/check-customer-status`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })
        const data = await response.json()
        
        if (data.success) {
          setHasExistingCard(data.has_payment_methods)
        }
      } catch (err) {
        console.error('Error checking payment methods:', err)
        setHasExistingCard(false)
      } finally {
        setCheckingPaymentMethods(false)
      }
    }

    checkPaymentMethods()
  }, [isOpen, userToken])

  const handleSubscribe = async () => {
    if (!selectedPlan) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/payments/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          expert_name: expertName
        })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to create subscription')
        return
      }

      if (data.checkout_url) {
        // First-time user - redirect to Stripe Checkout
        window.location.href = data.checkout_url
      } else if (data.subscription_id) {
        // Existing user - subscription created directly
        setSuccess(true)
        setTimeout(() => {
          onPaymentSuccess(data.subscription_id)
          // Redirect to expert page if expertSlug is provided
          if (expertSlug) {
            window.location.href = `/client/${expertSlug}`
          }
        }, 2000)
      }

    } catch (err) {
      console.error('Subscription error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Welcome to {expertName}!
            </h2>
            <p className="text-gray-600 mb-4">
              Your subscription is now active
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>You can start chatting immediately</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Subscribe to {expertName}
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            Choose your plan and get instant access
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Selection */}
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedPlan?.id === plan.id
                    ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-200'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {plan.name}
                          {plan.recommended && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="text-2xl font-bold text-blue-600 mt-1">
                          ${plan.price}
                          <span className="text-sm text-gray-500 font-normal">
                            /{plan.billing_interval}
                          </span>
                        </div>
                      </div>
                    </div>
                    {selectedPlan?.id === plan.id && (
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Method Info */}
          {!checkingPaymentMethods && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {hasExistingCard ? (
                  <>
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Saved Payment Method</p>
                      <p className="text-sm text-gray-600">
                        We'll use your saved card for instant activation
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Secure Checkout</p>
                      <p className="text-sm text-gray-600">
                        You'll be redirected to Stripe to add your payment details
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={!selectedPlan || loading || checkingPaymentMethods}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : checkingPaymentMethods ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : hasExistingCard ? (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Subscribe Instantly
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue to Payment
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Lock className="w-4 h-4" />
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CleanPaymentModal
