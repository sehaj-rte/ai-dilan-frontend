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
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponValidation, setCouponValidation] = useState<{
    isValid: boolean;
    isValidating: boolean;
    message: string;
  }>({ isValid: false, isValidating: false, message: "" });
  const [showTrialTerms, setShowTrialTerms] = useState(false);

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
    if (!selectedPlan) {
      setError("Please choose a plan to continue.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/payments/create-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          expert_name: expertName,
          ...(couponValidation.isValid && couponCode && { coupon: couponCode })
        })
      })

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to create subscription");
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.subscription_id) {
        setSuccess(true);
        setTimeout(() => {
          onPaymentSuccess(data.subscription_id);
          if (expertSlug) {
            window.location.href = `/expert/${expertSlug}?payment_success=true&session_id=${data.subscription_id}`;
          }
        }, 2000);
      }
    } catch (err) {
      console.error("Subscription error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
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
        setActiveToken(payload.access_token);
        setCurrentStep("plan");
        setAccountForm({ email: "", password: "" });
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
              Thank you for your subscription to {expertName}
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Invoice Sent:</strong> A detailed invoice has been sent
                to your email address.
              </p>
            </div>
            <Button
              onClick={() => {
                onClose();
                if (expertSlug) {
                  onPaymentSuccess("");
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              OK, Continue to {selectedPlan?.name || "Service"}
            </Button>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Subscribe to {expertName}
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2 text-lg">
            Your plan will give you instant access
          </p>
        </DialogHeader>

        {currentStep === "plan" ? (
          <div className="space-y-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
              {plans.map((plan) => {
                const dynamicFeatures = plan.features;
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-xl h-full ${
                      selectedPlan?.id === plan.id
                        ? "ring-4 ring-blue-500 ring-offset-2 border-blue-200"
                        : "hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <CardTitle className="text-xl flex items-center gap-2">
                            {plan.name}
                            {plan.recommended && (
                              <Badge className="bg-blue-500 text-white text-sm px-2 py-1">
                                <Star className="w-4 h-4 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="text-3xl font-bold text-blue-600 mt-2">
                            ${plan.price}
                            <span className="text-base text-gray-500 font-normal">
                              /{plan.billing_interval}
                            </span>
                          </div>
                        </div>
                        {selectedPlan?.id === plan.id && (
                          <CheckCircle2 className="w-8 h-8 text-blue-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 flex-grow">
                      <ul className="space-y-3 text-base">
                        {dynamicFeatures.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>



            {isAuthenticated && !checkingPaymentMethods && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {hasExistingCard ? (
                    <>
                      <CreditCard className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Saved Payment Method
                        </p>
                        <p className="text-sm text-gray-600">
                          We'll use your saved card for instant activation
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Shield className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Secure Checkout
                        </p>
                        <p className="text-sm text-gray-600">
                          You'll be redirected to Stripe to add your payment
                          details
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-lg">
                <AlertCircle className="h-6 w-6 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-6 text-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={
                  !selectedPlan ||
                  loading ||
                  (isAuthenticated && checkingPaymentMethods)
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Processing...
                  </>
                ) : isAuthenticated && checkingPaymentMethods ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Loading...
                  </>
                ) : isAuthenticated && hasExistingCard ? (
                  <>
                    <Zap className="h-5 w-5 mr-3" />
                    Subscribe Instantly
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5 mr-3" />
                    Continue
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Lock className="w-5 h-5" />
              <span className="text-lg">Secure payment powered by Stripe</span>
            </div>
          </div>
        ) : (
          <div className="py-6 max-w-md mx-auto space-y-6">
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-2">
              <p className="text-sm text-gray-600">
                You're subscribing to <strong>{selectedPlan?.name}</strong>.
              </p>
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={() => {
                  setCurrentStep("plan");
                  setAccountForm({ email: "", password: "" });
                  setAccountError(null);
                }}
              >
                Change plan
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleAccountSubmit}>
              {accountError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{accountError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
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

              <div className="space-y-2">
                <Label htmlFor="account-password">Password</Label>
                <Input
                  id="account-password"
                  type="password"
                  placeholder="Create a password"
                  value={accountForm.password}
                  onChange={(e) =>
                    setAccountForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
                <p className="text-xs text-gray-500">Minimum 6 characters.</p>
              </div>

              {/* Coupon Code Field */}
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Trial Coupon Code (Optional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="coupon-code"
                      type="text"
                      placeholder="Enter coupon code (e.g., TRIAL2024)"
                      value={couponCode}
                      onChange={(e) => handleCouponChange(e.target.value)}
                      className="font-mono text-center tracking-wider"
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
                  <div className={`flex items-center gap-2 text-xs ${
                    couponValidation.isValid 
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

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep("plan");
                    setAccountError(null);
                  }}
                  disabled={isCreatingAccount}
                  className="flex-1"
                >
                  Back to plans
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isCreatingAccount}
                >
                  {isCreatingAccount ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Lock className="w-5 h-5" />
              <span className="text-sm">Secure payment powered by Stripe</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CleanPaymentModal;
