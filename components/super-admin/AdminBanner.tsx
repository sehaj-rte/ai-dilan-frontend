"use client";

import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AdminBannerProps {
  expertName: string;
  expertId: string;
  ownerEmail?: string;
}

export default function AdminBanner({ expertName, expertId, ownerEmail }: AdminBannerProps) {
  return (
    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Shield className="w-5 h-5" />
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-semibold">Super Admin Mode</span>
            <span className="opacity-75">|</span>
            <span>Viewing Expert: <strong>{expertName}</strong></span>
            {ownerEmail && (
              <>
                <span className="opacity-75">|</span>
                <span>Owner: <strong>{ownerEmail}</strong></span>
              </>
            )}
          </div>
        </div>
        
        <Link
          href="/super-admin/experts"
          className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Super Admin</span>
        </Link>
      </div>
    </div>
  );
}
