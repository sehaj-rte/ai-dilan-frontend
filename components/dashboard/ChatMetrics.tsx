"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import { MessageSquare, Users, Clock, MessageCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ChatMetricsData {
  totalConversations: number;
  activeUsers: number;
  timeCreated: string;
  totalMessages: number;
  totalUnanswered: number;
  conversationsTrend: number;
  activeUsersTrend: number;
  messagesTrend: number;
  unansweredTrend: number;
}

interface ChatMetricsProps {
  expertId: string;
}

type TimePeriod = "7d" | "30d" | "6m" | "1y" | "all";

const TIME_PERIODS = [
  { value: "7d" as TimePeriod, label: "Last 7 days" },
  { value: "30d" as TimePeriod, label: "Last 30 days" },
  { value: "6m" as TimePeriod, label: "Last 6 months" },
  { value: "1y" as TimePeriod, label: "Last year" },
  { value: "all" as TimePeriod, label: "All time" },
];

const ChatMetrics: React.FC<ChatMetricsProps> = ({ expertId }) => {
  const [metrics, setMetrics] = useState<ChatMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("7d");

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch metrics from dedicated endpoint with period filter
      const metricsRes = await fetchWithAuth(
        `${API_URL}/experts/${expertId}/metrics?period=${selectedPeriod}`,
        { headers: getAuthHeaders() }
      );
      const metricsData = await metricsRes.json();

      if (!metricsData.success) {
        throw new Error(metricsData.error || 'Failed to load metrics');
      }

      const metrics = metricsData.metrics;
      
      setMetrics({
        totalConversations: metrics.total_conversations || 0,
        activeUsers: metrics.active_users || 0,
        timeCreated: metrics.time_created || "0h 0m",
        totalMessages: metrics.total_messages || 0,
        totalUnanswered: metrics.total_unanswered || 0,
        conversationsTrend: metrics.trends?.conversations_trend || 0,
        activeUsersTrend: metrics.trends?.active_users_trend || 0,
        messagesTrend: metrics.trends?.messages_trend || 0,
        unansweredTrend: metrics.trends?.unanswered_trend || 0,
      });
    } catch (e: any) {
      console.error('Failed to fetch chat metrics:', e);
      setError(e.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expertId) {
      fetchMetrics();
    }
  }, [expertId, selectedPeriod]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chat Metrics</h2>
          <div className="w-20 h-9 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chat Metrics</h2>
          <button
            onClick={fetchMetrics}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load metrics</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const formatTrend = (value: number) => {
    if (value === 0) return "0%";
    return value > 0 ? `+${value}%` : `${value}%`;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Chat Metrics</h2>
        <div className="flex items-center space-x-3">
          {/* Time Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            {TIME_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Conversations */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Conversations</span>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.totalConversations.toLocaleString()}</div>
            <div className={`text-sm ${getTrendColor(metrics.conversationsTrend)} flex items-center mt-1`}>
              {formatTrend(metrics.conversationsTrend)}
              <span className="ml-1 text-gray-500">vs last period</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Users</span>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.activeUsers.toLocaleString()}</div>
            <div className={`text-sm ${getTrendColor(metrics.activeUsersTrend)} flex items-center mt-1`}>
              {formatTrend(metrics.activeUsersTrend)}
              <span className="ml-1 text-gray-500">vs last period</span>
            </div>
          </CardContent>
        </Card>

        {/* Time Created (Customer Time Spent) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Time Created</span>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.timeCreated}</div>
            <div className="text-sm text-gray-500 mt-1">Customer time spent</div>
          </CardContent>
        </Card>

        {/* Messages Unanswered */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Unanswered</span>
              <AlertCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.totalUnanswered.toLocaleString()}</div>
            <div className={`text-sm ${getTrendColor(metrics.unansweredTrend)} flex items-center mt-1`}>
              {formatTrend(metrics.unansweredTrend)}
              <span className="ml-1 text-gray-500">vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Messages */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Messages</span>
              <MessageCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics.totalMessages.toLocaleString()}</div>
            <div className={`text-sm ${getTrendColor(metrics.messagesTrend)} flex items-center mt-1`}>
              {formatTrend(metrics.messagesTrend)}
              <span className="ml-1 text-gray-500">vs last period</span>
            </div>
          </CardContent>
        </Card>

        {/* Avg Messages per Conversation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Messages</span>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.totalConversations > 0 
                ? Math.round(metrics.totalMessages / metrics.totalConversations)
                : 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Per conversation</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatMetrics;