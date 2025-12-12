interface NotificationData {
  userEmail: string;
  userName: string;
  fullName?: string;
  includePaymentSuccess?: boolean;
  includeVoiceSetup?: boolean;
  invoiceUrl?: string;
  invoiceId?: string;
  subscriptionId?: string;
  customerId?: string;
  paymentIntentId?: string;
  expertName?: string;
}

interface PaymentNotificationData extends NotificationData {
  expertName: string;
  expertSlug: string;
  planName: string;
  amount: number;
  currency: string;
  sessionType: "chat" | "call";
}

class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/bapi";
  }

  /**
   * Send user registration notification to admins
   */
  async sendUserRegistrationNotification(
    data: NotificationData,
  ): Promise<boolean> {
    // Alert popup for notification API call
    alert(`🚀 NOTIFICATION API: Starting call\nURL: ${this.baseUrl}/notifications/user-registration\nEmail: ${data.userEmail}\nSubscription ID: ${data.subscriptionId || 'None'}`);

    console.log("🚀 FRONTEND DEBUG: Starting notification API call");
    console.log("📝 FRONTEND DEBUG: API URL:", `${this.baseUrl}/notifications/user-registration`);
    console.log("📝 FRONTEND DEBUG: Request data:", data);

    try {
      const response = await fetch(
        `${this.baseUrl}/notifications/user-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      // Alert popup for API response
      if (response.ok) {
        alert(`✅ NOTIFICATION API: Success!\nStatus: ${response.status}\nMessage: ${result.message}\nCheck your email: ${data.userEmail}`);
        console.log("✅ FRONTEND DEBUG: User registration notification sent:", result.message);
        return true;
      } else {
        alert(`❌ NOTIFICATION API: Failed!\nStatus: ${response.status}\nError: ${result.error || 'Unknown error'}`);
        console.error("❌ FRONTEND DEBUG: Failed to send notification:", result.error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error?.toString() || 'Unknown error';
      alert(`❌ NOTIFICATION API: Network Error!\\nError: ${errorMessage}\\nCheck if backend is running`);
      console.error("❌ FRONTEND DEBUG: Error sending notification:", error);
      return false;
    }
  }

  /**
   * Send payment success notification to admins
   */
  async sendPaymentSuccessNotification(
    data: PaymentNotificationData,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notifications/payment-success`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Payment success notification sent:", result.message);
        return true;
      } else {
        console.error(
          "❌ Failed to send payment success notification:",
          result.error,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error sending payment success notification:", error);
      return false;
    }
  }

  /**
   * Helper method to get user data from auth state
   */
  getUserDataFromState(user: any): NotificationData {
    return {
      userEmail: user?.email || "",
      userName: user?.username || "",
      fullName: user?.full_name || user?.name || "",
    };
  }

  /**
   * Helper method to extract plan data from payment response
   */
  extractPaymentData(
    userData: NotificationData,
    expertData: { name: string; slug: string },
    planData: { name: string; price: number; currency: string },
    sessionType: "chat" | "call",
  ): PaymentNotificationData {
    return {
      ...userData,
      expertName: expertData.name,
      expertSlug: expertData.slug,
      planName: planData.name,
      amount: planData.price,
      currency: planData.currency,
      sessionType,
    };
  }
}

export const notificationService = new NotificationService();
export type { NotificationData, PaymentNotificationData };
