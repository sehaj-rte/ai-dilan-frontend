// For same-server deployment, use relative path with /bapi prefix
// For development, use localhost with /bapi prefix
export const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '/bapi'  // Production: relative path with /bapi prefix
    : 'http://localhost:8000/bapi'  // Development: full URL with /bapi prefix
);
