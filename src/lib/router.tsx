'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type Route = string;
type RouteParams = Record<string, string>;

interface RouterContextType {
  route: Route;
  params: RouteParams;
  navigate: (path: string) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextType>({
  route: '',
  params: {},
  navigate: () => {},
  back: () => {},
});

export function useRouter() {
  return useContext(RouterContext);
}

function parseHash(hash: string): { route: string; params: RouteParams } {
  const cleanHash = hash.replace(/^#\/?/, '') || 'dashboard';
  const segments = cleanHash.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return { route: 'dashboard', params: {} };
  }

  const params: RouteParams = {};
  let route = segments[0];

  if (segments.length >= 2) {
    if (segments[0] === 'trades' && segments[1] === 'new') {
      route = 'trade-new';
    } else if (segments[0] === 'trades' && segments[1] === 'edit') {
      route = 'trade-edit';
      params.id = segments[2] || '';
    } else if (segments[0] === 'trades' && segments.length === 2) {
      route = 'trade-detail';
      params.id = segments[1];
    } else if (segments[0] === 'reviews' && segments[1] === 'daily') {
      if (segments.length >= 3) {
        route = 'review-daily-edit';
        params.id = segments[2];
      } else {
        route = 'review-daily-new';
      }
    } else if (segments[0] === 'reviews' && segments[1] === 'weekly') {
      if (segments.length >= 3) {
        route = 'review-period-edit';
        params.id = segments[2];
      } else {
        route = 'review-period-new';
        params.periodType = 'weekly';
      }
    } else if (segments[0] === 'reviews' && segments[1] === 'monthly') {
      if (segments.length >= 3) {
        route = 'review-period-edit';
        params.id = segments[2];
      } else {
        route = 'review-period-new';
        params.periodType = 'monthly';
      }
    } else if (segments[0] === 'settings' && segments[1] === 'import-export') {
      route = 'import-export';
    }
  }

  return { route, params };
}

export function HashRouter({ children }: { children: ReactNode }) {
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = '/' + path;
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  const { route, params } = parseHash(currentHash);

  const contextValue = useMemo(() => ({ route, params, navigate, back }), [route, params, navigate, back]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}
