"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BillingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Redirect to new expert billing page
  useEffect(() => {
    const expertSlug = searchParams.get("expert");
    const authenticate = searchParams.get("authenticate");
    
    // Build the new URL with all query parameters
    const queryParams = new URLSearchParams();
    if (expertSlug) queryParams.set("expert", expertSlug);
    if (authenticate) queryParams.set("authenticate", authenticate);
    
    const newUrl = `/expert/billing${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    // Redirect to the new location
    router.replace(newUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="ml-4 text-gray-600">Redirecting to expert billing...</p>
    </div>
  );
};

export default BillingPage;
