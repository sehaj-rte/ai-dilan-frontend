"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Info, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ExpertPageHeader from "@/components/layout/ExpertPageHeader";
import { useClientAuthFlow } from "@/contexts/ClientAuthFlowContext";

const ExpertTermsPage = () => {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const { currentUser } = useClientAuthFlow();

    const [loading, setLoading] = useState(true);
    const [publication, setPublication] = useState<any>(null);
    const [expert, setExpert] = useState<any>(null);
    const [content, setContent] = useState<string>("");
    const [isSourceFromDB, setIsSourceFromDB] = useState(false);

    useEffect(() => {
        if (slug) {
            fetchData();
        }
    }, [slug]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Branding & Basic Info (Now fast!)
            const response = await fetch(`${API_URL}/publishing/public/expert/${slug}`);
            const data = await response.json();

            if (data.success) {
                setPublication(data.publication);
                setExpert(data.expert);

                // 2. Fetch specific legal content (async)
                try {
                    const legalResp = await fetch(`${API_URL}/publishing/public/expert/${slug}/legal/terms`);
                    const legalData = await legalResp.json();

                    if (legalData.success && legalData.content) {
                        setContent(legalData.content);
                        setIsSourceFromDB(true);
                    } else {
                        // Fallback to static
                        const defaultResp = await fetch('/legal/expert/terms.html');
                        if (defaultResp.ok) {
                            setContent(await defaultResp.text());
                        }
                        setIsSourceFromDB(false);
                    }
                } catch (err) {
                    console.error("Error fetching legal content:", err);
                }
            }
        } catch (error) {
            console.error("Error fetching terms:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!publication) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest text-gray-400">
                Expert Not Found
            </div>
        );
    }

    const primaryColor = publication.primary_color || "#3B82F6";

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ExpertPageHeader
                expertName={publication.display_name}
                user={currentUser}
                isAuthenticated={!!currentUser}
                onShowAuthModal={() => { }}
                onShowProfileModal={() => { }}
                onShowBilling={() => { }}
                onLogout={() => { }}
                primaryColor={primaryColor}
            />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Button
                    variant="ghost"
                    className="mb-6 hover:bg-gray-200 text-gray-600"
                    onClick={() => router.push(`/expert/${slug}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to {publication.display_name}
                </Button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
                                <p className="text-xs text-gray-500 font-medium">
                                    Legal Agreement for {publication.display_name}
                                    {isSourceFromDB && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-green-50 text-green-600 text-[10px] uppercase tracking-wider">Custom</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-10">
                        <div
                            className="legal-content-container prose prose-sm max-w-none"
                            data-source={isSourceFromDB ? "database" : "static"}
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .legal-content-container {
                    font-family: 'Inter', system-ui, sans-serif;
                    line-height: 1.6;
                    color: #4B5563;
                }
                .legal-content-container h1, 
                .legal-content-container h2, 
                .legal-content-container h3 {
                    color: #111827;
                    font-weight: 700;
                    margin-top: 2.5rem;
                    margin-bottom: 1.25rem;
                }
                .legal-content-container p {
                    margin-bottom: 1.5rem;
                }
                .legal-content-container table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2rem 0;
                    font-size: 0.875rem;
                }
                .legal-content-container th, 
                .legal-content-container td {
                    border: 1px solid #E5E7EB;
                    padding: 1rem;
                    text-align: left;
                }
                .legal-content-container th {
                    background-color: #F9FAF9;
                    font-weight: 600;
                    color: #374151;
                }
            `}</style>
        </div>
    );
};

export default ExpertTermsPage;
