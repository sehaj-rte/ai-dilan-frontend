'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  User,
  CreditCard,
  TestTube
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  error?: string;
}

const TestNotificationsPage = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  // User Registration Test Data
  const [regData, setRegData] = useState({
    userEmail: 'test@example.com',
    userName: 'testuser',
    fullName: 'Test User'
  });

  // Payment Success Test Data
  const [paymentData, setPaymentData] = useState({
    userEmail: 'test@example.com',
    userName: 'testuser',
    fullName: 'Test User',
    expertName: 'AI Expert',
    expertSlug: 'ai-expert',
    planName: 'Monthly Plan',
    amount: 29.99,
    currency: 'GBP',
    sessionType: 'chat' as 'chat' | 'call'
  });

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev]);
  };

  const runBasicTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/test');
      const data = await response.json();

      addResult({
        success: response.ok,
        message: data.message || data.error,
        timestamp: data.timestamp || new Date().toISOString(),
        error: data.error
      });
    } catch (error) {
      addResult({
        success: false,
        message: 'Network error occurred',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testUserRegistration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'user-registration',
          ...regData
        })
      });

      const data = await response.json();

      addResult({
        success: response.ok,
        message: data.message || data.error,
        timestamp: data.timestamp || new Date().toISOString(),
        error: data.error
      });
    } catch (error) {
      addResult({
        success: false,
        message: 'Network error occurred',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testPaymentSuccess = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'payment-success',
          ...paymentData
        })
      });

      const data = await response.json();

      addResult({
        success: response.ok,
        message: data.message || data.error,
        timestamp: data.timestamp || new Date().toISOString(),
        error: data.error
      });
    } catch (error) {
      addResult({
        success: false,
        message: 'Network error occurred',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Brevo Email Notifications Test
          </h1>
          <p className="text-gray-600">
            Test email notifications for user registration and payment success
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Basic Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Basic Service Test
              </CardTitle>
              <CardDescription>
                Test basic Brevo email service connectivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runBasicTest}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Run Basic Test'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* User Registration Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Registration Test
              </CardTitle>
              <CardDescription>
                Test user registration notification email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  value={regData.userEmail}
                  onChange={(e) => setRegData(prev => ({ ...prev, userEmail: e.target.value }))}
                  placeholder="test@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  value={regData.userName}
                  onChange={(e) => setRegData(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="testuser"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-fullname">Full Name</Label>
                <Input
                  id="reg-fullname"
                  value={regData.fullName}
                  onChange={(e) => setRegData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Test User"
                />
              </div>
              <Button
                onClick={testUserRegistration}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Registration Email'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Payment Success Test */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Success Test
            </CardTitle>
            <CardDescription>
              Test payment success notification email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="space-y-2">
                <Label htmlFor="pay-email">Email</Label>
                <Input
                  id="pay-email"
                  value={paymentData.userEmail}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, userEmail: e.target.value }))}
                  placeholder="test@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-username">Username</Label>
                <Input
                  id="pay-username"
                  value={paymentData.userName}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="testuser"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-fullname">Full Name</Label>
                <Input
                  id="pay-fullname"
                  value={paymentData.fullName}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Test User"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-expert">Expert Name</Label>
                <Input
                  id="pay-expert"
                  value={paymentData.expertName}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, expertName: e.target.value }))}
                  placeholder="AI Expert"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-slug">Expert Slug</Label>
                <Input
                  id="pay-slug"
                  value={paymentData.expertSlug}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, expertSlug: e.target.value }))}
                  placeholder="ai-expert"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-plan">Plan Name</Label>
                <Input
                  id="pay-plan"
                  value={paymentData.planName}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, planName: e.target.value }))}
                  placeholder="Monthly Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="29.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-currency">Currency</Label>
                <Input
                  id="pay-currency"
                  value={paymentData.currency}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="flex gap-4 items-center mb-4">
              <Label>Session Type:</Label>
              <div className="flex gap-2">
                <Button
                  variant={paymentData.sessionType === 'chat' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentData(prev => ({ ...prev, sessionType: 'chat' }))}
                >
                  Chat
                </Button>
                <Button
                  variant={paymentData.sessionType === 'call' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentData(prev => ({ ...prev, sessionType: 'call' }))}
                >
                  Call
                </Button>
              </div>
            </div>

            <Button
              onClick={testPaymentSuccess}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Payment Email'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                Recent email notification test results
              </CardDescription>
            </div>
            {results.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No test results yet. Run a test to see results here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{result.message}</p>
                    {result.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-red-600 text-xs font-mono">{result.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>To use these email notifications:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Set up your Brevo account and get an API key</li>
              <li>Create email templates in Brevo dashboard</li>
              <li>Configure environment variables in <code>.env.local</code></li>
              <li>Set admin email addresses for notifications</li>
              <li>Test the integration using the buttons above</li>
            </ol>
            <p className="mt-4">
              Check the <code>BREVO_EMAIL_NOTIFICATIONS.md</code> file for detailed setup instructions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestNotificationsPage;
