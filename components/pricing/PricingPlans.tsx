'use client';

import React from 'react';
import { Clock, MessageCircle } from 'lucide-react';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  duration: string;
  monthlyPrice: number;
  upfrontPrice?: number;
  billingPeriod: number; // in months
  messagesPerMonth: number;
  minutesPerMonth: number;
  popular?: boolean;
  bestValue?: boolean;
  badge?: string;
  billingNote: string;
}

// All plans offer the EXACT same AI Jeff product - only billing differs
const commonFeatures = [
  'Full access to AI Jeff — your personalised Building Forensics assistant',
  'Jeff Charlton\'s c.40 years expert mind in your hands',
  'Unlimited expert-style responses from UK\'s #1 mould expert',
  'Personalised explanations to mould and fire damage questions',
  'Immediate responses: text or call',
  '24/7 availability',
  'Same monthly usage allowance across all plans'
];

const plans: Plan[] = [
  {
    id: '6month',
    name: 'AI Jeff — 6-Month Plan',
    duration: '6 months',
    monthlyPrice: 20,
    upfrontPrice: 120,
    billingPeriod: 6,
    messages: '1000 text messages',
    callMinutes: '240 minutes of voice calls',
    badge: 'Best Value',
    bestValue: true,
    billingNote: 'Pay £120 upfront for 6 months'
  },
  {
    id: '3month',
    name: 'AI Jeff — 3-Month Plan',
    duration: '3 months',
    monthlyPrice: 30,
    upfrontPrice: 90,
    billingPeriod: 3,
    messages: '1000 text messages',
    callMinutes: '240 minutes of voice calls',
    badge: 'Most Popular',
    popular: true,
    billingNote: 'Pay £90 upfront for 3 months'
  },
  {
    id: 'monthly',
    name: 'AI Jeff — Monthly Plan',
    duration: '1 month',
    monthlyPrice: 40,
    billingPeriod: 1,
    messages: '1000 text messages',
    callMinutes: '240 minutes of voice calls',
    badge: 'Most Flexible',
    billingNote: 'Pay monthly, cancel anytime'
  }
];

const PricingPlans: React.FC = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            AI Jeff Pricing Plans
          </h1>
        </div>

        {/* What's Included - Common for all plans */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's included in all plans
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {commonFeatures.map((feature, index) => (
              <div key={index} className="flex items-start">
                <span className="text-green-600 mr-3 mt-1 flex-shrink-0">✓</span>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center">
                <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-gray-700">Plan usage varies by duration</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-gray-700">See individual plan details</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg flex flex-col h-full ${
                  plan.popular
                    ? 'ring-2 ring-blue-600 transform scale-105'
                    : plan.bestValue
                    ? 'ring-2 ring-green-600 transform scale-105'
                    : 'hover:shadow-xl transition-shadow'
                }`}
                style={{ padding: '32px' }}
              >
                {/* 1. Badge - Standardized positioning */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 h-8 flex items-center justify-center">
                  <span className={`px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                    plan.bestValue 
                      ? 'bg-green-600 text-white'
                      : plan.popular
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                </div>

                {/* 2. Plan Title - Fixed height */}
                <div className="text-center h-16 flex items-center justify-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {plan.name}
                  </h3>
                </div>

                {/* 3. Duration - Fixed height */}
                <div className="text-center h-6 flex items-center justify-center mb-6">
                  <p className="text-sm text-gray-600 font-medium">
                    {plan.duration} commitment
                  </p>
                </div>

                {/* 4. Price Section - Standardized formatting */}
                <div className="text-center mb-2">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      £{plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600 ml-2 text-lg">/month</span>
                  </div>
                </div>

                {/* 5. Billing Info Line - Fixed height */}
                <div className="text-center h-12 flex items-center justify-center mb-4">
                  <div className="text-sm text-gray-600 text-center">
                    {plan.billingNote}
                  </div>
                </div>

                {/* 6. Total Cost - Fixed height */}
                <div className="text-center h-16 flex flex-col items-center justify-center mb-6">
                  {plan.upfrontPrice && (
                    <div className="text-lg font-semibold text-gray-900">
                      Total: £{plan.upfrontPrice}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    {plan.upfrontPrice ? 'paid upfront' : 'billed monthly'}
                  </div>
                </div>

                {/* 7. Key Benefits - Fixed height */}
                <div className="mb-8 flex-grow">
                  <ul className="space-y-3" style={{ minHeight: '120px' }}>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-3">✓</span>
                      <span className="text-sm text-gray-700">
                        {plan.duration} commitment
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-3">✓</span>
                      <span className="text-sm text-gray-700">
                        £{plan.monthlyPrice}/month effective rate
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-600 mr-3">✓</span>
                      <span className="text-sm text-gray-700">
                        {plan.upfrontPrice ? 'Best value pricing' : 'Cancel anytime'}
                      </span>
                    </li>
                    {plan.bestValue && (
                      <li className="flex items-center">
                        <span className="text-green-600 mr-3">✓</span>
                        <span className="text-sm text-gray-700 font-medium">
                          Save £{(40 - plan.monthlyPrice) * plan.billingPeriod} vs monthly
                        </span>
                      </li>
                    )}
                    {plan.popular && (
                      <li className="flex items-center">
                        <span className="text-green-600 mr-3">✓</span>
                        <span className="text-sm text-gray-700 font-medium">
                          Save £{(40 - plan.monthlyPrice) * plan.billingPeriod} vs monthly
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* 10. CTA Button - Always aligned at bottom */}
                <div className="mt-auto">
                  <button
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-colors h-12 ${
                      plan.popular || plan.bestValue
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    Choose Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            All prices shown in GBP. Secure payment processing. Cancel anytime for monthly plans.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;