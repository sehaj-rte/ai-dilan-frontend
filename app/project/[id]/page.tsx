"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const ProjectPage = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    // Redirect to chat (Talk To AI Persona) as the main route
    router.replace(`/project/${projectId}/chat`);
  }, [projectId, router]);

  return null;
};

export default ProjectPage;
