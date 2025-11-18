'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Settings, 
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import AddPaymentMethodModal from './AddPaymentMethodModal'

interface Subscription {
  id: string
  stripe_subscription_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  plan_name: string
  plan_price: number
  plan_currency: string
  plan_interval: string
  expert_id: string
  expert_name?: string
  expert_description?: string
  user_id: string
  created_at: string
  updated_at: string
}

interface PaymentMethod {
  id: string
  type: string
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  billing_details: {
    name: string
    email: string
  }
}

interface BillingSectionProps {
  isOpen: boolean
  onClose: () => void
  userToken: string
}

const BillingSection: React.FC<BillingSectionProps> = ({
  isOpen,
  onClose,
  userToken
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      if (!isOpen || !userToken) return

      try {
        setLoading(true)
        setError(null)

        // Fetch subscriptions from database (more reliable)
        const subscriptionsResponse = await fetch(`${API_URL}/payments/subscriptions/database`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })
        const subscriptionsData = await subscriptionsResponse.json()

        if (subscriptionsData.success) {
          setSubscriptions(subscriptionsData.subscriptions || [])
        } else {
          console.error('Failed to fetch subscriptions:', subscriptionsData.error)
        }

        // Fetch payment methods
        const paymentMethodsResponse = await fetch(`${API_URL}/payments/payment-methods`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })
        const paymentMethodsData = await paymentMethodsResponse.json()

        if (paymentMethodsData.success) {
          setPaymentMethods(paymentMethodsData.payment_methods || [])
        }

      } catch (err) {
        console.error('Error fetching billing data:', err)
        setError('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [isOpen, userToken])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      trialing: { color: 'bg-blue-100 text-blue-800', label: 'Trial' },
      past_due: { color: 'bg-red-100 text-red-800', label: 'Past Due' },
      canceled: { color: 'bg-gray-100 text-gray-800', label: 'Canceled' },
      incomplete: { color: 'bg-yellow-100 text-yellow-800', label: 'Incomplete' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription? It will remain active until the end of your current billing period.')) return

    try {
      const response = await fetch(`${API_URL}/payments/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Refresh subscriptions
        setSubscriptions(prev => 
          prev.map(sub => 
            sub.stripe_subscription_id === subscriptionId 
              ? { ...sub, cancel_at_period_end: true }
              : sub
          )
        )
      } else {
        alert('Failed to cancel subscription: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error canceling subscription:', err)
      alert('Failed to cancel subscription')
    }
  }

  const handleReactivateSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to reactivate this subscription?')) return

    try {
      const response = await fetch(`${API_URL}/payments/subscriptions/${subscriptionId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Refresh subscriptions
        setSubscriptions(prev => 
          prev.map(sub => 
            sub.stripe_subscription_id === subscriptionId 
              ? { ...sub, cancel_at_period_end: false }
              : sub
          )
        )
      } else {
        alert('Failed to reactivate subscription: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error reactivating subscription:', err)
      alert('Failed to reactivate subscription')
    }
  }

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`${API_URL}/payments/payment-methods/${paymentMethodId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        alert('Default payment method updated successfully')
        // Refresh payment methods to show updated default
        window.location.reload()
      } else {
        alert('Failed to update default payment method: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error setting default payment method:', err)
      alert('Failed to update default payment method')
    }
  }

  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true)
  }

  const handlePaymentMethodAdded = () => {
    setShowAddPaymentModal(false)
    // Refresh billing data to show new payment method
    window.location.reload()
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2">Loading billing information...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Billing & Subscriptions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Subscriptions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
            {subscriptions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No active subscriptions</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{subscription.plan_name}</CardTitle>
                          {subscription.expert_name && (
                            <p className="text-sm text-gray-600 mt-1">
                              Expert: {subscription.expert_name}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(subscription.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Price</p>
                          <p className="font-semibold">
                            ${subscription.plan_price}/{subscription.plan_interval}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Current Period</p>
                          <p className="font-semibold">
                            {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscription.cancel_at_period_end ? (
                            <div className="space-y-2">
                              <div className="text-sm text-red-600">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                Cancels at period end
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReactivateSubscription(subscription.stripe_subscription_id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                Reactivate
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelSubscription(subscription.stripe_subscription_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel Subscription
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Payment Methods</h3>
              <Button onClick={handleAddPaymentMethod} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </Button>
            </div>
            
            {paymentMethods.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No payment methods saved</p>
                  <Button onClick={handleAddPaymentMethod} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Card
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <Card key={method.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="font-semibold">
                              •••• •••• •••• {method.card.last4}
                            </p>
                            <p className="text-sm text-gray-600">
                              {method.card.brand.toUpperCase()} • Expires {method.card.exp_month}/{method.card.exp_year}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Set Default
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Payment Method Modal */}
        <AddPaymentMethodModal
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          onSuccess={handlePaymentMethodAdded}
        />
      </DialogContent>
    </Dialog>
  )
}

export default BillingSection
