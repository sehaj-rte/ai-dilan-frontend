'use client';

import React, { useState } from 'react';
import LegalModal from './LegalModal';
import { useLegal } from '@/contexts/LegalContext';
import { useExpert } from '@/contexts/ExpertContext';

interface ExpertFooterProps {
  className?: string;
}

const ExpertFooter: React.FC<ExpertFooterProps> = ({ 
  className = ''
}) => {
  const { expertData } = useExpert();
  const expertName = expertData.displayName || expertData.name;
  const primaryColor = expertData.primaryColor || '#3B82F6';
  
  // Show expert name only if available
  const showExpertBranding = Boolean(expertName);
  const { contact } = useLegal();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'terms' | 'privacy' | 'dpa' | null;
    title: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
  });

  const openModal = (type: 'terms' | 'privacy' | 'dpa', title: string) => {
    setModalState({ isOpen: true, type, title });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, title: '' });
  };

  const legalLinks = [
    { type: 'terms' as const, title: 'Terms & Conditions' },
    { type: 'privacy' as const, title: 'Privacy Policy' },
    { type: 'dpa' as const, title: 'Data Processing Agreement' },
  ];

  return (
    <>
      <footer 
        className={`bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border-t shadow-lg ${className}`}
        style={{ 
          borderTopColor: `${primaryColor}30`,
          borderTopWidth: '2px'
        }}
      >
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-center sm:text-left mb-3 sm:mb-0">
              {showExpertBranding && (
                <p 
                  className="text-sm font-semibold mb-1 flex items-center justify-center sm:justify-start gap-2"
                  style={{ color: primaryColor }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                  Powered by {expertName}
                </p>
              )}
              <p className="text-gray-500 text-xs">
                © {new Date().getFullYear()} YOORZ.AI LIMITED. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-4">
              {legalLinks.map((link) => (
                <button
                  key={link.type}
                  onClick={() => openModal(link.type, link.title)}
                  className="text-gray-400 hover:text-gray-600 text-xs transition-colors duration-200 hover:underline"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = primaryColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9CA3AF';
                  }}
                >
                  {link.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {modalState.type && (
        <LegalModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          type={modalState.type}
          title={modalState.title}
        />
      )}
    </>
  );
};

export default ExpertFooter;