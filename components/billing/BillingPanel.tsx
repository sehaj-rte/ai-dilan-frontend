'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Settings, 
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Star,
  MessageCircle,
  Phone
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
  plan_id?: string // Add plan_id to the interface
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
  is_default?: boolean
}

// Add Plan interface with limit fields
interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_interval: string
  features: string[]
  recommended?: boolean
  message_limit?: number | null
  minute_limit?: number | null
}

interface BillingPanelProps {
  userToken: string
  expertSlug?: string // Add expertSlug prop
}

const BillingPanel: React.FC<BillingPanelProps> = ({
  userToken,
  expertSlug // Add expertSlug prop
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [plans, setPlans] = useState<Plan[]>([]) // Add plans state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null) // Add selected plan state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [upgrading, setUpgrading] = useState(false) // Add upgrading state
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null) // Add selected subscription for upgrade
  const [expertId, setExpertId] = useState<string | null>(null) // Add expertId state
  
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast()

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      if (!userToken) return

      try {
        setLoading(true)
        setError(null)

        // Fetch expert ID if expertSlug is provided
        let expertIdLocal = null;
        if (expertSlug) {
          try {
            const expertResponse = await fetch(`${API_URL}/public/expert/${expertSlug}`)
            const expertData = await expertResponse.json()
            
            if (expertData.success && expertData.expert) {
              expertIdLocal = expertData.expert.id;
              setExpertId(expertData.expert.id)
            }
          } catch (expertError) {
            console.error('Error fetching expert data:', expertError)
          }
        }

        // Fetch subscriptions from database (more reliable)
        const subscriptionsResponse = await fetch(`${API_URL}/payments/subscriptions/database`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })
        const subscriptionsData = await subscriptionsResponse.json()

        if (subscriptionsData.success) {
          // Filter subscriptions to only show those for the current expert if expertId is available
          let filteredSubscriptions = subscriptionsData.subscriptions || [];
          if (expertIdLocal) {
            filteredSubscriptions = filteredSubscriptions.filter(
              (sub: Subscription) => sub.expert_id === expertIdLocal
            );
          }
          
          setSubscriptions(filteredSubscriptions)
          
          // Find the subscription for this expert if we have one
          if (expertIdLocal && filteredSubscriptions.length > 0) {
            // Only consider active subscriptions
            const activeSubscriptions = filteredSubscriptions.filter((sub: Subscription) => sub.status === 'active');
            const expertSubscription = activeSubscriptions.length > 0 ? activeSubscriptions[0] : null; // Take the first active one
            setSelectedSubscription(expertSubscription)
          } else if (expertIdLocal) {
            // No subscription for this expert yet
            setSelectedSubscription(null)
          }
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

        // Fetch expert plans if expertSlug is provided
        if (expertSlug) {
          try {
            const plansResponse = await fetch(`${API_URL}/public/expert/${expertSlug}/plans`)
            const plansData = await plansResponse.json()
            
            if (plansData.success && plansData.plans) {
              // Transform plans to match our interface with limit fields
              const transformedPlans = plansData.plans.map((plan: any) => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                currency: plan.currency || 'USD',
                billing_interval: plan.billing_interval,
                message_limit: plan.message_limit,
                minute_limit: plan.minute_limit,
                features: [
                'Priority support',
                '24/7 access'
                ],
                // Always mark the second plan as recommended
                recommended: plan.name.toLowerCase().includes('pro') || plan.recommended
              }))
              
              setPlans(transformedPlans)
              // Auto-select the recommended plan or the first one
              const recommendedPlan = transformedPlans.find((p: Plan) => p.recommended) || transformedPlans[0]
              setSelectedPlan(recommendedPlan)
            }
          } catch (planError) {
            console.error('Error fetching expert plans:', planError)
            // Fallback to mock data if fetching plans fails
            setMockPlans()
          }
        } else {
          // Fallback to mock data if no expertSlug provided
          setMockPlans()
        }

      } catch (err) {
        console.error('Error fetching billing data:', err)
        setError('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [userToken, expertSlug, expertId])

  // Set mock plans as fallback with limit fields
  const setMockPlans = () => {
    const mockPlans: Plan[] = [
      {
        id: '1',
        name: 'Basic Plan',
        price: 29,
        currency: 'USD',
        billing_interval: 'month',
        message_limit: 100,
        minute_limit: 30,
        features: [
          'Email support',
          'Cancel anytime',
          'Basic analytics'
        ],
        recommended: false
      },
      {
        id: '2',
        name: 'Pro Plan',
        price: 59,
        currency: 'USD',
        billing_interval: 'month',
        message_limit: 500,
        minute_limit: 120,
        features: [
          'Priority support',
          'Advanced analytics',
          'Custom integrations',
          'Cancel anytime'
        ],
        recommended: true
      },
      {
        id: '3',
        name: 'Enterprise Plan',
        price: 99,
        currency: 'USD',
        billing_interval: 'month',
        message_limit: null, // Unlimited
        minute_limit: null, // Unlimited
        features: [
          'Dedicated support',
          'Custom branding',
          'API access',
          'SLA guarantee'
        ],
        recommended: false
      }
    ]
    
 
    // Auto-select the recommended plan or the first one
    const recommendedPlan = mockPlans.find(p => p.recommended) || mockPlans[0]
    setSelectedPlan(recommendedPlan)
  }

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

  // Generate dynamic features based on plan limits
  const generatePlanFeatures = (plan: Plan) => {
    const features = [...plan.features]; // Start with existing features
    
    // Add message limit feature
    if (plan.message_limit !== undefined && plan.message_limit !== null) {
      if (plan.message_limit > 0) {
        features.unshift(`${plan.message_limit} chat messages per ${plan.billing_interval}`);
      } else {
        features.unshift('Unlimited chat messages');
      }
    } else {
      // Default to unlimited if not specified
      features.unshift('Unlimited chat messages');
    }
    
    // Add minute limit feature
    if (plan.minute_limit !== undefined && plan.minute_limit !== null) {
      if (plan.minute_limit > 0) {
        features.unshift(`${plan.minute_limit} voice call minutes per ${plan.billing_interval}`);
      } else {
        features.unshift('Unlimited voice calls');
      }
    } else {
      // Default to unlimited if not specified
      features.unshift('Unlimited voice calls');
    }
    
    return features;
  };

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
        showSuccess('Subscription cancelled successfully')
      } else {
        showError('Failed to cancel subscription: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error canceling subscription:', err)
      showError('Failed to cancel subscription')
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
        showSuccess('Subscription reactivated successfully')
      } else {
        showError('Failed to reactivate subscription: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error reactivating subscription:', err)
      showError('Failed to reactivate subscription')
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
        showSuccess('Default payment method updated successfully')
        // Refresh payment methods to show updated default
        const paymentMethodsResponse = await fetch(`${API_URL}/payments/payment-methods`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })
        const paymentMethodsData = await paymentMethodsResponse.json()
        if (paymentMethodsData.success) {
          setPaymentMethods(paymentMethodsData.payment_methods || [])
        }
      } else {
        showError('Failed to update default payment method: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error setting default payment method:', err)
      showError('Failed to update default payment method')
    }
  }

  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true)
  }

  const handlePaymentMethodAdded = () => {
    setShowAddPaymentModal(false)
    showSuccess('Payment method added successfully')
    // Refresh billing data to show new payment method
    // Fetch updated payment methods instead of reloading the page
    const fetchPaymentMethods = async () => {
      try {
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
        console.error('Error fetching payment methods:', err)
      }
    }
    fetchPaymentMethods()
  }

  // Handle plan upgrade
  const handleUpgradePlan = async (plan: Plan) => {
    setSelectedPlan(plan)
    
    // Add a small delay to ensure the selectedPlan state is updated
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // If we don't have a selected subscription but we're viewing plans for a specific expert,
    // we need to create a new subscription rather than replace an existing one
    if (!selectedSubscription && expertId) {
      // For now, we'll show an alert that the user needs to select a subscription
      // In a real implementation, this would redirect to a checkout flow
      showError('To subscribe to this plan, please go through the expert\'s subscription flow.')
      return
    }
    
    if (!selectedSubscription) {
      showError('Please select a subscription to upgrade.')
      return
    }
    
    // Check if the selected subscription is active
    if (selectedSubscription.status !== 'active') {
      showError('Can only upgrade active subscriptions. Current subscription status: ' + selectedSubscription.status)
      return
    }
    
    setUpgrading(true)
    try {
      // Use the replace subscription endpoint to upgrade the plan
      const response = await fetch(`${API_URL}/payments/subscriptions/${selectedSubscription.stripe_subscription_id}/replace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_plan_id: plan.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Check if we need to handle a client_secret for incomplete payments
        if (data.client_secret) {
          // Handle Stripe payment confirmation
          showSuccess(`Redirecting to complete payment for ${plan.name} plan...`)
          // In a real implementation, you would use Stripe.js to confirm the payment
          // For now, we'll just show a message
          setTimeout(() => {
            window.location.reload()
          }, 3000)
        } else if (data.checkout_url) {
          // Redirect to Stripe Checkout if needed
          showSuccess(`Redirecting to checkout for ${plan.name} plan...`)
          setTimeout(() => {
            window.location.href = data.checkout_url
          }, 2000)
        } else {
          showSuccess(`Successfully upgraded to ${plan.name} plan!`)
          // Refresh subscriptions to show the updated plan
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      } else {
        showError('Failed to upgrade plan: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error upgrading plan:', err)
      showError('Failed to upgrade plan. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Wrap all sections in a container with reduced max-width and centered margin */}
      <div style={{ maxWidth: '950px', margin: '0 auto' }} className="space-y-10">
        {/* Plan Selection - Added section */}
        {plans.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Subscription Plans</h3>
            {expertSlug && (
              <p className="text-gray-600 mb-4">
                Plans for expert: {expertSlug}
              </p>
            )}
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {plans.map((plan, index) => {
                  // Check if this is the current plan for any ACTIVE subscription
                  const isCurrentPlan = subscriptions.some(sub => sub.plan_id === plan.id && sub.status === 'active');
                  // Always show the badge on the second plan (index 1)
                  const showRecommendedBadge = index === 1 && plan.recommended;
                  const dynamicFeatures = generatePlanFeatures(plan);
                  
                  return (
                    <div key={plan.id} className="relative flex justify-center">
                      {showRecommendedBadge && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                            Recommended
                          </Badge>
                        </div>
                      )}
                      <Card
                        className={`w-full max-w-[300px] cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col h-full ${
                          isCurrentPlan
                            ? 'ring-4 ring-green-500 ring-offset-2 border-green-200'
                            : selectedPlan?.id === plan.id
                              ? 'ring-4 ring-blue-500 ring-offset-2 border-blue-200'
                              : 'hover:border-gray-300'
                        }`}
                        onClick={(e) => {
                          // Only select the plan if not clicking on the action button
                          if (!isCurrentPlan) {
                            setSelectedPlan(plan);
                          }
                        }}
                      >
                        <CardHeader className="pb-4 pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <CardTitle className="text-xl flex items-center gap-2">
                                {plan.name}
                              </CardTitle>
                              <div className="text-2xl font-bold text-blue-600 mt-3">
                                ${plan.price}
                                <span className="text-base text-gray-500 font-normal">
                                  /{plan.billing_interval}
                                </span>
                              </div>
                            </div>
                            {isCurrentPlan ? (
                              <Badge className="bg-green-500 text-white text-sm px-2 py-1">
                                Current Plan
                              </Badge>
                            ) : selectedPlan?.id === plan.id && (
                              <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 pb-6 flex-grow flex flex-col">
                          <ul className="space-y-3 text-sm flex-grow">
                            {dynamicFeatures.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                        {/* Action button at the bottom of each card */}
                        <div className="px-6 pb-8 pt-4">
                          {!isCurrentPlan && (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlan(plan);
                                // Use a timeout to ensure state is updated before calling handleUpgradePlan
                                setTimeout(() => handleUpgradePlan(plan), 0);
                              }}
                              disabled={upgrading}
                            >
                              {upgrading && selectedPlan?.id === plan.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {selectedSubscription ? 'Upgrading...' : 'Subscribing...'}
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  {selectedSubscription ? 'Upgrade Plan' : 'Subscribe to Plan'}
                                </>
                              )}
                            </Button>
                          )}
                          {isCurrentPlan && (
                            <Button
                              variant="outline"
                              className="w-full py-3"
                              disabled
                            >
                              Current Plan
                            </Button>
                          )}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
              
              {/* Remove the global upgrade button since we now have individual buttons in each card */}
            </div>
          </div>
        )}

        {/* Active Subscriptions */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>
                  {expertSlug 
                    ? `No active subscriptions for expert: ${expertSlug}` 
                    : 'No active subscriptions'}
                </p>
                {expertSlug && (
                  <p className="mt-2 text-sm">
                    Subscribe to a plan above to get started with this expert.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-1">
                        <div className="flex items-center justify-between md:justify-start gap-2">
                          <div>
                            <CardTitle className="text-lg">{subscription.plan_name}</CardTitle>
                            {subscription.expert_name && (
                              <p className="text-sm text-gray-600 mt-1">
                                Expert: {subscription.expert_name}
                              </p>
                            )}
                          </div>
                          <div className="md:hidden">
                            {getStatusBadge(subscription.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-1 flex flex-col items-center justify-center">
                        <p className="text-sm text-gray-600">Current Period</p>
                        <p className="font-semibold text-center">
                          {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                      
                      <div className="md:col-span-1 flex items-center justify-between md:justify-end gap-2">
                        <div className="hidden md:block">
                          {getStatusBadge(subscription.status)}
                        </div>
                        <div>
                          {subscription.cancel_at_period_end ? (
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-sm text-red-600 text-right">
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
                            ''
                          )}
                        </div>
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
                          {method.is_default && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.is_default ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Set Default
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="text-gray-400"
                          >
                            Default
                          </Button>
                        )}
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
    </div>
  )
}

export default BillingPanel