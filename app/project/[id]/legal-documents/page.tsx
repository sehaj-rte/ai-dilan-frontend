"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { FileText, Shield, Scale, Loader2, Info, X } from "lucide-react";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";

const LegalDocumentsPage = () => {
    const params = useParams();
    const projectId = params.id as string;
    const { toasts, removeToast, error } = useToast();

    const [modalOpen, setModalOpen] = useState<string | null>(null);
    const [modalContent, setModalContent] = useState<string>("");
    const [modalLoading, setModalLoading] = useState(false);

    const openModal = async (type: string) => {
        setModalOpen(type);
        setModalLoading(true);
        setModalContent("");
        
        // Prevent body scroll and background distortion
        document.body.style.overflow = 'hidden';

        try {
            const response = await fetchWithAuth(
                `${API_URL}/publishing/experts/${projectId}/publication`,
                {
                    headers: getAuthHeaders(),
                }
            );
            const data = await response.json();

            if (data.success && data.publication) {
                let content = "";
                switch (type) {
                    case 'privacy':
                        content = data.publication.privacy_policy || "";
                        break;
                    case 'terms':
                        content = data.publication.terms_conditions || "";
                        break;
                    case 'dpa':
                        content = data.publication.dpa || "";
                        break;
                }
                setModalContent(content);
            }
        } catch (err) {
            console.error("Error fetching document:", err);
            error("Failed to load document");
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setModalOpen(null);
        setModalContent("");
        // Restore body scroll
        document.body.style.overflow = 'unset';
    };

    const getModalData = (type: string) => {
        switch (type) {
            case 'privacy':
                return {
                    title: 'Privacy Policy',
                    icon: <Shield className="h-6 w-6" />
                };
            case 'terms':
                return {
                    title: 'Terms & Conditions',
                    icon: <Scale className="h-6 w-6" />
                };
            case 'dpa':
                return {
                    title: 'Data Processing Agreement',
                    icon: <Info className="h-6 w-6" />
                };
            default:
                return { title: '', icon: null };
        }
    };

    const modalData = modalOpen ? getModalData(modalOpen) : null;

    return (
        <DashboardLayout>
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        Legal Documents Preview
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Preview how your legal documents appear to users
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Button
                        onClick={() => openModal('privacy')}
                        className="h-32 flex flex-col items-center justify-center gap-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 hover:border-blue-300"
                        variant="outline"
                    >
                        <Shield className="h-8 w-8" />
                        <span className="text-lg font-semibold">Privacy Policy</span>
                    </Button>

                    <Button
                        onClick={() => openModal('terms')}
                        className="h-32 flex flex-col items-center justify-center gap-4 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200 hover:border-green-300"
                        variant="outline"
                    >
                        <Scale className="h-8 w-8" />
                        <span className="text-lg font-semibold">Terms & Conditions</span>
                    </Button>

                    <Button
                        onClick={() => openModal('dpa')}
                        className="h-32 flex flex-col items-center justify-center gap-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border-2 border-purple-200 hover:border-purple-300"
                        variant="outline"
                    >
                        <Info className="h-8 w-8" />
                        <span className="text-lg font-semibold">DPA</span>
                    </Button>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && modalData && (
                <>
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-50"
                        onClick={closeModal}
                        style={{ 
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh'
                        }}
                    />
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="min-h-screen px-4 py-8 flex items-center justify-center">
                            <div 
                                className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl relative"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between p-6 border-b bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                            {modalData.icon}
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">{modalData.title}</h2>
                                    </div>
                                    <Button
                                        onClick={closeModal}
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                
                                <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] bg-white">
                                    {modalLoading ? (
                                        <div className="flex items-center justify-center h-64">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : modalContent ? (
                                        <div 
                                            className="legal-content-preview"
                                            dangerouslySetInnerHTML={{ __html: modalContent }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-gray-400">
                                            <div className="text-center">
                                                {modalData.icon}
                                                <p className="mt-4">No content available for {modalData.title}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style jsx global>{`
                .legal-content-preview {
                    font-family: 'Inter', system-ui, sans-serif;
                    line-height: 1.6;
                    color: #4B5563;
                }
                
                .legal-content-preview h1, 
                .legal-content-preview h2, 
                .legal-content-preview h3 {
                    color: #111827;
                    font-weight: 700;
                    margin-top: 2.5rem;
                    margin-bottom: 1.25rem;
                }
                
                .legal-content-preview h1 {
                    font-size: 1.875rem;
                    border-bottom: 2px solid #3b82f6;
                    padding-bottom: 0.5rem;
                }
                
                .legal-content-preview h2 {
                    font-size: 1.5rem;
                    margin-top: 2rem;
                }
                
                .legal-content-preview h3 {
                    font-size: 1.25rem;
                }
                
                .legal-content-preview p {
                    margin-bottom: 1.5rem;
                }
                
                .legal-content-preview table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2rem 0;
                    font-size: 0.875rem;
                }
                
                .legal-content-preview th, 
                .legal-content-preview td {
                    border: 1px solid #E5E7EB;
                    padding: 1rem;
                    text-align: left;
                }
                
                .legal-content-preview th {
                    background-color: #F9FAFB;
                    font-weight: 600;
                    color: #374151;
                }
                
                .legal-content-preview ul {
                    margin-left: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .legal-content-preview li {
                    margin-bottom: 0.5rem;
                }
                
                .legal-content-preview .contact-block {
                    background: #f0f4ff;
                    padding: 1rem;
                    border-left: 4px solid #4c6ef5;
                    margin: 1.5rem 0;
                    border-radius: 0.5rem;
                }
                
                .legal-content-preview .contact-block h2 {
                    margin-top: 0;
                    color: #1e40af;
                }
                
                .legal-content-preview strong {
                    font-weight: 600;
                    color: #374151;
                }
                
                .legal-content-preview code {
                    background-color: #f3f4f6;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-size: 0.875em;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                }
            `}</style>
        </DashboardLayout>
    );
};

export default LegalDocumentsPage;
