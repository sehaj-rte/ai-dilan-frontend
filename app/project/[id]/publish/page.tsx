"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PublishRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    // Redirect to the new Expert Preview Manager
    router.replace(`/project/${projectId}/expert-preview`);
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}