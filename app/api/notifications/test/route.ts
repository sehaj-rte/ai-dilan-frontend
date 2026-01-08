import { NextRequest, NextResponse } from 'next/server';
import { brevoService } from '@/lib/brevoService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Brevo email service...');

    // Test basic email functionality
    const testResult = await brevoService.testEmailService();

    if (testResult) {
      return NextResponse.json({
        success: true,
        message: 'Brevo service test completed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        {
          error: 'Brevo service test failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Brevo test API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during test',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType, ...testData } = body;

    console.log('🧪 Running Brevo test:', testType);

    let result = false;

    switch (testType) {
      case 'user-registration':
        // Test user registration notification
        result = await brevoService.sendUserRegistrationNotification({
          userEmail: testData.userEmail || 'test@example.com',
          userName: testData.userName || 'testuser',
          fullName: testData.fullName || 'Test User',
          registrationDate: new Date().toLocaleString()
        });
        break;

      case 'payment-success':
        // Test payment success notification
        result = await brevoService.sendPaymentSuccessNotification({
          userEmail: testData.userEmail || 'test@example.com',
          userName: testData.userName || 'testuser',
          fullName: testData.fullName || 'Test User',
          expertName: testData.expertName || 'Test Expert',
          expertSlug: testData.expertSlug || 'test-expert',
          planName: testData.planName || 'Test Plan',
          amount: testData.amount || 29.99,
          currency: testData.currency || 'USD',
          sessionType: testData.sessionType || 'chat',
          paymentDate: new Date().toLocaleString()
        });
        break;

      case 'basic':
      default:
        // Test basic email functionality
        result = await brevoService.testEmailService();
        break;
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: `${testType} notification test completed successfully`,
        testType,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        {
          error: `${testType} notification test failed`,
          testType,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Brevo test API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during test',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
