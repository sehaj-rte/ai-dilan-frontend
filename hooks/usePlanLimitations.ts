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

      // For trial subscriptions, use trial usage info if available
      if (subscription?.status === "trialing" && subscription?.usage_info) {
        effectiveMessageLimit = subscription.usage_info.message_limit;
        effectiveMinuteLimit = subscription.usage_info.minute_limit;
        effectiveMessagesUsed = subscription.usage_info.messages_used;
        effectiveMinutesUsed = subscription.usage_info.minutes_used;
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
      // Fetch usage data
      const usageResponse = await fetch(
        `${API_URL}/usage/user/${user.id}/expert/${expertId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
          },
        },
      );

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.success) {
          setUsage(usageData.usage);
        }
      }

      // Fetch subscription and plan data
      const subscriptionResponse = await fetch(
        `${API_URL}/subscriptions/user/${user.id}/expert/${expertId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("dilan_ai_token")}`,
          },
        },
      );

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        if (subscriptionData.success && subscriptionData.subscription) {
          setSubscription(subscriptionData.subscription);
          setCurrentPlan(subscriptionData.subscription.plan);
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

      // If there are minute limits, check if user has enough minutes for the estimated duration
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
