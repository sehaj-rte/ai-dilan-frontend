import { NextRequest, NextResponse } from 'next/server';
import { brevoService, UserRegistrationData } from '@/lib/brevoService';

export async function POST(request: NextRequest) {
  try {
    // DISABLED: User registration notifications are now handled by backend webhook
    console.log('ℹ️ User registration notification API disabled - handled by backend webhook');
    
    // Parse the request body for logging
    const body = await request.json();
    console.log('📝 Would have sent notification for:', body.userEmail);

    // Return success to not break existing code flow
    return NextResponse.json({
      success: true,
      message: 'User registration notification handled by backend webhook'
    });
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
