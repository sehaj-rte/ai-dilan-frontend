"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { API_URL } from "@/lib/config";
import {
  UserUsage,
  UsageLimitStatus,
  PlanWithLimitations,
  UserSubscriptionWithPlan,
  UsageTrackingEvent,
} from "@/types/plan-limitations";

interface UsePlanLimitationsProps {
  expertId: string;
  enabled?: boolean;
}

interface UsePlanLimitationsReturn {
  usage: UserUsage | null;
  limitStatus: UsageLimitStatus;
  currentPlan: PlanWithLimitations | null;
  subscription: UserSubscriptionWithPlan | null;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
  trackUsage: (
    event: Omit<UsageTrackingEvent, "user_id" | "timestamp">,
  ) => Promise<void>;
  checkCanSendMessage: () => boolean;
  checkCanMakeCall: (estimatedMinutes?: number) => boolean;
  getRemainingUsage: () => {
    messages: number | null;
    minutes: number | null;
  };
}

export const usePlanLimitations = ({
  expertId,
  enabled = true,
}: UsePlanLimitationsProps): UsePlanLimitationsReturn => {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanWithLimitations | null>(
    null,
  );
  const [subscription, setSubscription] =
    useState<UserSubscriptionWithPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate limit status based on usage and plan
  const calculateLimitStatus = useCallback(
    (
      usage: UserUsage | null,
      plan: PlanWithLimitations | null,
      subscription: UserSubscriptionWithPlan | null,
    ): UsageLimitStatus => {
      // If not authenticated, allow usage (will be handled by auth checks elsewhere)
      if (!isAuthenticated) {
        return {
          canSendMessage: true,
          canMakeCall: true,
          messagesRemaining: null,
          minutesRemaining: null,
          isUnlimited: false,
          limitReachedType: "none",
        };
      }

      // If data is not yet loaded, allow usage to avoid false positives
      // The actual limit check will happen once data is loaded
      if (!usage || !plan) {
        return {
          canSendMessage: true,
          canMakeCall: true,
          messagesRemaining: null,
          minutesRemaining: null,
          isUnlimited: false,
          limitReachedType: "none",
        };
      }

      // Check if this is a trial subscription and use trial limits
      let effectiveMessageLimit = plan.message_limit;
      let effectiveMinuteLimit = plan.minute_limit;
      let effectiveMessagesUsed = usage.messages_used;
      let effectiveMinutesUsed = usage.minutes_used;

      // For subscriptions with usage_info, use that data (works for both trial and paid)
      if (subscription?.usage_info) {
        effectiveMessageLimit = subscription.usage_info.message_limit;
        effectiveMinuteLimit = subscription.usage_info.minute_limit;
        effectiveMessagesUsed = subscription.usage_info.messages_used;
        effectiveMinutesUsed = subscription.usage_info.minutes_used;
      } else if (usage) {
        // Fallback to usage data if no usage_info in subscription
        effectiveMessagesUsed = usage.messages_used;
        effectiveMinutesUsed = usage.minutes_used;
      }

      const isUnlimited = !effectiveMessageLimit && !effectiveMinuteLimit;

      // Calculate remaining usage
      const messagesRemaining = effectiveMessageLimit
        ? Math.max(0, effectiveMessageLimit - effectiveMessagesUsed)
        : null;
      const minutesRemaining = effectiveMinuteLimit
        ? Math.max(0, effectiveMinuteLimit - effectiveMinutesUsed)
        : null;

      // Check what limits are reached
      let limitReachedType: UsageLimitStatus["limitReachedType"] = "none";
      let canSendMessage = true;
      let canMakeCall = true;

      // Check message limits
      if (effectiveMessageLimit && effectiveMessagesUsed >= effectiveMessageLimit) {
        canSendMessage = false;
        limitReachedType = "messages";
      }

      // Check minute limits
      if (effectiveMinuteLimit && effectiveMinutesUsed >= effectiveMinuteLimit) {
        canMakeCall = false;
        if (limitReachedType === "none") limitReachedType = "minutes";
      }

      return {
        canSendMessage,
        canMakeCall,
        messagesRemaining,
        minutesRemaining,
        isUnlimited,
        limitReachedType,
      };
    },
    [isAuthenticated],
  );

  const limitStatus = calculateLimitStatus(usage, currentPlan, subscription);

  // Fetch user's current usage and plan
  const fetchUsageAndPlan = useCallback(async () => {
    if (!enabled || !isAuthenticated || !user?.id || !expertId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the same endpoint as billing page for accurate usage data
      const response = await fetch(
        `${API_URL}/payments/subscriptions/database`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.subscriptions) {
          // Find subscription for this expert
          const expertSubscription = data.subscriptions.find(
            (sub: any) => sub.expert_id === expertId
          );

          if (expertSubscription) {
            // Extract usage data from subscription
            const usageInfo = expertSubscription.usage_info;
            if (usageInfo) {
              setUsage({
                user_id: expertSubscription.user_id || '',
                expert_id: expertId,
                plan_id: expertSubscription.plan_id,
                current_period_start: expertSubscription.current_period_start || '',
                current_period_end: expertSubscription.current_period_end || '',
                messages_used: usageInfo.messages_used,
                minutes_used: usageInfo.minutes_used,
                message_limit: usageInfo.message_limit,
                minute_limit: usageInfo.minute_limit,
                is_trial: usageInfo.trial_days_remaining > 0,
                trial_days_remaining: usageInfo.trial_days_remaining,
                subscription_id: expertSubscription.stripe_subscription_id,
                last_reset_date: expertSubscription.current_period_start || '',
                updated_at: new Date().toISOString()
              });
            }

            // Set subscription data
            setSubscription({
              ...expertSubscription,
              plan: {
                id: expertSubscription.plan_id,
                name: expertSubscription.plan_name,
                price: expertSubscription.plan_price,
                currency: expertSubscription.plan_currency,
                billing_interval: expertSubscription.plan_interval,
                message_limit: usageInfo?.message_limit || null,
                minute_limit: usageInfo?.minute_limit || null,
              },
              usage_info: usageInfo
            });

            // Set current plan
            setCurrentPlan({
              id: expertSubscription.plan_id,
              expert_id: expertId,
              name: expertSubscription.plan_name,
              price: expertSubscription.plan_price,
              currency: expertSubscription.plan_currency,
              billing_interval: expertSubscription.plan_interval,
              billing_interval_count: 1,
              stripe_product_id: expertSubscription.stripe_product_id || null,
              stripe_price_id: expertSubscription.stripe_price_id || null,
              is_active: true,
              created_at: expertSubscription.created_at || new Date().toISOString(),
              updated_at: expertSubscription.updated_at || new Date().toISOString(),
              message_limit: usageInfo?.message_limit || null,
              minute_limit: usageInfo?.minute_limit || null,
            });
          } else {
            // No subscription found for this expert
            setUsage(null);
            setSubscription(null);
            setCurrentPlan(null);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching usage and plan data:", err);
      setError("Failed to load usage information");
    } finally {
      setLoading(false);
    }
  }, [enabled, isAuthenticated, user?.id, expertId]);

  // Track usage event
  const trackUsage = useCallback(
    async (event: Omit<UsageTrackingEvent, "user_id" | "timestamp">) => {
      if (!isAuthenticated || !user?.id) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/usage/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
          },
          body: JSON.stringify({
            ...event,
            user_id: user.id,
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          // Refresh usage after tracking
          await fetchUsageAndPlan();
        }
      } catch (err) {
        console.error("Error tracking usage:", err);
      }
    },
    [isAuthenticated, user?.id, fetchUsageAndPlan],
  );

  // Convenience methods
  const checkCanSendMessage = useCallback((): boolean => {
    return limitStatus.canSendMessage;
  }, [limitStatus.canSendMessage]);

  const checkCanMakeCall = useCallback(
    (estimatedMinutes: number = 1): boolean => {
      if (!limitStatus.canMakeCall) {
        return false;
      }

      // If there are minute limits, check if user has enough minutes
      // For starting calls: require at least 1 minute
      // For ongoing calls: will be handled by real-time tracking
      if (
        limitStatus.minutesRemaining !== null &&
        limitStatus.minutesRemaining < estimatedMinutes
      ) {
        return false;
      }

      return true;
    },
    [limitStatus],
  );

  const getRemainingUsage = useCallback(() => {
    return {
      messages: limitStatus.messagesRemaining,
      minutes: limitStatus.minutesRemaining,
    };
  }, [limitStatus]);

  const refreshUsage = useCallback(async () => {
    await fetchUsageAndPlan();
  }, [fetchUsageAndPlan]);

  // Initial load and refresh on dependencies change
  useEffect(() => {
    if (enabled && isAuthenticated && user?.id && expertId) {
      fetchUsageAndPlan();
    }
  }, [fetchUsageAndPlan, enabled, isAuthenticated, user?.id, expertId]);

  return {
    usage,
    limitStatus,
    currentPlan,
    subscription,
    loading,
    error,
    refreshUsage,
    trackUsage,
    checkCanSendMessage,
    checkCanMakeCall,
    getRemainingUsage,
  };
};

export default usePlanLimitations;
