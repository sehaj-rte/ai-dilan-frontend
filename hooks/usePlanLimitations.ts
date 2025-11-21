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
    ): UsageLimitStatus => {
      if (!usage || !plan || !isAuthenticated) {
        return {
          canSendMessage: !isAuthenticated,
          canMakeCall: !isAuthenticated,
          messagesRemaining: null,
          minutesRemaining: null,
          isUnlimited: false,
          limitReachedType: "none",
        };
      }

      const isUnlimited = !plan.message_limit && !plan.minute_limit;

      // Calculate remaining usage
      const messagesRemaining = plan.message_limit
        ? Math.max(0, plan.message_limit - usage.messages_used)
        : null;
      const minutesRemaining = plan.minute_limit
        ? Math.max(0, plan.minute_limit - usage.minutes_used)
        : null;

      // Check what limits are reached
      let limitReachedType: UsageLimitStatus["limitReachedType"] = "none";
      let canSendMessage = true;
      let canMakeCall = true;

      // Check message limits
      if (plan.message_limit && usage.messages_used >= plan.message_limit) {
        canSendMessage = false;
        limitReachedType = "messages";
      }

      // Check minute limits
      if (plan.minute_limit && usage.minutes_used >= plan.minute_limit) {
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

  const limitStatus = calculateLimitStatus(usage, currentPlan);

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
