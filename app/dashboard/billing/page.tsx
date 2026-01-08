'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { API_URL } from '@/lib/config'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import AddPaymentMethodModal from '@/components/billing/AddPaymentMethodModal'

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

const BillingPage: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      fetchPaymentMethods()
    }
  }, [isAuthenticated])

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/payments/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setPaymentMethods(data.payment_methods || [])
        // The first one is usually default
        if (data.payment_methods && data.payment_methods.length > 0) {
          setDefaultPaymentMethod(data.payment_methods[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setLoading(false)
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
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`
        }
      })
      const data = await response.json()

      if (data.success) {
        await fetchPaymentMethods()
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

  const getCardBrandLogo = (brand: string) => {
    const brandLower = brand.toLowerCase()
    const brandClass = {
      'visa': 'bg-blue-600',
      'mastercard': 'bg-red-600',
      'amex': 'bg-blue-800',
      'discover': 'bg-orange-600',
      'default': 'bg-gray-600'
    }

    return brandClass[brandLower as keyof typeof brandClass] || brandClass.default
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Login Required</CardTitle>
              <CardDescription>
                Please log in to manage your billing
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Payment Methods</h1>
            <p className="text-gray-600 mt-2">
              Manage your payment methods and billing information
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading payment methods...</span>
          </div>
        ) : (
          <>
            {/* Payment Methods */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Saved Cards</h2>
                {paymentMethods.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {paymentMethods.length} card{paymentMethods.length !== 1 ? 's' : ''} saved
                  </span>
                )}
              </div>

              {paymentMethods.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CreditCard className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Payment Methods</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Add a payment method to start subscribing to AI experts and manage your payments easily
                    </p>
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Card
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {paymentMethods.map((method, index) => (
                    <Card
                      key={method.id}
                      className={`transition-all hover:shadow-md ${defaultPaymentMethod === method.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {/* Card Icon */}
                            <div className={`w-12 h-12 rounded-lg ${getCardBrandLogo(method.card.brand)} flex items-center justify-center text-white font-bold shadow-md`}>
                              {method.card.brand.substring(0, 1).toUpperCase()}
                            </div>

                            {/* Card Details */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">
                                  {method.card.brand.toUpperCase()}
                                </h3>
                                {index === 0 && (
                                  <Badge className="bg-blue-500 text-white text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 font-mono text-lg">
                                •••• •••• •••• {method.card.last4}
                              </p>
                              <p className="text-sm text-gray-500">
                                Expires {String(method.card.exp_month).padStart(2, '0')}/{method.card.exp_year}
                              </p>
                              {method.billing_details.name && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {method.billing_details.name}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePaymentMethod(method.id)}
                              disabled={actionLoading === method.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {actionLoading === method.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <CardTitle className="text-lg">Secure & Encrypted</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Your payment information is encrypted and securely stored by Stripe, our trusted payment processor. We never store your full card details.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-lg">Easy Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Saved cards can be used for quick checkout when subscribing to AI experts. You can add, remove, or update your payment methods anytime.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          fetchPaymentMethods()
        }}
      />
    </DashboardLayout>
  )
}

export default BillingPage
