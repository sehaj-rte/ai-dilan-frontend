'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, CreditCard, Shield, Zap, Star } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { API_URL } from '@/lib/config'
import SubscriptionCheckout from '@/components/subscription/SubscriptionCheckout'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
  created_at: string
  updated_at: string
}

interface Expert {
  id: string
  name: string
  description: string
  avatar_url?: string
}

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [experts, setExperts] = useState<Expert[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    fetchExperts()
  }, [])

  const fetchExperts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/public/experts/search?limit=50`)
      const data = await response.json()
      
      if (data.success && data.experts) {
        setExperts(data.experts)
        // Auto-select first expert
        if (data.experts.length > 0) {
          setSelectedExpert(data.experts[0])
          fetchPlansForExpert(data.experts[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching experts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlansForExpert = async (expertId: string) => {
    try {
      const response = await fetch(`${API_URL}/plans/experts/${expertId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      if (data.success && data.plans) {
        setPlans(data.plans)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }

  const handleExpertSelect = (expert: Expert) => {
    setSelectedExpert(expert)
    fetchPlansForExpert(expert.id)
    setSelectedPlan(null)
  }

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
    setShowCheckout(true)
  }

  const handleCheckoutClose = () => {
    setShowCheckout(false)
    setSelectedPlan(null)
  }

  const handlePaymentSuccess = () => {
    setShowCheckout(false)
    setSelectedPlan(null)
    // Redirect to success page or show success message
    alert('Subscription created successfully!')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please log in to view and subscribe to plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/auth/login'}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your AI Expert Subscription
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to AI experts with flexible pricing plans
          </p>
        </div>

        {/* Expert Selection */}
        {experts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Select an Expert</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experts.map((expert) => (
                <Card
                  key={expert.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedExpert?.id === expert.id
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handleExpertSelect(expert)}
                >
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">
                      {expert.name.charAt(0)}
                    </div>
                    <CardTitle className="text-lg">{expert.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {expert.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Plans Section */}
        {selectedExpert && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Pricing Plans for {selectedExpert.name}
            </h2>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No plans available for this expert</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan, index) => (
                  <Card
                    key={plan.id}
                    className="relative hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200"
                  >
                    {index === 1 && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      <div className="text-4xl font-bold text-blue-600 mt-2">
                        {plan.currency} {plan.price}
                        <span className="text-lg text-gray-500 font-normal">
                          /{plan.billing_interval}
                        </span>
                      </div>
                      <CardDescription className="mt-2">
                        Perfect for {plan.billing_interval}ly usage
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span>Unlimited chat sessions</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span>Voice call access</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span>Priority support</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                     
                        </div>
                      </div>

                      <Separator />

                      <Button
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3"
                        onClick={() => handlePlanSelect(plan)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Shield className="w-4 h-4" />
                        <span>Secure payment with Stripe</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our AI Experts?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Access</h3>
              <p className="text-gray-600">
                Get immediate access to AI experts 24/7 without waiting
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your conversations are encrypted and completely private
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Knowledge</h3>
              <p className="text-gray-600">
                Access specialized knowledge from industry experts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedPlan && selectedExpert && (
        <Elements stripe={stripePromise}>
          <SubscriptionCheckout
            plan={selectedPlan}
            expert={selectedExpert}
            user={user!}
            onClose={handleCheckoutClose}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </div>
  )
}

export default SubscriptionPage
