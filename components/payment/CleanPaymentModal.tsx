"use client";
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  Shield,
  Star,
  Zap,
  ArrowRight,
  MessageCircle,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/store/hooks";
import { registerUser, type AuthResponse } from "@/store/slices/authSlice";

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

interface CleanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Plan[];
  expertName: string;
  expertSlug?: string;
  expertId?: string;
  onPaymentSuccess: (subscriptionId: string) => void;
  userToken: string;
}

const CleanPaymentModal: React.FC<CleanPaymentModalProps> = ({
  isOpen,
  onClose,
  plans,
  expertName,
  expertSlug,
  expertId,
  onPaymentSuccess,
  userToken,
}) => {
  const dispatch = useAppDispatch();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasExistingCard, setHasExistingCard] = useState<boolean | null>(null);
  const [checkingPaymentMethods, setCheckingPaymentMethods] = useState(true);
  const [activeToken, setActiveToken] = useState(userToken);
  const [accountForm, setAccountForm] = useState({ email: "", password: "" });
  const [accountError, setAccountError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"plan" | "account">("plan");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponValidation, setCouponValidation] = useState<{
    isValid: boolean;
    isValidating: boolean;
    message: string;
  }>({ isValid: false, isValidating: false, message: "" });
  const [showTrialTerms, setShowTrialTerms] = useState(false);

  // Toggle state for showing discounted vs regular pricing
  const [showDiscountedPricing, setShowDiscountedPricing] = useState<{[key: string]: boolean}>({});

  // Auto-select recommended plan or first plan
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      const recommended = plans.find((p) => p.recommended);
      setSelectedPlan(recommended || plans[0]);
    }
  }, [plans, selectedPlan]);

  useEffect(() => {
    setActiveToken(userToken);
  }, [userToken, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep("plan");
      setAccountForm({ email: "", password: "" });
      setAccountError(null);
      setIsCreatingAccount(false);
      setIsRedirectingToStripe(false);
      setCouponCode("");
      setCouponValidation({ isValid: false, isValidating: false, message: "" });
      setShowTrialTerms(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeToken) {
      setCurrentStep("plan");
      setAccountForm({ email: "", password: "" });
      setAccountError(null);
    }
  }, [activeToken]);

  // Check if user has existing payment methods
  useEffect(() => {
    const checkPaymentMethods = async () => {
      if (!isOpen || !activeToken) {
        setHasExistingCard(false);
        setCheckingPaymentMethods(false);
        return;
      }

      try {
        setCheckingPaymentMethods(true);
        const response = await fetch(
          `${API_URL}/payments/check-customer-status`,
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          },
        );
        const data = await response.json();

        if (data.success) {
          setHasExistingCard(data.has_payment_methods);
        }
      } catch (err) {
        console.error("Error checking payment methods:", err);
        setHasExistingCard(false);
      } finally {
        setCheckingPaymentMethods(false);
      }
    };

    checkPaymentMethods();
  }, [isOpen, activeToken]);

  const generateUsername = (email: string) => {
    const base = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") || "member";
    return `${base}`.slice(0, 20) + Math.floor(Math.random() * 10000);
  };

  const validateCoupon = async (coupon: string) => {
    if (!coupon.trim()) {
      setCouponValidation({ isValid: false, isValidating: false, message: "" });
      setShowTrialTerms(false);
      return;
    }

    setCouponValidation({ isValid: false, isValidating: true, message: "Validating coupon..." });

    try {
      // Ensure we have an expert ID for validation
      if (!expertId) {
        setCouponValidation({
          isValid: false,
          isValidating: false,
          message: "Expert ID not available for coupon validation"
        });
        return;
      }

      const response = await fetch(`${API_URL}/plans/validate-coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coupon: coupon.trim().toUpperCase(),
          expert_id: expertId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.validation && data.validation.is_valid === true) {
        setCouponValidation({
          isValid: true,
          isValidating: false,
          message: "Valid trial coupon! 7-day free trial will be applied."
        });
        setShowTrialTerms(true);
      } else {
        setCouponValidation({
          isValid: false,
          isValidating: false,
          message: data.validation?.error_message || "Invalid coupon code"
        });
        setShowTrialTerms(false);
      }
    } catch (err) {
      console.error("Error validating coupon:", err);
      setCouponValidation({
        isValid: false,
        isValidating: false,
        message: "Error validating coupon. Please try again."
      });
      setShowTrialTerms(false);
    }
  };

  const handleCouponChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setCouponCode(upperValue);

    // Clear previous validation when typing
    if (couponValidation.isValid || couponValidation.message) {
      setCouponValidation({ isValid: false, isValidating: false, message: "" });
      setShowTrialTerms(false);
    }
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      validateCoupon(couponCode.trim());
    }
  };

  const processSubscription = async (token: string) => {
    console.log("🚀 PAYMENT DEBUG: Starting processSubscription");
    console.log("🚀 PAYMENT DEBUG: selectedPlan:", selectedPlan);
    console.log("🚀 PAYMENT DEBUG: token:", token ? "Present" : "Missing");

    if (!selectedPlan) {
      console.log("❌ PAYMENT DEBUG: No plan selected");
      setError("Please choose a plan to continue.");
      return;
    }

    // Immediately show redirect overlay for better UX
    setIsRedirectingToStripe(true);
    setError(null);

    try {
      const requestBody = {
        plan_id: selectedPlan.id,
        expert_name: expertName,
        ...(couponValidation.isValid && couponCode && { coupon: couponCode })
      };



      console.log("📤 PAYMENT DEBUG: Making API call to create subscription");
      console.log("📤 PAYMENT DEBUG: API URL:", `${API_URL}/payments/create-subscription`);
      console.log("📤 PAYMENT DEBUG: Request body:", requestBody);

      const response = await fetch(`${API_URL}/payments/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      })

      console.log("📊 PAYMENT DEBUG: Response status:", response.status);

      const data = await response.json();

      // Store payment response in localStorage
      const paymentResponseDebug = {
        timestamp: new Date().toISOString(),
        step: "payment_response",
        data: data,
        status: response.status
      };
      localStorage.setItem("payment_response_log", JSON.stringify(paymentResponseDebug));

      console.log("🔍 PAYMENT DEBUG: Payment response received:", data);

      if (!data.success) {
        console.log("❌ PAYMENT DEBUG: Payment failed:", data.error);
        setIsRedirectingToStripe(false); // Reset redirect state on error
        setError(data.error || "Failed to create subscription");
        return;
      }

      if (data.checkout_url) {

        // Redirect immediately without additional delay since we're already showing loading
        window.location.href = data.checkout_url;
      } else if (data.subscription_id) {
        console.log("✅ PAYMENT DEBUG: Payment successful, subscription_id:", data.subscription_id);

        setIsRedirectingToStripe(false); // Reset redirect state
        setSuccess(true);
        // Remove auto-redirect - let user manually continue
        onPaymentSuccess(data.subscription_id);
        if (expertSlug) {
          // Update URL without redirect to show success state
          window.history.pushState({}, '', `/expert/${expertSlug}?payment_success=true&session_id=${data.subscription_id}`);
        }
      }
    } catch (err) {
      console.error("Subscription error:", err);
      setIsRedirectingToStripe(false); // Reset redirect state on error
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    if (!activeToken) {
      setAccountError(null);
      setCurrentStep("account");
      return;
    }

    await processSubscription(activeToken);
  };

  const handleAccountSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!accountForm.email || !accountForm.password) {
      setAccountError("Please enter both email and password.");
      return;
    }

    setIsCreatingAccount(true);
    setAccountError(null);

    try {
      const resultAction = await dispatch(
        registerUser({
          email: accountForm.email.trim().toLowerCase(),
          password: accountForm.password,
          username: generateUsername(accountForm.email),
        }),
      );

      if (registerUser.fulfilled.match(resultAction)) {
        const payload = resultAction.payload as AuthResponse;

        // Registration notification will be sent after payment success with invoice information

        setActiveToken(payload.access_token);
        setCurrentStep("plan");
        setAccountForm({ email: "", password: "" });
        setIsCreatingAccount(false); // Reset account creation state before processing
        await processSubscription(payload.access_token);
      } else {
        const message =
          (resultAction.payload as string) ||
          "We could not create your account. Please try again.";
        setAccountError(message);
      }
    } catch (err) {
      console.error("Account creation error:", err);
      setAccountError("Something went wrong. Please try again.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const isAuthenticated = Boolean(activeToken);

  // Stripe Redirect Loading Overlay
  if (isRedirectingToStripe) {
    return (
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="text-center py-12">
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-3 bg-blue-50 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Redirecting to Stripe
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              Please wait while we redirect you to our secure payment processor...
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-blue-800">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Secure Payment Processing</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Your payment information is protected by industry-standard encryption
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Lock className="w-4 h-4" />
              <span>Powered by Stripe</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Thank you for your payment! A detailed invoice has been sent to your email address.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
              <Shield className="w-4 h-4" />
              <span>Secure and encrypted</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={isCreatingAccount || isRedirectingToStripe ? () => { } : onClose}>
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-y-auto"
        onPointerDownOutside={isCreatingAccount || isRedirectingToStripe ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="mb-0">
          <DialogTitle className="text-3xl font-bold text-center">
            Subscribe to {expertName}
          </DialogTitle>
        </DialogHeader>

        {currentStep === "plan" ? (
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans
                .sort((a, b) => {
                  // Sort order: Best Value (6-month) first, then Most Popular (3-month), then Most Flexible (monthly)
                  const getOrder = (plan: Plan) => {
                    if (plan.billing_interval_count === 6) return 1; // Best Value first
                    if (plan.billing_interval_count === 3) return 2; // Most Popular second
                    return 3; // Most Flexible (monthly) third
                  };
                  return getOrder(a) - getOrder(b);
                })
                .map((plan) => {
                // Enhanced plan descriptions based on client requirements
                const getEnhancedPlanInfo = (planName: string, price: number, billingIntervalCount?: number) => {
                  const monthlyPrice = billingIntervalCount ? price / billingIntervalCount : price;

                  if (billingIntervalCount === 6) {
                    return {
                      title: "AI Jeff 6 Month Plan",
                      badge: "Best Value",
                      subtitle: "Perfect for committed users who want the lowest price.",
                      features: [
                        "Full access to AI Jeff — your personalised Building Forensics assistant",
                        "Jeff Charlton's c.40 years expert mind in your hands",
                        "Unlimited expert-style responses from UK's #1 mould expert",
                        "Personalised explanations to mould and fire damage questions",
                        "Immediate responses: text or call",
                        "24/7 availability",
                        `${plan.message_limit || 'Unlimited'} text messages per month`,
                        `${plan.minute_limit || 'Unlimited'} minutes of voice calls per month`
                      ],
                      whyChoose: [
                        "Best long-term value",
                        "6-month access at the best value monthly rate",
                        "Ideal for consistent usage and professionals who want ongoing AI support"
                      ]
                    };
                  } else if (billingIntervalCount === 3) {
                    return {
                      title: "AI Jeff 3 Month Plan",
                      badge: "Most Popular",
                      subtitle: "Great for users who want flexibility without paying month-to-month.",
                      features: [
                        "Full access to AI Jeff with every feature included",
                        "Automated analysis of your questions",
                        "Personalised mould, bacteria and mycotoxin explanations",
                        "Priority email support if required",
                        "24/7 access",
                        `${plan.message_limit || 'Unlimited'} text messages per month`,
                        `${plan.minute_limit || 'Unlimited'} minutes of voice calls per month`
                      ],
                      whyChoose: [
                        "Lower upfront investment than the 6-month plan",
                        "A flexible middle option",
                        "Best for testing AI Jeff over a longer period"
                      ]
                    };
                  } else {
                    return {
                      title: "AI Jeff Monthly Plan",
                      badge: "Most Flexible",
                      subtitle: "Ideal for those who want full flexibility with no long-term commitment.",
                      features: [
                        "Immediate access to the full use of AI Jeff",
                        "Explanations to your questions on mould & fire damage findings in plain English",
                        "Generate Building Forensics-style responses",
                        "Recommendations based on Jeff's own expert knowledge",
                        "Cancel anytime",
                        `${plan.message_limit || 'Unlimited'} text messages per month`,
                        `${plan.minute_limit || 'Unlimited'} minutes of voice calls per month`
                      ],
                      whyChoose: [
                        "No commitment",
                        "Cancel anytime",
                        "Best for short-term or occasional use"
                      ]
                    };
                  }
                };

                const enhancedInfo = getEnhancedPlanInfo(plan.name, plan.price, plan.billing_interval_count);
                const isRecommended = plan.recommended || enhancedInfo.badge === "Most Popular";
                const isBestValue = enhancedInfo.badge === "Best Value";

                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all duration-300 h-full flex flex-col relative ${selectedPlan?.id === plan.id
                      ? "ring-4 ring-blue-500 ring-offset-2 border-blue-200 shadow-2xl"
                      : isBestValue
                        ? "border-2 border-green-200 shadow-lg bg-gradient-to-br from-green-50/30 to-white hover:shadow-2xl hover:border-green-300"
                        : "border border-gray-200 hover:border-gray-300 hover:shadow-xl"
                      }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    {/* Modern Badge Ribbon */}
                    {enhancedInfo.badge && (
                      <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${enhancedInfo.badge === "Best Value"
                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                        : enhancedInfo.badge === "Most Popular"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                        }`}>
                        <Star className="w-3 h-3 mr-1 inline" />
                        {enhancedInfo.badge}
                      </div>
                    )}

                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-gray-900 mb-2">
                            {enhancedInfo.title}
                          </CardTitle>

                          {/* Enhanced Pricing Display with Toggle */}
                          <div className="mb-2">
                            {(plan.billing_interval_count && plan.billing_interval_count > 1) ? (
                              <div className="space-y-1">
                                {/* Toggle Switch for Multi-month Plans */}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Show discount</span>
                                  <button
                                    onClick={() => setShowDiscountedPricing(prev => ({
                                      ...prev,
                                      [plan.id]: !prev[plan.id]
                                    }))}
                                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                      showDiscountedPricing[plan.id] !== false 
                                        ? 'bg-blue-600' 
                                        : 'bg-gray-300'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                        showDiscountedPricing[plan.id] !== false 
                                          ? 'translate-x-3.5' 
                                          : 'translate-x-0.5'
                                      }`}
                                    />
                                  </button>
                                </div>
                                
                                {/* Pricing Display */}
                                <div className="space-y-0.5">
                                  {showDiscountedPricing[plan.id] !== false ? (
                                    <>
                                      {/* All pricing info on one line */}
                                      <div className="flex items-baseline gap-2">
                                        <div className="text-3xl font-bold text-gray-900">
                                          £{(plan.price / plan.billing_interval_count).toFixed(0)}
                                          <span className="text-base text-gray-500 font-medium">/month</span>
                                        </div>
                                        <span className="text-sm text-gray-500 line-through">£40/month</span>
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                          Save {Math.round((1 - (plan.price / plan.billing_interval_count) / 40) * 100)}%
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 font-medium">
                                        billed £{plan.price} upfront
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-3xl font-bold text-gray-900">
                                        £40
                                        <span className="text-base text-gray-500 font-medium">/month</span>
                                      </div>
                                      <div className="text-xs text-gray-600 font-medium">
                                        regular monthly price
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="text-3xl font-bold text-gray-900">
                                  £{plan.price}
                                  <span className="text-base text-gray-500 font-medium">/month</span>
                                </div>
                                <div className="text-xs text-gray-600 font-medium">billed monthly</div>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 leading-snug">
                            {enhancedInfo.subtitle}
                          </p>
                        </div>

                        {selectedPlan?.id === plan.id && (
                          <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex-grow flex flex-col px-4 pb-3">
                      {/* Usage Limits Section - Ultra Compact */}
                      <div className="mb-1 p-0.5 pl-2 bg-blue-50 rounded border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-0.5 text-xs flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          Usage Allowance
                        </h4>
                        <div className="flex gap-3 text-xs">
                          <div className="flex-1">
                            <div className="flex items-center gap-0.5 mb-0.5">
                              <MessageCircle className="w-2 h-2 text-gray-500" />
                              <span className="text-gray-600 text-xs font-medium">Messages</span>
                            </div>
                            <div className="text-base font-bold text-gray-900">
                              {plan.message_limit ? Math.floor(plan.message_limit / (plan.billing_interval_count || 1)) : '∞'}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              per month
                            </div>
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded mt-0.5">
                              {plan.message_limit ? `${plan.message_limit} total` : '∞ total'}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-0.5 mb-0.5">
                              <Phone className="w-2 h-2 text-gray-500" />
                              <span className="text-gray-600 text-xs font-medium">Voice</span>
                            </div>
                            <div className="text-base font-bold text-gray-900">
                              {plan.minute_limit ? Math.floor(plan.minute_limit / (plan.billing_interval_count || 1)) : '∞'}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              minutes/month
                            </div>
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded mt-0.5">
                              {plan.minute_limit ? `${plan.minute_limit} total` : '∞ total'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Key Features Section */}
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">What's included:</h4>
                        <div className="space-y-1.5">
                          {enhancedInfo.features.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700 text-xs leading-snug">{feature}</span>
                            </div>
                          ))}

                        </div>
                      </div>

                      {/* Why Choose Section */}
                      <div className="mt-auto pt-2 border-t border-gray-100 mb-2">
                        <h4 className="font-semibold text-gray-900 mb-1.5 text-xs">Perfect for:</h4>
                        <div className="space-y-1">
                          {enhancedInfo.whyChoose.slice(0, 2).map((reason, index) => (
                            <div key={index} className="flex items-start gap-1.5">
                              <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                              <span className="text-gray-600 text-xs">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Select Plan Button */}
                      <Button
                        onClick={async () => {
                          setSelectedPlan(plan);

                          if (!activeToken) {
                            setAccountError(null);
                            setCurrentStep("account");
                            return;
                          }

                          await processSubscription(activeToken);
                        }}
                        disabled={isRedirectingToStripe || (isAuthenticated && checkingPaymentMethods)}
                        className={`w-full py-3 ${selectedPlan?.id === plan.id
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                      >
                        {isAuthenticated && checkingPaymentMethods ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : isAuthenticated && hasExistingCard ? (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Subscribe Now
                          </>
                        ) : (
                          <>Get Started</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>



            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

          </div>
        ) : (
          <div className="py-3 max-w-md mx-auto space-y-2 -mt-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-1">
              <p className="text-sm text-gray-600">
                Congratulations, you're subscribing to the <strong>{selectedPlan?.name}</strong> AI Jeff plan. 
                <button
                  type="button"
                  className="text-blue-600 hover:underline font-medium text-sm ml-1"
                  onClick={() => {
                    setCurrentStep("plan");
                    setAccountForm({ email: "", password: "" });
                    setAccountError(null);
                  }}
                >
                  Or go back and choose a different plan.
                </button>
              </p>
             
            </div>

            <form className="space-y-3" onSubmit={handleAccountSubmit}>
              {accountError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{accountError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="account-email">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="account-email"
                  type="email"
                  placeholder="you@email.com"
                  value={accountForm.email}
                  onChange={(e) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account-password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="account-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={accountForm.password}
                    onChange={(e) =>
                      setAccountForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Minimum 6 characters.</p>
              </div>

              {/* Coupon Code Field */}
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">Trial Coupon Code (Optional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="coupon-code"
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => handleCouponChange(e.target.value)}
                      maxLength={20}
                    />
                    {couponValidation.isValidating && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponValidation.isValidating}
                    className="px-4 py-2 whitespace-nowrap"
                  >
                    Apply
                  </Button>
                </div>

                {/* Coupon Validation Message or Hint */}
                {couponCode.trim() && !couponValidation.message && !couponValidation.isValidating && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    <span>Click "Apply" to validate your coupon code</span>
                  </div>
                )}

                {couponValidation.message && (
                  <div className={`flex items-center gap-2 text-xs ${couponValidation.isValid
                    ? 'text-green-700 bg-green-50 border border-green-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                    } rounded-lg p-2`}>
                    {couponValidation.isValid ? (
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span>{couponValidation.message}</span>
                  </div>
                )}

                <p className="text-xs text-gray-500">Enter a trial coupon to get 7 days free access</p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
                  disabled={isCreatingAccount || isRedirectingToStripe}
                >
                  {isCreatingAccount || isRedirectingToStripe ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isRedirectingToStripe ? "Redirecting..." : "Creating account..."}
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-2 text-gray-500 pt-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Secure payment powered by Stripe</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CleanPaymentModal;
