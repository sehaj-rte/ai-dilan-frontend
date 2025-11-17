'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertCircle,
  Lock,
  Shield,
  Star,
  User,
  Mail
} from 'lucide-react'
import { API_URL } from '@/lib/config'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
  is_private: boolean
}

interface Plan {
  id: string
  expert_id: string
  name: string
  price: number
  currency: string
  billing_interval: string
  stripe_product_id: string | null
  stripe_price_id: string | null
  is_active: boolean
}

interface User {
  id: string
  email: string
  full_name?: string
}

interface PrivateExpertPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  publication: Publication
  sessionType: 'chat' | 'call'
  onPaymentSuccess: (subscriptionId: string) => void
  user: User
}

// Stripe Elements Form Component
const PaymentForm: React.FC<{
  publication: Publication
  selectedPlan: Plan | null
  user: User
  onSuccess: (subscriptionId: string) => void
  onError: (error: string) => void
}> = ({ publication, selectedPlan, user, onSuccess, onError }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [billingDetails, setBillingDetails] = useState({
    name: user.full_name || '',
    email: user.email,
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  })

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        padding: '12px',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements || !selectedPlan) {
      onError('Payment system not ready. Please try again.')
      return
    }

    const cardElement = elements.getElement(CardNumberElement)
    if (!cardElement) {
      onError('Card element not found')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: billingDetails.name,
          email: billingDetails.email,
          address: billingDetails.address,
        },
      })

      if (paymentMethodError) {
        onError(paymentMethodError.message || 'Failed to create payment method')
        setLoading(false)
        return
      }

      // Step 2: Create subscription
      const subscriptionResponse = await fetch(`${API_URL}/payments/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          publication_id: publication.id,
          payment_method_id: paymentMethod.id
        })
      })

      const subscriptionData = await subscriptionResponse.json()

      if (!subscriptionData.success) {
        onError(subscriptionData.error || 'Failed to create subscription')
        setLoading(false)
        return
      }

      // Step 3: Handle subscription status
      if (subscriptionData.status === 'active') {
        onSuccess(subscriptionData.subscription_id)
      } else if (subscriptionData.status === 'incomplete') {
        // Handle 3D Secure or other authentication
        const { error: confirmError } = await stripe.confirmCardPayment(
          subscriptionData.client_secret
        )
        
        if (confirmError) {
          onError(confirmError.message || 'Payment confirmation failed')
        } else {
          onSuccess(subscriptionData.subscription_id)
        }
      }

    } catch (error) {
      console.error('Subscription error:', error)
      onError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBillingChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Billing Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Billing Information
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={billingDetails.name}
              onChange={(e) => handleBillingChange('name', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={billingDetails.email}
              onChange={(e) => handleBillingChange('email', e.target.value)}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Street address"
            value={billingDetails.address.line1}
            onChange={(e) => handleBillingChange('address.line1', e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={billingDetails.address.city}
              onChange={(e) => handleBillingChange('address.city', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={billingDetails.address.state}
              onChange={(e) => handleBillingChange('address.state', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              value={billingDetails.address.postal_code}
              onChange={(e) => handleBillingChange('address.postal_code', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Information
        </h3>
        
        <div>
          <Label>Card Number</Label>
          <div className="border rounded-md p-3 bg-white">
            <CardNumberElement options={cardElementOptions} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Expiry Date</Label>
            <div className="border rounded-md p-3 bg-white">
              <CardExpiryElement options={cardElementOptions} />
            </div>
          </div>
          <div>
            <Label>CVC</Label>
            <div className="border rounded-md p-3 bg-white">
              <CardCvcElement options={cardElementOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full text-white"
        style={{ backgroundColor: publication.primary_color }}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Subscribe & Access Expert
          </>
        )}
      </Button>
    </form>
  )
}

const PrivateExpertPaymentModal: React.FC<PrivateExpertPaymentModalProps> = ({
  isOpen,
  onClose,
  publication,
  sessionType,
  onPaymentSuccess,
  user
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [success, setSuccess] = useState(false)

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
            setSelectedPlan(data.plans[0])
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

  const handlePaymentSuccess = (subscriptionId: string) => {
    setSuccess(true)
    setTimeout(() => {
      onPaymentSuccess(subscriptionId)
    }, 2000)
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              You now have access to {publication.display_name}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Shield className="w-4 h-4" />
              <span>Your subscription is now active</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6" style={{ color: primaryColor }} />
            Access Private Expert
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Choose Your Plan</h3>
              
              {loadingPlans ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-600">Loading plans...</span>
                </div>
              ) : plans.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>No pricing plans available</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan, index) => (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedPlan?.id === plan.id
                          ? 'ring-2 ring-offset-2'
                          : 'hover:border-gray-300'
                      }`}
                      style={selectedPlan?.id === plan.id ? {
                        '--tw-ring-color': primaryColor
                      } as React.CSSProperties : undefined}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {index === 0 && (
                            <Badge 
                              className="bg-blue-500 text-white"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                          {plan.currency} {plan.price}
                          <span className="text-sm text-gray-500 font-normal">
                            /{plan.billing_interval}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Unlimited {sessionType} sessions</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Priority support</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Cancel anytime</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Secure payment powered by Stripe</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {selectedPlan && (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  publication={publication}
                  selectedPlan={selectedPlan}
                  user={user}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            )}

            {!selectedPlan && !loadingPlans && (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4" />
                <p>Please select a plan to continue</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PrivateExpertPaymentModal
