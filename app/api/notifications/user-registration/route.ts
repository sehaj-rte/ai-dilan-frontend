import { NextRequest, NextResponse } from 'next/server';
import { brevoService, UserRegistrationData } from '@/lib/brevoService';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate required fields
    const { userEmail, userName, fullName } = body;

    if (!userEmail || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail and userName are required' },
        { status: 400 }
      );
    }

    // Prepare user registration data
    const userData: UserRegistrationData = {
      userEmail,
      userName,
      fullName,
      registrationDate: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    };

    // Send notification to admins
    const success = await brevoService.sendUserRegistrationNotification(userData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'User registration notification sent successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send user registration notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in user registration notification API:', error);
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
