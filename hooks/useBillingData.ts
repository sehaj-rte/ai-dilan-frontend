import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

interface Subscription {
  id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_name: string;
  plan_price: number;
  plan_total_price?: number;
  plan_currency: string;
  plan_interval: string;
  plan_billing_period?: string;
  plan_display_text?: string;
  expert_id: string;
  expert_name?: string;
  expert_description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  plan_id?: string;
  invoice_url?: string;
  usage_info?: {
    trial_days_remaining: number;
    messages_used: number;
    message_limit: number;
    message_percentage: number;
    minutes_used: number;
    minute_limit: number;
    minute_percentage: number;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    name: string;
    email: string;
  };
  is_default?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: string;
  billing_interval_count?: number; // Add billing interval count field
  features: string[];
  recommended?: boolean;
  message_limit?: number | null;
  minute_limit?: number | null;
}

interface Expert {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface UseBillingDataProps {
  userToken: string | null;
  expertSlug?: string;
}

interface BillingData {
  subscriptions: Subscription[];
  paymentMethods: PaymentMethod[];
  plans: Plan[];
  expert: Expert | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useBillingData = ({ userToken, expertSlug }: UseBillingDataProps): BillingData => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    if (!userToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create all API calls in parallel - no sequential dependencies
      const apiCalls = [
        // Always fetch subscriptions and payment methods
        fetch(`${API_URL}/payments/subscriptions/database`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }).then(res => res.json()),

        fetch(`${API_URL}/payments/payment-methods`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }).then(res => res.json()),
      ];

      // COMMENTED OUT: Expert and plans calls - not needed since plans section was removed
      // This significantly improves page load performance
      // if (expertSlug) {
      //   apiCalls.push(
      //     fetch(`${API_URL}/public/expert/${expertSlug}`).then(res => res.json()),
      //     fetch(`${API_URL}/public/expert/${expertSlug}/plans`).then(res => res.json())
      //   );
      // } else {
      //   // For general billing page, try to fetch general plans if available
      //   // This could be a general plans endpoint or we can use mock data
      //   apiCalls.push(
      //     Promise.resolve({ success: false }), // Placeholder for expert data
      //     Promise.resolve({ success: false })  // Placeholder for plans data
      //   );
      // }

      // Add placeholder promises to maintain array structure
      apiCalls.push(
        Promise.resolve({ success: false }), // Placeholder for expert data
        Promise.resolve({ success: false })  // Placeholder for plans data
      );

      // Execute all calls in parallel
      const results = await Promise.all(apiCalls);
      const [subscriptionsData, paymentMethodsData, expertData, plansData] = results;

      // COMMENTED OUT: Expert data processing - not needed since plans section was removed
      // let expertIdLocal = null;
      // if (expertSlug && expertData && expertData.success && expertData.expert) {
      //   expertIdLocal = expertData.expert.id;
      //   setExpert({
      //     id: expertData.expert.id,
      //     name: expertData.expert.name,
      //     slug: expertData.expert.slug,
      //     description: expertData.expert.description,
      //   });
      // }

      // Process subscriptions - no expert filtering needed anymore
      if (subscriptionsData.success) {
        // Show all subscriptions without filtering by expert
        setSubscriptions(subscriptionsData.subscriptions || []);
      }

      // Process payment methods
      if (paymentMethodsData.success) {
        setPaymentMethods(paymentMethodsData.payment_methods || []);
      }

      // COMMENTED OUT: Plans processing - not needed since plans section was removed
      // This saves processing time and improves performance
      // if (expertSlug && plansData && plansData.success && plansData.plans && plansData.plans.length > 0) {
      //   console.log('Raw plans data from API:', plansData.plans);
      //   const uniquePlans = plansData.plans.filter((plan: any, index: number, self: any[]) =>
      //     index === self.findIndex((p: any) => p.id === plan.id)
      //   );
      //   console.log('Unique plans after deduplication:', uniquePlans);
      //   const transformedPlans = uniquePlans.map((plan: any) => ({
      //     id: plan.id,
      //     name: plan.name,
      //     price: plan.price,
      //     currency: plan.currency || "GBP",
      //     billing_interval: plan.billing_interval,
      //     billing_interval_count: plan.billing_interval_count || 1,
      //     message_limit: plan.message_limit,
      //     minute_limit: plan.minute_limit,
      //     features: [
      //       `${plan.message_limit || 'Unlimited'} chat messages per month`,
      //       `${plan.minute_limit || 'Unlimited'} voice call minutes per month`,
      //       "Priority support",
      //       "24/7 access"
      //     ],
      //     recommended: plan.recommended || (plan.name === "pro" && plan.price >= 100),
      //   }));
      //   console.log('Final transformed plans:', transformedPlans);
      //   setPlans(transformedPlans);
      // } else {
      //   console.log('No plans data available, setting empty array');
      //   setPlans([]);
      // }

      // Keep plans empty since we don't display them
      setPlans([]);
    } catch (err) {
      console.error("Error fetching billing data:", err);
      setError("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [userToken, expertSlug]);

  return {
    subscriptions,
    paymentMethods,
    plans,
    expert,
    loading,
    error,
    refetch: fetchBillingData,
  };
};