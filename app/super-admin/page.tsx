"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { Users, Bot, FileText, Activity, TrendingUp, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/bapi";

interface SystemStats {
  users: {
    total: number;
    active: number;
    super_admins: number;
    recent_24h: number;
  };
  experts: {
    total: number;
    active: number;
    recent_24h: number;
  };
  files: {
    total: number;
  };
  timestamp: string;
}

export default function SuperAdminOverview() {
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/super-admin/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch system stats");
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading system statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchSystemStats}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.users.total || 0,
      subtitle: `${stats?.users.active || 0} active`,
      icon: Users,
      color: "bg-blue-500",
      recent: stats?.users.recent_24h || 0,
    },
    {
      title: "Total Experts",
      value: stats?.experts.total || 0,
      subtitle: `${stats?.experts.active || 0} active`,
      icon: Bot,
      color: "bg-purple-500",
      recent: stats?.experts.recent_24h || 0,
    },
    {
      title: "Total Files",
      value: stats?.files.total || 0,
      subtitle: "Knowledge base",
      icon: FileText,
      color: "bg-green-500",
      recent: 0,
    },
    {
      title: "Super Admins",
      value: stats?.users.super_admins || 0,
      subtitle: "System administrators",
      icon: Activity,
      color: "bg-red-500",
      recent: 0,
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.username}! Here's what's happening across the platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              {card.recent > 0 && (
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+{card.recent}</span>
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            <p className="text-sm text-gray-600 mt-1">{card.title}</p>
            <p className="text-xs text-gray-500 mt-2">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Growth */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Last 24 Hours
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-gray-700">New Users</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {stats?.users.recent_24h || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Bot className="w-5 h-5 text-purple-600 mr-3" />
                <span className="text-gray-700">New Experts</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {stats?.experts.recent_24h || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/super-admin/experts"
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="font-medium text-gray-900">View All Experts</span>
                </div>
                <span className="text-sm text-purple-600">→</span>
              </div>
            </a>
            <a
              href="/super-admin/users"
              className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">View All Users</span>
                </div>
                <span className="text-sm text-blue-600">→</span>
              </div>
            </a>
            <a
              href="/super-admin/logs"
              className="block p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-red-600 mr-3" />
                  <span className="font-medium text-gray-900">Activity Logs</span>
                </div>
                <span className="text-sm text-red-600">→</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Last updated: {stats?.timestamp ? new Date(stats.timestamp).toLocaleString() : "N/A"}
      </div>
    </div>
  );
}
