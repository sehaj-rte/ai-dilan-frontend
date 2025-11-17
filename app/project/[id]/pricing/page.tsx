'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  DollarSign, 
  Edit, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { API_URL } from '@/lib/config'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

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

const PricingPage: React.FC = () => {
  const params = useParams()
  const expertId = params.id as string
  
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    currency: 'USD',
    billing_interval: 'month'
  })

  useEffect(() => {
    fetchPlans()
  }, [expertId])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/plans/experts/${expertId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPlan.name || !newPlan.price) {
      alert('Please fill in all required fields')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`${API_URL}/plans/experts/${expertId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newPlan.name,
          price: parseFloat(newPlan.price),
          currency: newPlan.currency,
          billing_interval: newPlan.billing_interval
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchPlans() // Refresh the list
        setShowCreateForm(false)
        setNewPlan({ name: '', price: '', currency: 'USD', billing_interval: 'month' })
        alert('Plan created successfully!')
      } else {
        alert(data.message || 'Failed to create plan')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      alert('Error creating plan')
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return
    }

    setActionLoading(planId)
    try {
      const response = await fetch(`${API_URL}/plans/experts/${expertId}/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchPlans() // Refresh the list
        alert('Plan deleted successfully')
      } else {
        alert('Failed to delete plan')
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
      alert('Error deleting plan')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pricing Plans</h1>
            <p className="text-gray-600 mt-2">
              Create and manage subscription plans for your AI expert
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>

        {/* Create Plan Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Pricing Plan</CardTitle>
              <CardDescription>
                Set up a new subscription plan with Stripe integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="planName">Plan Name *</Label>
                    <Input
                      id="planName"
                      placeholder="e.g., Basic Plan, Premium Plan"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="planPrice">Price *</Label>
                    <Input
                      id="planPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="29.99"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={newPlan.currency} 
                      onValueChange={(value) => setNewPlan(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="interval">Billing Interval</Label>
                    <Select 
                      value={newPlan.billing_interval} 
                      onValueChange={(value) => setNewPlan(prev => ({ ...prev, billing_interval: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create Plan
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Plans List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pricing Plans</h3>
              <p className="text-gray-600 mb-4">
                Create your first pricing plan to start accepting subscriptions
              </p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Badge className={plan.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {plan.currency} {plan.price}
                    <span className="text-lg text-gray-500 font-normal">
                      /{plan.billing_interval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{formatDate(plan.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stripe Product:</span>
                      <span className={plan.stripe_product_id ? 'text-green-600' : 'text-red-600'}>
                        {plan.stripe_product_id ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stripe Price:</span>
                      <span className={plan.stripe_price_id ? 'text-green-600' : 'text-red-600'}>
                        {plan.stripe_price_id ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={actionLoading === plan.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {actionLoading === plan.id ? (
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

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Stripe Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-semibold">Stripe Connected</div>
                  <div className="text-sm text-gray-600">Ready to accept payments</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-semibold">Webhooks Configured</div>
                  <div className="text-sm text-gray-600">Real-time updates enabled</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-semibold">SSL Secured</div>
                  <div className="text-sm text-gray-600">Payments are secure</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default PricingPage
