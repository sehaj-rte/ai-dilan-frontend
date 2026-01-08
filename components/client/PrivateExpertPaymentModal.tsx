"use client";

import React, { useState, useEffect } from "react";
import CleanPaymentModal from "@/components/payment/CleanPaymentModal";
import { API_URL } from "@/lib/config";

interface Publication {
  id: string;
  slug: string;
  display_name: string;
  primary_color: string;
  is_private: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: string;
  billing_interval_count?: number;
  features: string[];
  recommended?: boolean;
  message_limit?: number | null;
  minute_limit?: number | null;
}

interface PrivateExpertPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: Publication;
  sessionType: "chat" | "call";
  onPaymentSuccess: (subscriptionId: string) => void;
}

const PrivateExpertPaymentModal: React.FC<PrivateExpertPaymentModalProps> = ({
  isOpen,
  onClose,
  publication,
  sessionType,
  onPaymentSuccess,
}) => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [expertId, setExpertId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate dynamic features based on plan limits
  const generatePlanFeatures = (plan: Plan, sessionType: "chat" | "call") => {
    const features = ["Priority support", "24/7 access"];

    // Add message limit feature for chat sessions or when message limit is specified
    if (plan.message_limit !== undefined && plan.message_limit !== null) {
      if (plan.message_limit > 0) {
        features.unshift(
          `${plan.message_limit} chat messages per ${plan.billing_interval}`,
        );
      } else {
        features.unshift("Unlimited chat messages");
      }
    } else {
      // Default for chat sessions
      features.unshift(`Unlimited chat messages`);
    }

    // Add minute limit feature for call sessions or when minute limit is specified
    if (plan.minute_limit !== undefined && plan.minute_limit !== null) {
      if (plan.minute_limit > 0) {
        features.unshift(
          `${plan.minute_limit} voice call minutes per ${plan.billing_interval}`,
        );
      } else {
        features.unshift("Unlimited voice calls");
      }
    } else {
      // Default for call sessions
      features.unshift(`Unlimited voice calls`);
    }

    return features;
  };

  // Fetch plans for the expert
  useEffect(() => {
    if (!isOpen) return;

    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_URL}/public/expert/${publication.slug}/plans`,
        );
        const data = await response.json();

        if (data.success && data.plans) {
          // Store expert ID for coupon validation
          setExpertId(data.expert_id);
          
          const transformedPlans = data.plans.map(
            (plan: any, index: number) => ({
              id: plan.id,
              name: plan.name,
              price: plan.price,
              currency: plan.currency || "GBP",
              billing_interval: plan.billing_interval,
              billing_interval_count: plan.billing_interval_count,
              message_limit: plan.message_limit,
              minute_limit: plan.minute_limit,
              features: [],
              recommended: index === 0,
            }),
          );

          const plansWithFeatures = transformedPlans.map((plan: Plan) => ({
            ...plan,
            features: generatePlanFeatures(plan, sessionType),
          }));

          setPlans(plansWithFeatures);
        } else {
          setError("No pricing plans available for this expert");
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("Failed to load pricing plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [isOpen, publication.slug, sessionType]);

  if (loading) {
    return null;
  }

  if (error || plans.length === 0) {
    return null;
  }

  return (
    <CleanPaymentModal
      isOpen={isOpen}
      onClose={onClose}
      plans={plans}
      expertName={publication.display_name}
      expertSlug={publication.slug}
      expertId={expertId}
      onPaymentSuccess={onPaymentSuccess}
      userToken={
        typeof window !== "undefined"
          ? localStorage.getItem("dilan_ai_token") || ""
          : ""
      }
    />
  );
};

export default PrivateExpertPaymentModal;
