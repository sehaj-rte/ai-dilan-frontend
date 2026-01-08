'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Plus,
  Settings,
  Trash2
} from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { API_URL } from '@/lib/config'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

interface Subscription {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  plan: {
    id: string
    amount: number
    currency: string
    interval: string
  }
  metadata: {
    user_id: string
    plan_id: string
    publication_id: string
    expert_id: string
  }
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

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubscriptions()
      fetchPaymentMethods()
    }
  }, [isAuthenticated])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setSubscriptions(data.subscriptions || [])
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setPaymentMethods(data.payment_methods || [])
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription? It will remain active until the end of the current billing period.')) {
      return
    }

    setActionLoading(subscriptionId)
    try {
      const response = await fetch(`${API_URL}/payments/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchSubscriptions() // Refresh the list
        alert('Subscription cancelled successfully')
      } else {
        alert('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Error cancelling subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    setActionLoading(paymentMethodId)
    try {
      const response = await fetch(`${API_URL}/payments/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchPaymentMethods() // Refresh the list
        alert('Payment method removed successfully')
      } else {
        alert('Failed to remove payment method')
      }
    } catch (error) {
      console.error('Error removing payment method:', error)
      alert('Error removing payment method')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancelling</Badge>
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      case 'canceled':
        return <Badge variant="secondary">Cancelled</Badge>
      case 'incomplete':
        return <Badge className="bg-yellow-500">Incomplete</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCardBrandIcon = (brand: string) => {
    // You can add specific brand icons here
    return <CreditCard className="w-5 h-5" />
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Login Required</CardTitle>
              <CardDescription>
                Please log in to view your subscriptions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscriptions</h1>
            <p className="text-gray-600 mt-2">
              Manage your AI expert subscriptions and payment methods
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/subscription'}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Subscription
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading subscriptions...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Subscriptions */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Active Subscriptions</h2>
              
              {subscriptions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
                    <p className="text-gray-600 mb-4">
                      You don't have any active subscriptions yet
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/subscription'}
                      className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      Browse Plans
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <Card key={subscription.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              AI Expert Subscription
                            </CardTitle>
                            <CardDescription>
                              Expert ID: {subscription.metadata.expert_id}
                            </CardDescription>
                          </div>
                          {getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              {subscription.plan.currency.toUpperCase()} {subscription.plan.amount}
                              /{subscription.plan.interval}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              Next billing: {formatDate(subscription.current_period_end)}
                            </span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Started: {formatDate(subscription.current_period_start)}
                          </div>
                          
                          {!subscription.cancel_at_period_end && subscription.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelSubscription(subscription.id)}
                              disabled={actionLoading === subscription.id}
                            >
                              {actionLoading === subscription.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Payment Methods</h2>
              
              {paymentMethods.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
                    <p className="text-gray-600 mb-4">
                      Add a payment method to start subscribing
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/subscription'}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <Card key={method.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getCardBrandIcon(method.card.brand)}
                            <div>
                              <div className="font-semibold">
                                •••• •••• •••• {method.card.last4}
                              </div>
                              <div className="text-sm text-gray-600">
                                {method.card.brand.toUpperCase()} • Expires {method.card.exp_month}/{method.card.exp_year}
                              </div>
                              <div className="text-sm text-gray-500">
                                {method.billing_details.name}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            disabled={actionLoading === method.id}
                          >
                            {actionLoading === method.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing History */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Billing History</h2>
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Billing History</h3>
              <p className="text-gray-600">
                Your billing history will appear here once you have active subscriptions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SubscriptionsPage
