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
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
    QrCode,
    Download,
    Copy,
    Check,
    Globe,
    Share2,
    Smartphone,
    Printer,
    Mail,
    AlertCircle,
    Eye,
    ExternalLink,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { fetchWithAuth, getAuthHeaders } from "@/lib/api-client";
import QRCode from "react-qr-code";

interface Publication {
    id: string;
    slug: string;
    display_name: string;
    is_published: boolean;
}

const QRCodeManagerPage = () => {
    const params = useParams();
    const projectId = params.id as string;
    const { toasts, removeToast, success, error } = useToast();

    const [publication, setPublication] = useState<Publication | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCopied, setIsCopied] = useState(false);

    // Fetch publication data
    useEffect(() => {
        fetchPublicationData();
    }, [projectId]);

    const fetchPublicationData = async () => {
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
                setPublication(data.publication);
            }
        } catch (err) {
            console.error("Error fetching publication:", err);
        } finally {
            setLoading(false);
        }
    };

    const getPublicUrl = () => {
        if (!publication?.slug) return "";
        return `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/expert/${publication.slug}`;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            success("URL copied to clipboard!");

            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
            error("Failed to copy URL");
        }
    };

    const downloadQRCode = () => {
        try {
            const svg = document.getElementById("qr-code-main");
            if (!svg) {
                error("QR code not found");
                return;
            }

            // Generate filename
            const filename = `${publication?.slug || "expert"}-qr-code.png`;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                error("Failed to create canvas");
                return;
            }

            const scale = 4;
            canvas.width = 256 * scale;
            canvas.height = 256 * scale;

            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const downloadUrl = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = downloadUrl;
                        link.download = filename;
                        link.setAttribute("download", filename); // Ensure download attribute is set
                        document.body.appendChild(link);
                        link.click();

                        // Clean up after a short delay
                        setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(downloadUrl);
                        }, 100);

                        success(`Downloaded: ${filename}`);
                    }
                }, "image/png");
            };

            img.onerror = () => {
                error("Failed to generate QR code image");
                URL.revokeObjectURL(url);
            };

            img.src = url;
        } catch (err) {
            console.error("Failed to download QR code:", err);
            error("Failed to download QR code");
        }
    };

    const openQRCode = () => {
        try {
            const svg = document.getElementById("qr-code-main");
            if (!svg) {
                error("QR code not found");
                return;
            }

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                error("Failed to create canvas");
                return;
            }

            const scale = 4;
            canvas.width = 256 * scale;
            canvas.height = 256 * scale;

            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const imageUrl = URL.createObjectURL(blob);
                        // Open in new tab
                        const newWindow = window.open();
                        if (newWindow) {
                            newWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>${publication?.display_name || "Expert"} - QR Code</title>
                                    <style>
                                        body {
                                            margin: 0;
                                            padding: 20px;
                                            display: flex;
                                            flex-direction: column;
                                            align-items: center;
                                            justify-content: center;
                                            min-height: 100vh;
                                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                                        }
                                        .container {
                                            background: white;
                                            padding: 40px;
                                            border-radius: 20px;
                                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                                            text-align: center;
                                        }
                                        h1 {
                                            color: #333;
                                            margin: 0 0 10px 0;
                                            font-size: 28px;
                                        }
                                        p {
                                            color: #666;
                                            margin: 0 0 30px 0;
                                            font-size: 14px;
                                        }
                                        img {
                                            max-width: 100%;
                                            height: auto;
                                            border-radius: 10px;
                                        }
                                        .url {
                                            margin-top: 20px;
                                            padding: 15px;
                                            background: #f5f5f5;
                                            border-radius: 8px;
                                            font-family: monospace;
                                            font-size: 12px;
                                            color: #4F46E5;
                                            word-break: break-all;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <h1>${publication?.display_name || "Expert"}</h1>
                                        <p>Scan this QR code to access the AI expert</p>
                                        <img src="${imageUrl}" alt="QR Code" />
                                        <div class="url">${getPublicUrl()}</div>
                                    </div>
                                </body>
                                </html>
                            `);
                            newWindow.document.close();
                            success("QR code opened in new tab!");
                        } else {
                            error("Please allow popups to open QR code");
                        }
                    }
                }, "image/png");
            };

            img.onerror = () => {
                error("Failed to generate QR code image");
                URL.revokeObjectURL(url);
            };

            img.src = url;
        } catch (err) {
            console.error("Failed to open QR code:", err);
            error("Failed to open QR code");
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!publication || !publication.slug) {
        return (
            <DashboardLayout>
                <ToastContainer toasts={toasts} onClose={removeToast} />
                <div className="max-w-4xl mx-auto p-6">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <QrCode className="h-8 w-8 text-blue-600" />
                            QR Code Manager
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Generate and manage QR codes for your AI expert
                        </p>
                    </div>

                    <Card className="shadow-lg">
                        <CardContent className="p-8">
                            <div className="text-center">
                                <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No Publication Found
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    You need to publish your expert first before generating a QR code.
                                </p>
                                <Button
                                    onClick={() => window.location.href = `/project/${projectId}/expert-preview`}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Globe className="h-4 w-4 mr-2" />
                                    Go to Publication Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="max-w-6xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <QrCode className="h-8 w-8 text-blue-600" />
                        QR Code Manager
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Download and share your AI expert's QR code
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* QR Code Display */}
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="h-5 w-5 text-blue-600" />
                                Your QR Code
                            </CardTitle>
                            <CardDescription>
                                Scan this code to access your AI expert instantly
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-gray-200">
                                <div className="bg-white p-6 rounded-xl shadow-lg">
                                    <QRCode
                                        id="qr-code-main"
                                        value={getPublicUrl()}
                                        size={256}
                                        level="H"
                                        className="w-full h-auto"
                                    />
                                </div>
                                <p className="text-sm text-gray-600 mt-4 text-center font-medium">
                                    {publication.display_name}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 space-y-3">
                                <Button
                                    onClick={downloadQRCode}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    size="lg"
                                >
                                    <Download className="h-5 w-5 mr-2" />
                                    Download QR Code
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={openQRCode}
                                        variant="outline"
                                        className="w-full"
                                        size="lg"
                                    >
                                        <ExternalLink className="h-5 w-5 mr-2" />
                                        Open
                                    </Button>
                                    <Button
                                        onClick={() => copyToClipboard(getPublicUrl())}
                                        variant="outline"
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isCopied ? (
                                            <>
                                                <Check className="h-5 w-5 mr-2 text-green-500" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-5 w-5 mr-2" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* URL Display */}
                            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">
                                    Public URL
                                </p>
                                <p className="text-sm text-blue-600 font-mono break-all">
                                    {getPublicUrl()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Usage Guide */}
                    <div className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Share2 className="h-5 w-5 text-green-600" />
                                    How to Share
                                </CardTitle>
                                <CardDescription>
                                    Ways to use your QR code
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                    <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">Social Media</h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Post on Instagram, Facebook, Twitter, or LinkedIn
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                                    <Printer className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">Print Materials</h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Add to business cards, flyers, posters, or brochures
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                    <Mail className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">Email Signature</h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Include in your email signature for easy access
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                                    <Globe className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">Website</h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Embed on your website or blog for quick access
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone className="h-5 w-5 text-purple-600" />
                                    How to Scan
                                </CardTitle>
                                <CardDescription>
                                    Instructions for your audience
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3 text-sm text-gray-700">
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            1
                                        </span>
                                        <span>Open your phone's camera app (iPhone or Android)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            2
                                        </span>
                                        <span>Point the camera at the QR code</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            3
                                        </span>
                                        <span>Tap the notification that appears</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            4
                                        </span>
                                        <span>Start chatting with your AI expert!</span>
                                    </li>
                                </ol>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default QRCodeManagerPage;
