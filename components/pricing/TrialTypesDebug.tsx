'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TrialTypesDebug: React.FC = () => {
  const [trialTypes, setTrialTypes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testTrialTypesEndpoint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing /api/trial-types endpoint...');
      
      const response = await fetch('/api/trial-types', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        setTrialTypes(data);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testTrialTypesEndpoint();
  }, []);

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">🐛 Trial Types Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={testTrialTypesEndpoint} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Testing...' : 'Test /api/trial-types'}
          </Button>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {trialTypes && (
            <div className="p-3 bg-green-100 border border-green-300 rounded">
              <strong>Success! Trial Types:</strong>
              <pre className="mt-2 text-sm overflow-auto">
                {JSON.stringify(trialTypes, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>Expected endpoint:</strong> /api/trial-types</p>
            <p><strong>Expected response:</strong> {`{"success": true, "trial_types": {...}}`}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialTypesDebug;