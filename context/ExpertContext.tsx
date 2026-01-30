"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface KnowledgeBaseStats {
    total_vectors: number;
    total_word_count: number;
    total_word_count_formatted: string;
    memory_usage_mb: number;
    memory_usage_formatted: string;
    average_chunk_size: number;
    files_processed: number;
    index_utilization_percent: number;
    namespace: string;
    data_source: string;
}

interface StatusStats {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
}

interface ExpertContextType {
    expert: any | null;
    setExpert: (expert: any | null) => void;
    kbStats: KnowledgeBaseStats | null;
    setKbStats: (stats: KnowledgeBaseStats | null) => void;
    statusStats: StatusStats;
    setStatusStats: (stats: StatusStats) => void;
    isLoadingExpert: boolean;
    setIsLoadingExpert: (loading: boolean) => void;
}

const ExpertContext = createContext<ExpertContextType | undefined>(undefined);

export const ExpertProvider = ({ children }: { children: ReactNode }) => {
    const [expert, setExpert] = useState<any | null>(null);
    const [kbStats, setKbStats] = useState<KnowledgeBaseStats | null>(null);
    const [statusStats, setStatusStats] = useState<StatusStats>({
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
    });
    const [isLoadingExpert, setIsLoadingExpert] = useState(false);

    return (
        <ExpertContext.Provider
            value={{
                expert,
                setExpert,
                kbStats,
                setKbStats,
                statusStats,
                setStatusStats,
                isLoadingExpert,
                setIsLoadingExpert,
            }}
        >
            {children}
        </ExpertContext.Provider>
    );
};

export const useExpert = () => {
    const context = useContext(ExpertContext);
    if (context === undefined) {
        throw new Error("useExpert must be used within an ExpertProvider");
    }
    return context;
};
