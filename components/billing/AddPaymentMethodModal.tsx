'use client'

import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CreditCard, 
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield
} from 'lucide-react'
import { API_URL } from '@/lib/config'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface AddPaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const PaymentMethodForm: React.FC<{
  onSuccess: () => void
  onError: (error: string) => void
}> = ({ onSuccess, onError }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [cardholderName, setCardholderName] = useState('')

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
      onError('Payment system not ready. Please try again.')
      return
    }

    if (!cardholderName.trim()) {
      onError('Please enter the cardholder name')
      return
    }

    const cardElement = elements.getElement(CardNumberElement)
    if (!cardElement) {
      onError('Card element not found')
      return
    }

    setLoading(true)

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
        },
      })

      if (paymentMethodError) {
        onError(paymentMethodError.message || 'Failed to add payment method')
        setLoading(false)
        return
      }

      // Save payment method to backend
      const response = await fetch(`${API_URL}/payments/payment-methods/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`
        },
        body: JSON.stringify({
          payment_method_id: paymentMethod.id
        })
      })

      const data = await response.json()

      if (!data.success) {
        onError(data.error || 'Failed to save payment method')
        setLoading(false)
        return
      }

      onSuccess()

    } catch (error) {
      console.error('Payment method error:', error)
      onError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          placeholder="John Doe"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          required
        />
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <Label>Card Number</Label>
        <div className="border rounded-md p-3 bg-white">
          <CardNumberElement options={cardElementOptions} />
        </div>
      </div>
      
      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <div className="border rounded-md p-3 bg-white">
            <CardExpiryElement options={cardElementOptions} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>CVC</Label>
          <div className="border rounded-md p-3 bg-white">
            <CardCvcElement options={cardElementOptions} />
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Secure Payment</p>
          <p className="text-blue-700">
            Your payment information is encrypted and securely processed by Stripe
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Adding Card...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5 mr-2" />
            Add Payment Method
          </>
        )}
      </Button>
    </form>
  )
}

const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSuccess = () => {
    setSuccess(true)
    setError(null)
    setTimeout(() => {
      setSuccess(false)
      onSuccess()
    }, 1500)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setSuccess(false)
  }

  const handleClose = () => {
    if (!success) {
      setError(null)
      onClose()
    }
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Card Added Successfully!
            </h2>
            <p className="text-gray-600">
              Your payment method has been saved securely
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a new card to your account for quick and secure payments
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <Elements stripe={stripePromise}>
          <PaymentMethodForm
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}

export default AddPaymentMethodModal
