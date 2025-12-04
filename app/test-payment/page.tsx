"use client";

import React, { useState } from "react";
import CleanPaymentModal from "@/components/payment/CleanPaymentModal";
import { Button } from "@/components/ui/button";

const TestPaymentPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock plans data
  const mockPlans = [
    {
      id: "1",
      name: "Basic Plan",
      price: 29,
      currency: "USD",
      billing_interval: "month",
      features: [
        "Unlimited chat sessions",
        "Email support",
        "Cancel anytime",
        "Basic analytics",
      ],
    },
    {
      id: "2",
      name: "Pro Plan",
      price: 59,
      currency: "USD",
      billing_interval: "month",
      features: [
        "Unlimited chat & call sessions",
        "Priority support",
        "Advanced analytics",
        "Custom integrations",
        "Cancel anytime",
      ],
      recommended: true,
    },
    {
      id: "3",
      name: "Enterprise Plan",
      price: 99,
      currency: "USD",
      billing_interval: "month",
      features: [
        "Everything in Pro",
        "Dedicated support",
        "Custom branding",
        "API access",
        "SLA guarantee",
      ],
    },
  ];

  const handlePaymentSuccess = (subscriptionId: string) => {
    console.log("Payment successful! Subscription ID:", subscriptionId);
    setIsModalOpen(false);
    alert(`Payment successful! Subscription ID: ${subscriptionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Test Clean Payment Modal
        </h1>
        <p className="text-gray-600 mb-8">
          Click the button below to test the new Windsurf-style payment modal
        </p>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          Open Payment Modal
        </Button>

        <div className="mt-6 text-sm text-gray-500">
          <p>This is a test page for the new payment flow:</p>
          <ul className="mt-2 space-y-1">
            <li>• First-time users → Stripe Checkout</li>
            <li>• Existing users → Direct subscription</li>
            <li>• Clean, modern UI design</li>
          </ul>
        </div>
      </div>

      <CleanPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plans={mockPlans}
        expertName="Test Expert"
        onPaymentSuccess={handlePaymentSuccess}
        userToken={
          typeof window !== "undefined"
            ? localStorage.getItem("dilan_ai_token") || ""
            : ""
        }
      />
    </div>
  );
};

export default TestPaymentPage;
