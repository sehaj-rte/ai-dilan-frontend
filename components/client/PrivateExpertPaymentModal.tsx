'use client'

import React, { useState, useEffect } from 'react'
import CleanPaymentModal from '@/components/payment/CleanPaymentModal'
import { API_URL } from '@/lib/config'

interface Publication {
  id: string
  slug: string
  display_name: string
  primary_color: string
  is_private: boolean
}

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

interface User {
  id: string
  email: string
  username: string
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

const PrivateExpertPaymentModal: React.FC<PrivateExpertPaymentModalProps> = ({
  isOpen,
  onClose,
  publication,
  sessionType,
  onPaymentSuccess,
  user
}) => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate dynamic features based on plan limits
  const generatePlanFeatures = (plan: Plan, sessionType: 'chat' | 'call') => {
    const features = [
      'Priority support',
      '24/7 access'
    ];
    
    // Add message limit feature for chat sessions or when message limit is specified
    if (plan.message_limit !== undefined && plan.message_limit !== null) {
      if (plan.message_limit > 0) {
        features.unshift(`${plan.message_limit} chat messages per ${plan.billing_interval}`);
      } else {
        features.unshift('Unlimited chat messages');
      }
    } else {
      // Default for chat sessions
      features.unshift(`Unlimited chat messages`);
    }
    
    // Add minute limit feature for call sessions or when minute limit is specified
    if (plan.minute_limit !== undefined && plan.minute_limit !== null) {
      if (plan.minute_limit > 0) {
        features.unshift(`${plan.minute_limit} voice call minutes per ${plan.billing_interval}`);
      } else {
        features.unshift('Unlimited voice calls');
      }
    } else  {
      // Default for call sessions
      features.unshift(`Unlimited voice calls`);
    }
    
    return features;
  };

  // Fetch plans for the expert
  useEffect(() => {
    const fetchPlans = async () => {
      if (!isOpen) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${API_URL}/public/expert/${publication.slug}/plans`)
        const data = await response.json()
        
        if (data.success && data.plans) {
          // Transform plans to match our interface with limit fields
          const transformedPlans = data.plans.map((plan: any, index: number) => ({
            id: plan.id,
            name: plan.name,
            price: plan.price,
            currency: plan.currency || 'USD',
            billing_interval: plan.billing_interval,
            message_limit: plan.message_limit,
            minute_limit: plan.minute_limit,
            features: [], // Will be generated dynamically
            recommended: index === 0 // Mark first plan as recommended
          }))
          
          // Generate dynamic features for each plan
          const plansWithFeatures = transformedPlans.map((plan: Plan) => ({
            ...plan,
            features: generatePlanFeatures(plan, sessionType)
          }));
          
          setPlans(plansWithFeatures)
        } else {
          setError('No pricing plans available for this expert')
        }
      } catch (err) {
        console.error('Error fetching plans:', err)
        setError('Failed to load pricing plans')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [isOpen, publication.slug, sessionType])

  if (loading) {
    return null // Or a loading spinner
  }

  if (error || plans.length === 0) {
    return null // Handle error state in parent component
  }

  return (
    <CleanPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      plans={plans}
      expertName={publication.display_name}
      expertSlug={publication.slug}
      onPaymentSuccess={onPaymentSuccess}
      userToken={typeof window !== 'undefined' ? localStorage.getItem('dilan_ai_token') || '' : ''}
    />
  )
}

export default PrivateExpertPaymentModal