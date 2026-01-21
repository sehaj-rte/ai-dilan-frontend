"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
    FileText,
    Shield,
    Scale,
    Save,
    Loader2,
    RefreshCw,
    Info,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import { useExpert } from "@/contexts/ExpertContext";

const LegalDocumentsPage = () => {
    const params = useParams();
    const projectId = params.id as string;
    const { toasts, removeToast, success, error } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("privacy");

    const [formData, setFormData] = useState({
        privacy_policy: "",
        dpa: "",
        terms_conditions: "",
    });

    useEffect(() => {
        if (projectId) {
            fetchPublicationSettings();
        }
    }, [projectId]);

    const fetchPublicationSettings = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/publishing/experts/${projectId}/publication`,
                {
                    headers: getAuthHeaders(),
                }
            );
            const data = await response.json();

            if (data.success && data.publication) {
                setFormData({
                    privacy_policy: data.publication.privacy_policy || "",
                    dpa: data.publication.dpa || "",
                    terms_conditions: data.publication.terms_conditions || "",
                });
            }
        } catch (err) {
            console.error("Error fetching publication settings:", err);
            error("Failed to load legal documents");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetchWithAuth(
                `${API_URL}/publishing/experts/${projectId}/publication`,
                {
                    method: "PUT",
                    headers: {
                        ...getAuthHeaders(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                }
            );

            const data = await response.json();

            if (data.success) {
                success("Legal documents updated successfully!");
            } else {
                error("Failed to update legal documents: " + (data.detail || "Unknown error"));
            }
        } catch (err) {
            console.error("Error updating legal documents:", err);
            error("Error updating legal documents");
        } finally {
            setSaving(false);
        }
    };

    const loadDefault = async (type: "privacy" | "dpa" | "terms") => {
        try {
            const fileName = type === "privacy" ? "privacy.html" : type === "dpa" ? "dpa.html" : "terms.html";
            const response = await fetch(`/legal/expert/${fileName}`);
            if (!response.ok) throw new Error("Default file not found");
            const content = await response.text();

            setFormData(prev => ({
                ...prev,
                [type === "privacy" ? "privacy_policy" : type === "dpa" ? "dpa" : "terms_conditions"]: content
            }));

            success(`Loaded default ${type.toUpperCase()} template`);
        } catch (err) {
            console.error(`Error loading default ${type}:`, err);
            error(`Failed to load default ${type} template`);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="max-w-5xl mx-auto p-6">
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            Legal Documents
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Customize your Privacy Policy, DPA, and Terms & Conditions. These will be linked on your public persona pages.
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>

                <Card className="shadow-sm border-gray-200 overflow-hidden bg-white">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6">
                            <TabsList className="bg-transparent border-none gap-6 h-14">
                                <TabsTrigger
                                    value="privacy"
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 h-14"
                                >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Privacy Policy
                                </TabsTrigger>
                                <TabsTrigger
                                    value="terms"
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 h-14"
                                >
                                    <Scale className="h-4 w-4 mr-2" />
                                    Terms & Conditions
                                </TabsTrigger>
                                <TabsTrigger
                                    value="dpa"
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 h-14"
                                >
                                    <Info className="h-4 w-4 mr-2" />
                                    DPA
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
                            <TabsContent value="privacy" className="mt-0">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Privacy Policy</h3>
                                            <p className="text-sm text-gray-500">HTML content for your Privacy Policy</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadDefault("privacy")}
                                            className="text-gray-600"
                                        >
                                            <RefreshCw className="h-3 w-3 mr-2" />
                                            Load Default
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Paste your HTML Privacy Policy here..."
                                        className="min-h-[500px] font-mono text-sm leading-relaxed"
                                        value={formData.privacy_policy}
                                        onChange={(e) => setFormData({ ...formData, privacy_policy: e.target.value })}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="terms" className="mt-0">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
                                            <p className="text-sm text-gray-500">HTML content for your Terms & Conditions</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadDefault("terms")}
                                            className="text-gray-600"
                                        >
                                            <RefreshCw className="h-3 w-3 mr-2" />
                                            Load Default
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Paste your HTML Terms & Conditions here..."
                                        className="min-h-[500px] font-mono text-sm leading-relaxed"
                                        value={formData.terms_conditions}
                                        onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="dpa" className="mt-0">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Data Processing Agreement (DPA)</h3>
                                            <p className="text-sm text-gray-500">HTML content for your DPA</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadDefault("dpa")}
                                            className="text-gray-600"
                                        >
                                            <RefreshCw className="h-3 w-3 mr-2" />
                                            Load Default
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Paste your HTML DPA here..."
                                        className="min-h-[500px] font-mono text-sm leading-relaxed"
                                        value={formData.dpa}
                                        onChange={(e) => setFormData({ ...formData, dpa: e.target.value })}
                                    />
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </Card>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-semibold">Rendering Note:</p>
                        <p>Documents are stored as HTML and will be rendered within the styling of each persona's page. We recommend using semantic HTML tags like <code>&lt;h1&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;table&gt;</code>, etc. Avoid using <code>&lt;html&gt;</code> or <code>&lt;body&gt;</code> tags as the content will be injected into an existing page.</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default LegalDocumentsPage;
