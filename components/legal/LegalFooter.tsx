'use client';

import React, { useState } from 'react';
import LegalModal from './LegalModal';
import { useLegal } from '@/contexts/LegalContext';

interface LegalFooterProps {
  className?: string;
}

const LegalFooter: React.FC<LegalFooterProps> = ({ 
  className = '' 
}) => {
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
      <footer className={`bg-gray-50 border-t border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-3 sm:mb-0">
              © {new Date().getFullYear()} YOORZ.AI LIMITED. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end gap-6">
              {legalLinks.map((link) => (
                <button
                  key={link.type}
                  onClick={() => openModal(link.type, link.title)}
                  className="text-gray-500 hover:text-gray-700 text-sm transition-colors duration-200"
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

export default LegalFooter;