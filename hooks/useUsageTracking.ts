"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";

interface UsageStats {
  success: boolean;
  subscription_id: string;
  user_id: string;
  expert_id: string;
  is_trial: boolean;
  trial_start_date?: string;
  trial_end_date?: string;
  trial_days_remaining?: number;
  messages_used: number;
  minutes_used: number;
  message_limit?: number;
  minute_limit?: number;
  message_percentage: number;
  minute_percentage: number;
  created_at?: string;
  updated_at?: string;
}

interface UsageThresholds {
  success: boolean;
  is_trial: boolean;
  messages: {
    used: number;
    limit: number;
    percentage: number;
    warning_reached: boolean;
    limit_exceeded: boolean;
  };
  minutes: {
    used: number;
    limit: number;
    percentage: number;
    warning_reached: boolean;
    limit_exceeded: boolean;
  };
  any_limit_exceeded: boolean;
  any_warning_reached: boolean;
}

export const useUsageTracking = (subscriptionId?: string) => {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageThresholds, setUsageThresholds] = useState<UsageThresholds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch usage statistics
  const fetchUsageStats = useCallback(async (subId?: string) => {
    if (!subId && !subscriptionId) return;
    
    const targetSubId = subId || subscriptionId;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `${API_URL}/usage/${targetSubId}/stats`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        setUsageStats(data);
      } else {
        setError(data.error || "Failed to fetch usage stats");
      }
    } catch (err) {
      console.error("Error fetching usage stats:", err);
      setError("Error fetching usage statistics");
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  // Check usage thresholds
  const checkUsageThresholds = useCallback(async (subId?: string) => {
    if (!subId && !subscriptionId) return;
    
    const targetSubId = subId || subscriptionId;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/usage/${targetSubId}/thresholds`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        setUsageThresholds(data);
        return data;
      } else {
        console.error("Failed to check usage thresholds:", data.error);
      }
    } catch (err) {
      console.error("Error checking usage thresholds:", err);
    }

    return null;
  }, [subscriptionId]);

  // Increment message usage
  const incrementMessageUsage = useCallback(async (subId?: string) => {
    if (!subId && !subscriptionId) return null;
    
    const targetSubId = subId || subscriptionId;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/usage/${targetSubId}/messages/increment`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Refresh usage stats after increment
        await fetchUsageStats(targetSubId);
        return data;
      } else {
        console.error("Failed to increment message usage:", data.error);
      }
    } catch (err) {
      console.error("Error incrementing message usage:", err);
    }

    return null;
  }, [subscriptionId, fetchUsageStats]);

  // Increment minute usage
  const incrementMinuteUsage = useCallback(async (minutes: number, subId?: string) => {
    if (!subId && !subscriptionId) return null;
    
    const targetSubId = subId || subscriptionId;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/usage/${targetSubId}/minutes/increment`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ minutes }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Refresh usage stats after increment
        await fetchUsageStats(targetSubId);
        return data;
      } else {
        console.error("Failed to increment minute usage:", data.error);
      }
    } catch (err) {
      console.error("Error incrementing minute usage:", err);
    }

    return null;
  }, [subscriptionId, fetchUsageStats]);

  // Check if service can be used
  const canUseService = useCallback(async (serviceType: "messages" | "minutes" | "general", subId?: string) => {
    if (!subId && !subscriptionId) return { can_use: false, reason: "No subscription ID" };
    
    const targetSubId = subId || subscriptionId;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/usage/${targetSubId}/can-use/${serviceType}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        console.error("Failed to check service usage:", data.error);
      }
    } catch (err) {
      console.error("Error checking service usage:", err);
    }

    return { can_use: false, reason: "Error checking usage" };
  }, [subscriptionId]);

  // Auto-fetch usage stats when subscription ID changes
  useEffect(() => {
    if (subscriptionId) {
      fetchUsageStats();
    }
  }, [subscriptionId, fetchUsageStats]);

  // Helper to check if warning should be shown
  const shouldShowWarning = useCallback(() => {
    if (!usageThresholds) return false;
    return usageThresholds.any_warning_reached && !usageThresholds.any_limit_exceeded;
  }, [usageThresholds]);

  // Helper to check if upgrade prompt should be shown
  const shouldShowUpgradePrompt = useCallback(() => {
    if (!usageThresholds) return false;
    return usageThresholds.any_limit_exceeded;
  }, [usageThresholds]);

  // Helper to get formatted usage stats for components
  const getFormattedUsageStats = useCallback(() => {
    if (!usageStats) return null;

    return {
      messages: {
        used: usageStats.messages_used,
        limit: usageStats.message_limit || 0,
        percentage: usageStats.message_percentage,
      },
      minutes: {
        used: usageStats.minutes_used,
        limit: usageStats.minute_limit || 0,
        percentage: usageStats.minute_percentage,
      },
      is_trial: usageStats.is_trial,
      trial_days_remaining: usageStats.trial_days_remaining,
    };
  }, [usageStats]);

  return {
    usageStats,
    usageThresholds,
    loading,
    error,
    fetchUsageStats,
    checkUsageThresholds,
    incrementMessageUsage,
    incrementMinuteUsage,
    canUseService,
    shouldShowWarning,
    shouldShowUpgradePrompt,
    getFormattedUsageStats,
  };
};