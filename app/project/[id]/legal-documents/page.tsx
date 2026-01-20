"use client";

import React from "react";
import { FileText, Shield, Scale, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const LegalDocumentsPage = () => {
    const documents = [
        {
            title: "Terms & Conditions",
            description: "Define the rules and guidelines for using your AI expert service.",
            icon: Scale,
            status: "Required",
            color: "blue"
        },
        {
            title: "Privacy Policy",
            description: "Explain how you collect, use, and protect user data.",
            icon: Shield,
            status: "Required",
            color: "green"
        },
        {
            title: "Cookie Policy",
            description: "Outline the use of cookies and tracking technologies.",
            icon: Info,
            status: "Optional",
            color: "gray"
        }
    ];

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-100 rounded-xl">
                    <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Legal Documents</h1>
                    <p className="text-gray-600">Manage the legal agreements and policies for your AI Persona.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {documents.map((doc) => {
                    const Icon = doc.icon;
                    return (
                        <Card key={doc.title} className="hover:shadow-md transition-shadow border-gray-200">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${doc.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                        doc.color === 'green' ? 'bg-green-50 text-green-600' :
                                            'bg-gray-50 text-gray-600'
                                    }`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900">{doc.title}</CardTitle>
                                <CardDescription className="text-gray-600">{doc.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${doc.status === 'Required' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {doc.status}
                                    </span>
                                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                        Coming Soon →
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-12 p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Legal Document Manager</h2>
                <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                    Soon you will be able to upload or generate custom legal documents for your AI Persona.
                    This will ensure your service remains compliant with local regulations like GDPR and CCPA.
                </p>
                <div className="flex justify-center gap-4">
                    <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-500 italic">
                        Module under construction
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalDocumentsPage;
