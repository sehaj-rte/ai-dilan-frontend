"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/lib/config";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TrialDebugPanelProps {
  subscriptionId: string;
  userToken: string;
}

export const TrialDebugPanel: React.FC<TrialDebugPanelProps> = ({
  subscriptionId,
  userToken,
}) => {
  // Hide debug panel in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [terminationResult, setTerminationResult] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [paceWarning, setPaceWarning] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/debug`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error("Error fetching debug info:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      
      // Fetch usage stats from database subscriptions endpoint
      const usageResponse = await fetch(
        `${API_URL}/payments/subscriptions/database`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      const usageData = await usageResponse.json();
      
      // Find current subscription usage info
      const currentSub = usageData.subscriptions?.find(
        (sub: any) => sub.stripe_subscription_id === subscriptionId
      );
      
      setUsageStats(currentSub?.usage_info || null);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDebugInfo(),
        fetchUsageStats(),
        checkPaceWarning()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetTrial = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/reset-trial`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      setTerminationResult(data);
    } catch (error) {
      console.error("Error resetting trial:", error);
      setTerminationResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const updateUsageTracking = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/update-usage-tracking`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      setTerminationResult(data);
    } catch (error) {
      console.error("Error updating usage tracking:", error);
      setTerminationResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const checkPaceWarning = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/usage-pace-warning`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      const data = await response.json();
      setPaceWarning(data);
    } catch (error) {
      console.error("Error checking pace warning:", error);
      setPaceWarning({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testTrialTermination = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/payments/subscriptions/${subscriptionId}/terminate-trial`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      setTerminationResult(data);

      // If requires 3D Secure, handle it
      if (data.success && (data.requires_confirmation || data.requires_action)) {
        const stripe = await stripePromise;
        if (stripe && data.client_secret) {
          console.log("🔥 Confirming payment with client_secret:", data.client_secret);
          const { error, paymentIntent } = await stripe.confirmCardPayment(
            data.client_secret
          );

          if (error) {
            console.error("Payment confirmation error:", error);
            setTerminationResult({
              ...data,
              confirmation_error: error.message,
            });
          } else {
            console.log("Payment confirmed:", paymentIntent);
            setTerminationResult({
              ...data,
              confirmation_success: true,
              payment_intent_status: paymentIntent.status,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error testing trial termination:", error);
      setTerminationResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Trial Debug Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={refreshAllData} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              🔄 Refresh All Data
            </Button>
            <Button onClick={fetchUsageStats} disabled={loading} variant="outline">
              Get Usage Stats
            </Button>
            <Button onClick={checkPaceWarning} disabled={loading} variant="outline">
              Check Pace Warning
            </Button>
          </div>
          
          <div className="flex gap-2 flex-wrap border-t pt-3">
            <Button onClick={resetTrial} disabled={loading} variant="secondary">
              Reset Trial (7 days)
            </Button>
            <Button onClick={testTrialTermination} disabled={loading}>
              Test Trial Termination
            </Button>
            <Button onClick={updateUsageTracking} disabled={loading} variant="secondary">
              Update Usage to Paid
            </Button>
            <Button onClick={fetchDebugInfo} disabled={loading} variant="outline">
              Raw Debug Info
            </Button>
          </div>

          {usageStats && (
            <div className="space-y-3">
              <h3 className="font-semibold">Current Usage Tracking:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm font-medium text-blue-900">Messages</div>
                  <div className="text-lg font-bold text-blue-700">
                    {usageStats.messages_used} / {usageStats.message_limit}
                  </div>
                  <div className="text-xs text-blue-600">
                    {usageStats.message_percentage}% used
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm font-medium text-green-900">Minutes</div>
                  <div className="text-lg font-bold text-green-700">
                    {usageStats.minutes_used} / {usageStats.minute_limit}
                  </div>
                  <div className="text-xs text-green-600">
                    {usageStats.minute_percentage}% used
                  </div>
                </div>
              </div>
              {usageStats.trial_days_remaining !== undefined && (
                <div className="bg-orange-50 p-3 rounded">
                  <div className="text-sm font-medium text-orange-900">Trial Status</div>
                  <div className="text-lg font-bold text-orange-700">
                    {usageStats.trial_days_remaining} days remaining
                  </div>
                </div>
              )}
            </div>
          )}

          {paceWarning && (
            <div className="space-y-2">
              <h3 className="font-semibold">Pace Warning Analysis:</h3>
              {paceWarning.success && paceWarning.show_warning ? (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                  <div className="text-sm font-medium text-orange-900 mb-2">⚠️ Usage Pace Warning</div>
                  {paceWarning.warnings?.map((warning: any, index: number) => (
                    <div key={index} className="mb-2 text-sm">
                      <div className="font-medium text-orange-800 capitalize">{warning.type}:</div>
                      <div className="text-orange-700">
                        • Current: {warning.current_usage} / {warning.total_limit} total
                      </div>
                      <div className="text-orange-700">
                        • Monthly limit: {warning.monthly_limit} per month
                      </div>
                      <div className="text-orange-700">
                        • Projected monthly usage: {warning.projected_monthly}
                      </div>
                      <div className="text-orange-700">
                        • Days elapsed: {warning.days_elapsed}
                      </div>
                      <div className="text-orange-700">
                        • Billing period: {warning.billing_months} months
                      </div>
                    </div>
                  ))}
                  {paceWarning.usage_stats && (
                    <div className="mt-2 text-xs text-orange-600">
                      Daily pace: {paceWarning.usage_stats.messages_per_day} msg/day, {paceWarning.usage_stats.minutes_per_day} min/day
                    </div>
                  )}
                </div>
              ) : paceWarning.success ? (
                <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-800">
                  ✅ No pace warning needed - usage is within expected range
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                  ❌ Error checking pace: {paceWarning.error}
                </div>
              )}
            </div>
          )}

          {debugInfo && (
            <div className="space-y-2">
              <h3 className="font-semibold">Debug Information:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {terminationResult && (
            <div className="space-y-2">
              <h3 className="font-semibold">Termination Result:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(terminationResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};