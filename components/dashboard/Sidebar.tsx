"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  logout,
  loadUserFromStorage,
} from "@/store/slices/authSlice";
import { useExpert } from "@/context/ExpertContext";
import {
  MessageSquare,
  Brain,
  Mic,
  BarChart3,
  LogOut,
  User,
  BookOpen,
  Mic2,
  TrendingUp,
  Eye,
  CreditCard,
  FileText,
  Zap,
  PieChart,
  Users,
  DollarSign,
  Lightbulb,
  Activity,
  Crown,
  Settings,
  QrCode,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

type SidebarItem = { title: string; href: string; icon: LucideIcon };
type SidebarSection = { title: string; items: SidebarItem[] };

const sidebarItems: SidebarItem[] = [
  // {
  //   title: 'All Agents',
  //   href: '/projects',
  //   icon: Home
  // },
  {
    title: "Knowledge Base",
    href: "/dashboard/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "Earnings",
    href: "/dashboard/earnings",
    icon: BarChart3,
  },
  {
    title: "Professional Voice Clone",
    href: "/dashboard/pvc",
    icon: Mic,
  },
];

interface SidebarProps {
  onClose?: () => void;
  projectId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, projectId }) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { expert } = useExpert();

  // Use state to handle hydration safely
  const [mounted, setMounted] = React.useState(false);

  const projectName = expert?.name || "";
  const expertOwnerId = expert?.user_id || null;

  // Ensure we have user from storage if needed
  useEffect(() => {
    dispatch(loadUserFromStorage());
    setMounted(true);
  }, [dispatch]);


  // Create dynamic sidebar items based on context
  const dynamicSidebarItems = React.useMemo(() => {
    if (projectId) {
      // Always return sections structure for project pages, but use safe fallbacks when not mounted
      const safeProjectName = mounted ? (projectName || "AI Persona") : "AI Persona";

      const sections = [
        {
          title: "Persona",
          items: [
            {
              title: `Talk to ${safeProjectName}`,
              href: `/project/${projectId}/chat`,
              icon: MessageSquare,
            },
            {
              title: "Subscriber Conversations",
              href: `/project/${projectId}/conversations`,
              icon: MessageSquare,
            },
            {
              title: "Chat Metrics",
              href: `/project/${projectId}/analytics`,
              icon: TrendingUp,
            },
            {
              title: "Earnings from Subscriptions",
              href: `/project/${projectId}/earnings`,
              icon: BarChart3,
            },
          ],
        },
        {
          title: "Analytics",
          items: [
            {
              title: "Dashboard",
              href: `/project/${projectId}/insights/dashboard`,
              icon: PieChart,
            },
            {
              title: "Audience Insights",
              href: `/project/${projectId}/insights/audience-insights`,
              icon: Users,
            },
            {
              title: "Revenue",
              href: `/project/${projectId}/insights/revenue`,
              icon: DollarSign,
            },
            {
              title: "Content Intelligence",
              href: `/project/${projectId}/insights/content-intelligence`,
              icon: Lightbulb,
            },
            {
              title: "Usage & Retention",
              href: `/project/${projectId}/insights/usage-retention`,
              icon: Activity,
            },
            {
              title: "Top Users",
              href: `/project/${projectId}/insights/top-users`,
              icon: Crown,
            },

          ],
        },
        {
          title: "Behaviour",
          items: [
            {
              title: "Knowledge Base",
              href: `/project/${projectId}/knowledge-base`,
              icon: BookOpen,
            },
            {
              title: "Voice Studio",
              href: `/project/${projectId}/voice-studio`,
              icon: Mic2,
            },
            {
              title: "AI Behaviour",
              href: `/project/${projectId}/behavior-settings`,
              icon: Brain,
            },
            {
              title: "Specialized APIs",
              href: `/project/${projectId}/specialized-apis`,
              icon: Zap,
            },
            {
              title: "Profile Settings",
              href: `/project/${projectId}/profile-settings`,
              icon: User,
            },
          ],
        },
        {
          title: "Publish Manager",
          items: [
            {
              title: "AI Persona Preview",
              href: `/project/${projectId}/expert-preview`,
              icon: Eye,
            },
            {
              title: "Pricing & Subscription",
              href: `/project/${projectId}/pricing-subscription`,
              icon: CreditCard,
            },
            {
              title: "QR Code Manager",
              href: `/project/${projectId}/qr-code-manager`,
              icon: QrCode,
            },
            {
              title: "Legal Documents",
              href: `/project/${projectId}/legal-documents`,
              icon: FileText,
            },
          ],
        },
      ];

      return sections;
    }
    return sidebarItems;
  }, [projectId, projectName, mounted]);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/auth/login");
  };

  const handleLinkClick = () => {
    onClose?.();
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
        <Link
          href="/projects"
          className="flex items-center space-x-3"
          onClick={handleLinkClick}
        >
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-xl font-bold text-blue-600">All View</span>
        </Link>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {((mounted ? projectName : "AI Persona")?.charAt(0) || "A").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {mounted ? (projectName || "AI Persona") : "AI Persona"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {projectId
          ? // Render hierarchical structure for project pages
          (dynamicSidebarItems as SidebarSection[]).map((section, sectionIndex) => (
            <div
              key={section.title}
              className={sectionIndex > 0 ? "mt-6" : ""}
            >
              <h3 className="px-3 py-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="mt-1 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>

            </div>
          ))
          : // Render flat structure for non-project pages
          (dynamicSidebarItems as SidebarItem[]).map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
