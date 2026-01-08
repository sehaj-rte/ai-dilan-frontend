"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import BillingPanel from "@/components/billing/BillingPanel";
import { UsageStatusBar } from "@/components/usage/UsageStatusBar";
import { usePlanLimitations } from "@/hooks/usePlanLimitations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, BarChart3 } from "lucide-react";
import { RootState } from "@/store/store";
import { API_URL } from "@/lib/config";

const ExpertBillingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expertSlug = searchParams.get("expert");

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expertId, setExpertId] = useState<string | null>(null);

  // Plan limitations hook - only enabled when we have expert context
  const {
    limitStatus,
    currentPlan,
    loading: planLoading,
  } = usePlanLimitations({
    expertId: expertId || "",
    enabled: isAuthenticated && !!expertId,
  });

  // Callback to receive expertId from BillingPanel
  const handleExpertIdFetched = (id: string | null) => {
    setExpertId(id);
  };

  // Expert ID will be fetched by BillingPanel - no need to duplicate the call
  useEffect(() => {
    if (!expertSlug) {
      setLoading(false);
    } else {
      // Let BillingPanel handle expert fetching to avoid duplicate calls
      setLoading(false);
    }
  }, [expertSlug]);

  useEffect(() => {
    // Check if user is authenticated
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("dilan_ai_token")
        : null;
    setUserToken(token);
    if (!expertSlug) {
      setLoading(false);
    }
  }, [expertSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              You need to be logged in to view billing information.
            </p>
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  // Redirect back to expert page with slug, defaulting to ai-jeff if no expert slug
                  const targetSlug = expertSlug || 'ai-jeff';
                  router.push(`/expert/${targetSlug}`);
                }}
              >
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="mx-auto px-4 py-4 max-w-[1300px]">
        {" "}
        {/* reduced width */}
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Expert Billing & Subscriptions
          </h1>

          <p className="text-gray-600 mt-1">
            Manage your expert subscriptions, payment methods, and billing information
          </p>
        </div>
        {/* Billing Content */}
        <Card className="p-6">
          <BillingPanel
            userToken={userToken}
            expertSlug={expertSlug || undefined}
            usageContext={
              expertSlug && expertId && isAuthenticated
                ? {
                    limitStatus,
                    currentPlan,
                    planLoading,
                  }
                : undefined
            }
            onExpertIdFetched={handleExpertIdFetched}
          />
        </Card>
      </div>
    </div>
  );
};

export default ExpertBillingPage;