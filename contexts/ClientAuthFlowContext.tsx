"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { notificationService } from "@/lib/notifications";

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  role?: string;
}

interface Publication {
  id: string;
  slug: string;
  display_name: string;
  pricing_model: string;
  price_per_session: number;
  price_per_minute: number;
  monthly_subscription_price: number;
  free_trial_minutes: number;
  primary_color: string;
  secondary_color: string;
  expert_id: string;
}

interface ClientAuthFlowContextType {
  // Authentication Modal State
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;

  // Payment Modal State
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;

  // Current Session State
  currentPublication: Publication | null;
  currentSessionType: "chat" | "call" | null;

  // Main Flow Handler
  handleChatOrCall: (
    publication: Publication,
    sessionType: "chat" | "call",
  ) => Promise<void>;

  // Auth Functions
  handleLogin: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  handleSignup: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Payment Success Handler
  handlePaymentSuccess: (sessionId: string) => void;

  // Current User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const ClientAuthFlowContext = createContext<
  ClientAuthFlowContextType | undefined
>(undefined);

export function ClientAuthFlowProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Session States
  const [currentPublication, setCurrentPublication] =
    useState<Publication | null>(null);
  const [currentSessionType, setCurrentSessionType] = useState<
    "chat" | "call" | null
  >(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load user from localStorage on context creation
  React.useEffect(() => {
    const savedToken = localStorage.getItem("dilan_ai_token");
    const savedUser = localStorage.getItem("dilan_ai_user");

    if (savedToken && savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  /**
   * Main flow handler - This is the centralized function that handles the entire flow
   */
  const handleChatOrCall = async (
    publication: Publication,
    sessionType: "chat" | "call",
  ) => {
    setCurrentPublication(publication);
    setCurrentSessionType(sessionType);

    // Step 1: Check if user is logged in
    const token = localStorage.getItem("dilan_ai_token");
    const savedUserStr = localStorage.getItem("dilan_ai_user");

    if (!token || !savedUserStr) {
      // Show authentication modal
      setShowAuthModal(true);
      return;
    }

    // Ensure currentUser is set from localStorage if not already set
    const user = JSON.parse(savedUserStr);
    if (!currentUser) {
      setCurrentUser(user);
    }

    // Step 2: Check if user is the expert owner (no payment needed)
    if (await isExpertOwner(user.id, publication.expert_id)) {
      // Direct access - redirect to chat/call
      router.push(`/expert/${publication.slug}/${sessionType}`);
      return;
    }

    // Step 3: Check if user has already paid for this expert
    if (await hasUserPaid(user.id, publication.id)) {
      // Direct access - redirect to chat/call
      router.push(`/expert/${publication.slug}/${sessionType}`);
      return;
    }

    // Step 4: Show payment modal
    setShowPaymentModal(true);
  };

  /**
   * Handle login - supports both existing users and new account creation
   */
  const handleLogin = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // First try to login
      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      if (loginData.success) {
        // Login successful
        const user = loginData.user;
        const token = loginData.access_token;

        setCurrentUser(user);
        localStorage.setItem("dilan_ai_token", token);
        localStorage.setItem("dilan_ai_user", JSON.stringify(user));

        // Close auth modal and continue flow
        setShowAuthModal(false);

        // Continue with the flow after successful login
        if (currentPublication && currentSessionType) {
          await continueFlowAfterAuth();
        }

        return { success: true };
      } else {
        // Login failed - could be wrong password or user doesn't exist
        return {
          success: false,
          error: loginData.detail || "Invalid email or password",
        };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  /**
   * Handle signup - creates new account with role="client"
   */
  const handleSignup = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const username = email.split("@")[0]; // Use email prefix as username

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
          role: "client", // Set role as client for new users
        }),
      });

      const data = await response.json();

      if (data.success) {
        const user = data.user;
        const token = data.access_token;

        setCurrentUser(user);
        localStorage.setItem("dilan_ai_token", token);
        localStorage.setItem("dilan_ai_user", JSON.stringify(user));

        // Send admin notification about new user registration
        try {
          await notificationService.sendUserRegistrationNotification({
            userEmail: email,
            userName: username,
            fullName: user.full_name || user.name || "",
          });
        } catch (error) {
          // Don't block the user flow if notification fails
          console.warn(
            "Failed to send admin notification for user registration:",
            error,
          );
        }

        // Close auth modal and continue flow
        setShowAuthModal(false);

        // Continue with the flow after successful signup
        if (currentPublication && currentSessionType) {
          await continueFlowAfterAuth();
        }

        return { success: true };
      } else {
        return { success: false, error: data.detail || "Registration failed" };
      }
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  /**
   * Continue flow after successful authentication
   */
  const continueFlowAfterAuth = async () => {
    if (!currentPublication || !currentSessionType || !currentUser) return;

    // Check if user is the expert owner (no payment needed)
    if (await isExpertOwner(currentUser.id, currentPublication.expert_id)) {
      router.push(`/expert/${currentPublication.slug}/${currentSessionType}`);
      return;
    }

    // Check if user has already paid for this expert
    if (await hasUserPaid(currentUser.id, currentPublication.id)) {
      router.push(`/expert/${currentPublication.slug}/${currentSessionType}`);
      return;
    }

    // Show payment modal
    setShowPaymentModal(true);
  };

  /**
   * Handle successful payment
   */
  const handlePaymentSuccess = (sessionId: string) => {
    setShowPaymentModal(false);
    if (currentPublication && currentSessionType) {
      router.push(
        `/expert/${currentPublication.slug}/${currentSessionType}?session_id=${sessionId}`,
      );
    }
  };

  /**
   * Check if user is the expert owner
   */
  const isExpertOwner = async (
    userId: string,
    expertId: string,
  ): Promise<boolean> => {
    try {
      const token = localStorage.getItem("dilan_ai_token");
      if (!token) return false;

      const response = await fetch(
        `${API_URL}/experts/check-ownership/${expertId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      return data.success && data.is_owner;
    } catch (error) {
      console.error("Error checking expert ownership:", error);
      return false;
    }
  };

  /**
   * Check if user has already paid for this expert
   */
  const hasUserPaid = async (
    userId: string,
    publicationId: string,
  ): Promise<boolean> => {
    try {
      const token = localStorage.getItem("dilan_ai_token");
      if (!token) return false;

      const response = await fetch(
        `${API_URL}/payments/check-access/${publicationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      return data.success && data.has_access;
    } catch (error) {
      console.error("Error checking payment status:", error);
      return false;
    }
  };

  return (
    <ClientAuthFlowContext.Provider
      value={{
        showAuthModal,
        setShowAuthModal,
        showPaymentModal,
        setShowPaymentModal,
        currentPublication,
        currentSessionType,
        handleChatOrCall,
        handleLogin,
        handleSignup,
        handlePaymentSuccess,
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </ClientAuthFlowContext.Provider>
  );
}

export function useClientAuthFlow() {
  const context = useContext(ClientAuthFlowContext);
  if (context === undefined) {
    throw new Error(
      "useClientAuthFlow must be used within a ClientAuthFlowProvider",
    );
  }
  return context;
}
