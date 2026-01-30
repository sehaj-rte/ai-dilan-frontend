'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { API_URL } from '@/lib/config';
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client';

interface TrialConfig {
  id: string;
  trial_type: string;
  coupon_code: string;
  message_limit: number;
  minute_limit: number;
  duration_days: number;
  is_enabled: boolean;
}

interface MultipleTrialConfigsProps {
  expertId: string;
  onConfigsChange?: (configs: TrialConfig[]) => void;
}

const MultipleTrialConfigs: React.FC<MultipleTrialConfigsProps> = ({
  expertId,
  onConfigsChange
}) => {
  const [trialConfigs, setTrialConfigs] = useState<TrialConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingConfigs, setSavingConfigs] = useState<Set<string>>(new Set());
  
  // Form state
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [messageLimit, setMessageLimit] = useState<string>('');
  const [callLimit, setCallLimit] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  
  // Track changes for existing configs
  const [configChanges, setConfigChanges] = useState<Record<string, Partial<TrialConfig>>>({});
  
  const { success, error } = useToast();

  // Duration options
  const durationOptions = [
    { value: '7_days', label: '7 Days', days: 7 },
    { value: '14_days', label: '14 Days', days: 14 },
    { value: '1_month', label: '1 Month', days: 30 }
  ];

  // Load existing trial configurations
  const loadTrialConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(
        `${API_URL}/experts/${expertId}/trial-configs`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();
      if (data.success) {
        setTrialConfigs(data.trial_configs || []);
        onConfigsChange?.(data.trial_configs || []);
      }
    } catch (err) {
      console.error('Error loading trial configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expertId) {
      loadTrialConfigs();
    }
  }, [expertId]);

  // Save trial configuration
  const saveTrialConfig = async () => {
    // Validation
    if (!selectedDuration) {
      error('Please select a duration');
      return;
    }
    if (!messageLimit || parseInt(messageLimit) <= 0) {
      error('Please enter a valid message limit');
      return;
    }
    if (!callLimit || parseInt(callLimit) <= 0) {
      error('Please enter a valid call limit');
      return;
    }
    if (!couponCode.trim()) {
      error('Please enter a coupon code');
      return;
    }

    setSaving(true);
    try {
      const selectedOption = durationOptions.find(opt => opt.value === selectedDuration);
      
      const response = await fetchWithAuth(
        `${API_URL}/experts/${expertId}/trial-configs`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trial_type: selectedDuration,
            message_limit: parseInt(messageLimit),
            minute_limit: parseInt(callLimit),
            coupon_code: couponCode.trim().toUpperCase()
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        // Add to list
        const updatedConfigs = [...trialConfigs, data.trial_config];
        setTrialConfigs(updatedConfigs);
        onConfigsChange?.(updatedConfigs);
        
        // Clear form
        setSelectedDuration('');
        setMessageLimit('');
        setCallLimit('');
        setCouponCode('');
        
        success('Trial configuration saved successfully!');
      } else {
        error(data.detail || 'Failed to save trial configuration');
      }
    } catch (err) {
      console.error('Error saving trial config:', err);
      error('Error saving trial configuration');
    } finally {
      setSaving(false);
    }
  };

  // Update existing configuration
  const updateTrialConfig = async (configId: string, updates: Partial<TrialConfig>) => {
    try {
      setSavingConfigs(prev => new Set(prev).add(configId));
      
      const response = await fetchWithAuth(
        `${API_URL}/trial-configs/${configId}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );

      const data = await response.json();
      if (data.success) {
        const updatedConfigs = trialConfigs.map(config =>
          config.id === configId ? data.trial_config : config
        );
        setTrialConfigs(updatedConfigs);
        onConfigsChange?.(updatedConfigs);
        
        // Clear changes for this config
        setConfigChanges(prev => {
          const newChanges = { ...prev };
          delete newChanges[configId];
          return newChanges;
        });
        
        success('Configuration updated!');
      } else {
        error(data.detail || 'Failed to update configuration');
      }
    } catch (err) {
      console.error('Error updating trial config:', err);
      error('Error updating configuration');
    } finally {
      setSavingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  // Handle field changes for existing configs
  const handleConfigFieldChange = (configId: string, field: keyof TrialConfig, value: any) => {
    setConfigChanges(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [field]: value
      }
    }));
  };

  // Get current value for a config field (with pending changes)
  const getConfigFieldValue = (config: TrialConfig, field: keyof TrialConfig) => {
    const changes = configChanges[config.id];
    return changes && changes[field] !== undefined ? changes[field] : config[field];
  };

  // Check if config has unsaved changes
  const hasUnsavedChanges = (configId: string) => {
    return configChanges[configId] && Object.keys(configChanges[configId]).length > 0;
  };

  // Save changes for a specific config
  const saveConfigChanges = async (configId: string) => {
    const changes = configChanges[configId];
    if (!changes || Object.keys(changes).length === 0) {
      return;
    }
    
    await updateTrialConfig(configId, changes);
  };

  // Toggle enabled status (immediate save)
  const toggleConfigEnabled = async (configId: string, enabled: boolean) => {
    await updateTrialConfig(configId, { is_enabled: enabled });
  };

  // Delete configuration
  const deleteTrialConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this trial configuration?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${API_URL}/trial-configs/${configId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      const data = await response.json();
      if (data.success) {
        const updatedConfigs = trialConfigs.filter(config => config.id !== configId);
        setTrialConfigs(updatedConfigs);
        onConfigsChange?.(updatedConfigs);
        success('Configuration deleted!');
      } else {
        error(data.detail || 'Failed to delete configuration');
      }
    } catch (err) {
      console.error('Error deleting trial config:', err);
      error('Error deleting configuration');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Coupon code copied!');
  };

  const getDurationLabel = (trialType: string) => {
    const option = durationOptions.find(opt => opt.value === trialType);
    return option ? option.label : trialType;
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          🎁 Trial Configurations
        </CardTitle>
        <CardDescription>
          Create trial options with custom duration, limits, and coupon codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Create New Trial Config */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Create New Trial Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Duration Dropdown */}
            <div>
              <Label htmlFor="duration">Duration</Label>
              <select
                id="duration"
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select duration...</option>
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Limit */}
            <div>
              <Label htmlFor="message-limit">Message Limit</Label>
              <Input
                id="message-limit"
                type="number"
                value={messageLimit}
                onChange={(e) => setMessageLimit(e.target.value)}
                placeholder="e.g. 10"
                min="1"
                className="mt-1"
              />
            </div>

            {/* Call Limit */}
            <div>
              <Label htmlFor="call-limit">Call Minutes Limit</Label>
              <Input
                id="call-limit"
                type="number"
                value={callLimit}
                onChange={(e) => setCallLimit(e.target.value)}
                placeholder="e.g. 5"
                min="1"
                className="mt-1"
              />
            </div>

            {/* Coupon Code */}
            <div>
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. TRIAL123"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={saveTrialConfig}
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? 'Saving...' : 'Save Trial Configuration'}
          </Button>
        </div>

        {/* Existing Configurations */}
        <div className="space-y-4">
          <h4 className="font-medium">Existing Trial Configurations</h4>
          
          {trialConfigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No trial configurations created yet.</p>
            </div>
          ) : (
            trialConfigs.map((config) => (
              <div key={config.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-100 text-blue-800">
                      {getDurationLabel(config.trial_type)}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {config.duration_days} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={getConfigFieldValue(config, 'is_enabled') as boolean}
                      onCheckedChange={(enabled) => 
                        toggleConfigEnabled(config.id, enabled)
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTrialConfig(config.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Coupon Code</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={getConfigFieldValue(config, 'coupon_code') as string}
                        onChange={(e) => 
                          handleConfigFieldChange(config.id, 'coupon_code', e.target.value.toUpperCase())
                        }
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.coupon_code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Message Limit</Label>
                    <Input
                      type="number"
                      value={getConfigFieldValue(config, 'message_limit') as number}
                      onChange={(e) => 
                        handleConfigFieldChange(config.id, 'message_limit', parseInt(e.target.value) || 0)
                      }
                      min="1"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Call Minutes Limit</Label>
                    <Input
                      type="number"
                      value={getConfigFieldValue(config, 'minute_limit') as number}
                      onChange={(e) => 
                        handleConfigFieldChange(config.id, 'minute_limit', parseInt(e.target.value) || 0)
                      }
                      min="1"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Save Button for existing config */}
                {hasUnsavedChanges(config.id) && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={() => saveConfigChanges(config.id)}
                      disabled={savingConfigs.has(config.id)}
                      className="w-full md:w-auto"
                      size="sm"
                    >
                      {savingConfigs.has(config.id) ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MultipleTrialConfigs;