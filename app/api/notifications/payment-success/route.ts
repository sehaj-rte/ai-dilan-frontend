import { NextRequest, NextResponse } from 'next/server';
import { brevoService, PaymentSuccessData } from '@/lib/brevoService';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate required fields
    const {
      userEmail,
      userName,
      fullName,
      expertName,
      expertSlug,
      planName,
      amount,
      currency,
      sessionType
    } = body;

    if (!userEmail || !userName || !expertName || !expertSlug || !planName || !amount || !currency || !sessionType) {
      return NextResponse.json(
        {
          error: 'Missing required fields: userEmail, userName, expertName, expertSlug, planName, amount, currency, and sessionType are required'
        },
        { status: 400 }
      );
    }

    // Validate sessionType
    if (!['chat', 'call'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'sessionType must be either "chat" or "call"' },
        { status: 400 }
      );
    }

    // Prepare payment success data
    const paymentData: PaymentSuccessData = {
      userEmail,
      userName,
      fullName,
      expertName,
      expertSlug,
      planName,
      amount: parseFloat(amount),
      currency,
      sessionType,
      paymentDate: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    };

    // Send notification to admins
    const success = await brevoService.sendPaymentSuccessNotification(paymentData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Payment success notification sent successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send payment success notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in payment success notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
