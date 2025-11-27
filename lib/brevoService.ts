import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";

// Brevo configuration - lazy initialization
let apiInstance: TransactionalEmailsApi | null = null;

const getApiInstance = () => {
  if (!apiInstance) {
    try {
      apiInstance = new TransactionalEmailsApi();
      // Set the API key using the setApiKey method with proper type
      (apiInstance as any).setApiKey(
        "api-key",
        process.env.BREVO_API_KEY || "dummy-api-key",
      );
    } catch (error) {
      console.error("Failed to initialize Brevo API:", error);
      return null;
    }
  }
  return apiInstance;
};

// Template IDs (use dummy values for now, replace with actual template IDs)
const TEMPLATES = {
  USER_REGISTRATION: parseInt(
    process.env.BREVO_USER_REGISTRATION_TEMPLATE_ID || "1",
  ),
  USER_PAYMENT_SUCCESS: parseInt(
    process.env.BREVO_USER_PAYMENT_TEMPLATE_ID || "2",
  ),
};

// Admin email addresses (replace with actual admin emails)
const ADMIN_EMAILS = {
  EXPERTS: process.env.EXPERT_ADMIN_EMAILS?.split(",") || [
    "expert@example.com",
  ],
  SUPER_ADMINS: process.env.SUPER_ADMIN_EMAILS?.split(",") || [
    "superadmin@example.com",
  ],
};

interface UserRegistrationData {
  userEmail: string;
  userName: string;
  fullName?: string;
  registrationDate: string;
}

interface PaymentSuccessData {
  userEmail: string;
  userName: string;
  fullName?: string;
  expertName: string;
  expertSlug: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  sessionType: "chat" | "call";
}

class BrevoService {
  /**
   * Send user registration notification to admins
   */
  async sendUserRegistrationNotification(
    userData: UserRegistrationData,
  ): Promise<boolean> {
    try {
      // Prepare recipient list (both expert and super admins)
      const recipients = [
        ...ADMIN_EMAILS.EXPERTS.map((email) => ({
          email,
          name: "Expert Admin",
        })),
        ...ADMIN_EMAILS.SUPER_ADMINS.map((email) => ({
          email,
          name: "Super Admin",
        })),
      ];

      const sendSmtpEmail = new SendSmtpEmail();
      sendSmtpEmail.to = recipients;
      sendSmtpEmail.templateId = TEMPLATES.USER_REGISTRATION;
      sendSmtpEmail.params = {
        USER_EMAIL: userData.userEmail,
        USER_NAME: userData.userName,
        FULL_NAME: userData.fullName || userData.userName,
        REGISTRATION_DATE: userData.registrationDate,
        DASHBOARD_URL:
          process.env.NEXT_PUBLIC_DASHBOARD_URL ||
          "https://your-domain.com/dashboard",
      };

      const api = getApiInstance();
      if (!api) {
        throw new Error("Brevo API not initialized");
      }
      const response = await api.sendTransacEmail(sendSmtpEmail);
      console.log(
        "✅ User registration notification sent successfully:",
        response,
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send user registration notification:", error);
      return false;
    }
  }

  /**
   * Send payment success notification to admins
   */
  async sendPaymentSuccessNotification(
    paymentData: PaymentSuccessData,
  ): Promise<boolean> {
    try {
      // Prepare recipient list (both expert and super admins)
      const recipients = [
        ...ADMIN_EMAILS.EXPERTS.map((email) => ({
          email,
          name: "Expert Admin",
        })),
        ...ADMIN_EMAILS.SUPER_ADMINS.map((email) => ({
          email,
          name: "Super Admin",
        })),
      ];

      const sendSmtpEmail = new SendSmtpEmail();
      sendSmtpEmail.to = recipients;
      sendSmtpEmail.templateId = TEMPLATES.USER_PAYMENT_SUCCESS;
      sendSmtpEmail.params = {
        USER_EMAIL: paymentData.userEmail,
        USER_NAME: paymentData.userName,
        FULL_NAME: paymentData.fullName || paymentData.userName,
        EXPERT_NAME: paymentData.expertName,
        EXPERT_SLUG: paymentData.expertSlug,
        PLAN_NAME: paymentData.planName,
        AMOUNT: paymentData.amount.toString(),
        CURRENCY: paymentData.currency,
        PAYMENT_DATE: paymentData.paymentDate,
        SESSION_TYPE: paymentData.sessionType,
        EXPERT_URL: `${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/expert/${paymentData.expertSlug}`,
        DASHBOARD_URL:
          process.env.NEXT_PUBLIC_DASHBOARD_URL ||
          "https://your-domain.com/dashboard",
      };

      const api = getApiInstance();
      if (!api) {
        throw new Error("Brevo API not initialized");
      }
      const response = await api.sendTransacEmail(sendSmtpEmail);
      console.log(
        "✅ Payment success notification sent successfully:",
        response,
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to send payment success notification:", error);
      return false;
    }
  }

  /**
   * Test email functionality
   */
  async testEmailService(): Promise<boolean> {
    try {
      const testEmail = new SendSmtpEmail();
      testEmail.to = [{ email: "test@example.com", name: "Test User" }];
      testEmail.subject = "Brevo Service Test";
      testEmail.textContent = "This is a test email from Brevo service.";
      testEmail.htmlContent = "<p>This is a test email from Brevo service.</p>";
      testEmail.sender = {
        email: process.env.BREVO_SENDER_EMAIL || "noreply@your-domain.com",
        name: process.env.BREVO_SENDER_NAME || "Dilan AI",
      };

      const api = getApiInstance();
      if (!api) {
        throw new Error("Brevo API not initialized");
      }
      const response = await api.sendTransacEmail(testEmail);
      console.log("✅ Test email sent successfully:", response);
      return true;
    } catch (error) {
      console.error("❌ Failed to send test email:", error);
      return false;
    }
  }
}

export const brevoService = new BrevoService();
export type { UserRegistrationData, PaymentSuccessData };
