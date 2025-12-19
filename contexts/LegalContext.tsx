'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ContactInfo {
  company: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    phone: string;
    email: string;
    website: string;
  };
  legal: {
    registrationNumber: string;
    taxId: string;
    jurisdiction: string;
  };
  support: {
    email: string;
    phone: string;
    hours: string;
  };
}

interface LegalContextType {
  terms: string | null;
  privacy: string | null;
  dpa: string | null;
  contact: ContactInfo | null;
  loading: boolean;
  error: string | null;
  loadDocument: (type: 'terms' | 'privacy' | 'dpa') => Promise<string>;
}

const LegalContext = createContext<LegalContextType | undefined>(undefined);

export const useLegal = () => {
  const context = useContext(LegalContext);
  if (context === undefined) {
    throw new Error('useLegal must be used within a LegalProvider');
  }
  return context;
};

export const LegalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [terms, setTerms] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<string | null>(null);
  const [dpa, setDpa] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('');

  const loadDocument = async (type: 'terms' | 'privacy' | 'dpa'): Promise<string> => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isExpertRoute = currentPath.startsWith('/expert');
    const routeKey = isExpertRoute ? 'expert' : 'main';
    
    // Clear cache if route changed
    if (currentRoute !== routeKey) {
      setTerms(null);
      setPrivacy(null);
      setDpa(null);
      setCurrentRoute(routeKey);
    }
    
    // Return cached version if available
    if (type === 'terms' && terms) return terms;
    if (type === 'privacy' && privacy) return privacy;
    if (type === 'dpa' && dpa) return dpa;

    setLoading(true);
    setError(null);

    try {
      const legalPath = isExpertRoute ? `/legal/expert/${type}.html` : `/legal/${type}.html`;
      
      const response = await fetch(legalPath);
      if (!response.ok) {
        throw new Error(`Failed to load ${type} document`);
      }
      
      const content = await response.text();
      
      // Cache the content
      if (type === 'terms') setTerms(content);
      if (type === 'privacy') setPrivacy(content);
      if (type === 'dpa') setDpa(content);
      
      return content;
    } catch (err) {
      const errorMessage = `Error loading ${type}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load contact info on mount and route changes
  useEffect(() => {
    const loadContact = async () => {
      try {
        // Check if we're on an expert route
        const isExpertRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/expert');
        const contactPath = isExpertRoute ? '/legal/expert/contact.json' : '/legal/contact.json';
        
        const response = await fetch(contactPath);
        if (response.ok) {
          const contactData = await response.json();
          setContact(contactData);
        }
      } catch (err) {
        console.warn('Could not load contact information:', err);
      }
    };

    loadContact();
    
    // Listen for route changes
    const handleRouteChange = () => {
      loadContact();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }
  }, []);

  const value: LegalContextType = {
    terms,
    privacy,
    dpa,
    contact,
    loading,
    error,
    loadDocument,
  };

  return (
    <LegalContext.Provider value={value}>
      {children}
    </LegalContext.Provider>
  );
};