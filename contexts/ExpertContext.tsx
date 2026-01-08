'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ExpertData {
  name?: string;
  displayName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface ExpertContextType {
  expertData: ExpertData;
  setExpertData: (data: ExpertData) => void;
}

const ExpertContext = createContext<ExpertContextType | undefined>(undefined);

export const useExpert = () => {
  const context = useContext(ExpertContext);
  if (context === undefined) {
    throw new Error('useExpert must be used within an ExpertProvider');
  }
  return context;
};

interface ExpertProviderProps {
  children: ReactNode;
}

export const ExpertProvider: React.FC<ExpertProviderProps> = ({ children }) => {
  const [expertData, setExpertData] = useState<ExpertData>({});

  return (
    <ExpertContext.Provider value={{ expertData, setExpertData }}>
      {children}
    </ExpertContext.Provider>
  );
};