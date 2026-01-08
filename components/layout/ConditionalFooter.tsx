'use client';

import { usePathname } from 'next/navigation';
import { LegalFooter } from '@/components/legal';

interface ConditionalFooterProps {
  className?: string;
}

const ConditionalFooter: React.FC<ConditionalFooterProps> = ({ className }) => {
  const pathname = usePathname();
  
  // Don't show footer on expert pages as they have their own footer
  if (pathname?.startsWith('/expert/')) {
    return null;
  }
  
  return <LegalFooter className={className} />;
};

export default ConditionalFooter