"use client";

import React from "react";
import { ExpertProvider } from "@/context/ExpertContext";

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ExpertProvider>{children}</ExpertProvider>;
}
