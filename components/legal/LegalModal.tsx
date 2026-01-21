'use client';

import React, { useEffect, useState } from 'react';
import { useLegal } from '@/contexts/LegalContext';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'dpa';
  title: string;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type, title }) => {
  const { loadDocument, loading, error } = useLegal();
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const loadContent = async () => {
        try {
          const htmlContent = await loadDocument(type);
          setContent(htmlContent);
        } catch (err) {
          console.error(`Failed to load ${type}:`, err);
        }
      };

      loadContent();
    }
  }, [isOpen, type, loadDocument]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all max-w-5xl w-full h-[85vh] flex flex-col z-10">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 relative shrink-0">
          <h3 className="text-lg font-bold text-gray-900 text-center">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow bg-white overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 font-medium">Loading document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center p-8 text-center text-red-600">
              <p>{error}</p>
            </div>
          ) : (
            <iframe
              srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <style>
                        body { 
                          margin: 0; 
                          padding: 20px; 
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                          line-height: 1.5;
                        }
                        /* Hide internal scrollbars if the document has its own */
                        ::-webkit-scrollbar { width: 8px; }
                        ::-webkit-scrollbar-track { background: #f1f1f1; }
                        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
                        ::-webkit-scrollbar-thumb:hover { background: #bbb; }
                      </style>
                    </head>
                    <body>
                      ${content}
                    </body>
                  </html>
                `}
              className="w-full h-full border-none shadow-inner"
              title="Legal Content"
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-white py-2 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;