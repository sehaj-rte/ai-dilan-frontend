"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Bot, 
  FileText, 
  Activity,
  Search,
  Shield
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Check if user is super admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (user?.role !== "super_admin") {
      router.push("/projects");
      return;
    }
  }, [isAuthenticated, user, router]);

  // Don't render until we verify super admin access
  if (!isAuthenticated || user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Verifying super admin access...</p>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { name: "Experts", href: "/super-admin/experts", icon: Bot },
    { name: "Users", href: "/super-admin/users", icon: Users },
    { name: "Files", href: "/super-admin/files", icon: FileText },
    { name: "Activity Logs", href: "/super-admin/logs", icon: Activity },
    { name: "Search", href: "/super-admin/search", icon: Search },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-red-600 to-red-700 text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-red-500">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Super Admin</h1>
              <p className="text-xs text-red-200">System Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-red-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-red-200 truncate">{user?.email}</p>
            </div>
          </div>
          <Link
            href="/projects"
            className="mt-3 block text-center text-sm py-2 px-4 bg-red-500 rounded-lg hover:bg-red-400 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
