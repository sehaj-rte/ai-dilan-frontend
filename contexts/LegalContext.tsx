'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '@/lib/config';

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
  const fetchingDocs = useRef<Set<string>>(new Set());
  const cache = useRef<Record<string, string>>({});

  const loadDocument = useCallback(async (type: 'terms' | 'privacy' | 'dpa'): Promise<string> => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isExpertRoute = currentPath.startsWith('/expert');
    const routeKey = isExpertRoute ? 'expert' : 'main';

    // Clear cache if route changed
    if (currentRoute !== routeKey) {
      cache.current = {};
      setTerms(null);
      setPrivacy(null);
      setDpa(null);
      setCurrentRoute(routeKey);
    }

    // Return cached version if available
    if (cache.current[type]) return cache.current[type];

    // Prevent concurrent duplicate requests
    if (fetchingDocs.current.has(type)) {
      return cache.current[type] || '';
    }

    fetchingDocs.current.add(type);
    setLoading(true);
    setError(null);

    console.log(`[LegalContext] Starting fetch for ${type}...`);
    const startTime = Date.now();

    try {
      let content = '';
      let isFetchedFromAPI = false;

      // If it's an expert route, try to fetch from the database first
      if (isExpertRoute) {
        const segments = currentPath.split('/').filter(Boolean);
        if (segments[0] === 'expert' && segments[1]) {
          const slug = segments[1];
          try {
            console.log(`[LegalContext] Fetching ${type} from API for slug: ${slug}`);
            const apiResp = await fetch(`${API_URL}/publishing/public/expert/${slug}/legal/${type}`);
            if (apiResp.ok) {
              const data = await apiResp.json();
              if (data.success && data.content) {
                content = data.content;
                isFetchedFromAPI = true;
                console.log(`[LegalContext] Successfully fetched ${type} from API in ${Date.now() - startTime}ms`);
              }
            }
          } catch (apiErr) {
            console.warn(`Failed to fetch expert ${type} from API, falling back to static:`, apiErr);
          }
        }
      }

      // Fallback to static file if not fetched from API
      if (!isFetchedFromAPI) {
        const legalPath = isExpertRoute ? `/legal/expert/${type}.html` : `/legal/${type}.html`;
        console.log(`[LegalContext] Fetching ${type} from static path: ${legalPath}`);
        const response = await fetch(legalPath);
        if (!response.ok) {
          throw new Error(`Failed to load ${type} document`);
        }
        content = await response.text();
        console.log(`[LegalContext] Successfully fetched ${type} from static in ${Date.now() - startTime}ms`);
      }

      // Cache the content in ref and state
      cache.current[type] = content;
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
      fetchingDocs.current.delete(type);
    }
  }, [currentRoute]);

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