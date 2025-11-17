'use client'

import React, { useState, useEffect } from 'react'
import { 
  useStripe, 
  useElements, 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement 
} from '@stripe/react-stripe-js'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  Lock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  User,
  Mail
} from 'lucide-react'
import { API_URL } from '@/lib/config'

interface Plan {
  id: string
  expert_id: string
  name: string
  price: number
  currency: string
  billing_interval: string
  stripe_product_id: string | null
  stripe_price_id: string | null
}

interface Expert {
  id: string
  name: string
  description: string
  avatar_url?: string
}

interface User {
  id: string
  email: string
  full_name?: string
}

interface SubscriptionCheckoutProps {
  plan: Plan
  expert: Expert
  user: User
  onClose: () => void
  onSuccess: () => void
}

const SubscriptionCheckout: React.FC<SubscriptionCheckoutProps> = ({
  plan,
  expert,
  user,
  onClose,
  onSuccess
}) => {
  const stripe = useStripe()
  const elements = useElements()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saveCard, setSaveCard] = useState(true)
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
    
    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.')
      return
    }

    const cardElement = elements.getElement(CardNumberElement)
    if (!cardElement) {
      setError('Card element not found')
      return
    }

    setLoading(true)
    setError(null)

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
        setError(paymentMethodError.message || 'Failed to create payment method')
        setLoading(false)
        return
      }

      // Step 2: Save payment method if requested
      if (saveCard && paymentMethod) {
        await fetch(`${API_URL}/payments/payment-methods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            payment_method_id: paymentMethod.id,
            set_as_default: true
          })
        })
      }

      // Step 3: Create subscription
      const subscriptionResponse = await fetch(`${API_URL}/payments/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          plan_id: plan.id,
          publication_id: expert.id, // Assuming expert.id is the publication_id
          payment_method_id: paymentMethod.id
        })
      })

      const subscriptionData = await subscriptionResponse.json()

      if (!subscriptionData.success) {
        setError(subscriptionData.error || 'Failed to create subscription')
        setLoading(false)
        return
      }

      // Step 4: Handle subscription status
      if (subscriptionData.status === 'active') {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else if (subscriptionData.status === 'incomplete') {
        // Handle 3D Secure or other authentication
        const { error: confirmError } = await stripe.confirmCardPayment(
          subscriptionData.client_secret
        )
        
        if (confirmError) {
          setError(confirmError.message || 'Payment confirmation failed')
        } else {
          setSuccess(true)
          setTimeout(() => {
            onSuccess()
          }, 2000)
        }
      }

    } catch (error) {
      console.error('Subscription error:', error)
      setError('An unexpected error occurred. Please try again.')
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

  if (success) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Subscription Created!
            </h2>
            <p className="text-gray-600 mb-4">
              You now have access to {expert.name}
            </p>
            <Button onClick={onSuccess} className="w-full">
              Start Chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Complete Your Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {expert.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{expert.name}</h3>
                    <p className="text-sm text-gray-600">{plan.name}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subscription</span>
                    <span>{plan.currency} {plan.price}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Billing</span>
                    <span>Every {plan.billing_interval}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{plan.currency} {plan.price}/{plan.billing_interval}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4" />
              <span>Secure payment powered by Stripe</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveCard"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="saveCard" className="text-sm">
                      Save this card for future payments
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!stripe || loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Subscribe {plan.currency} {plan.price}/{plan.billing_interval}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SubscriptionCheckout
