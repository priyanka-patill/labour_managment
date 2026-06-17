"use client";

import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';

import { useSelector } from 'react-redux';
import { RootState } from '../store';

function ThemeSynchronizer({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.auth.theme);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  }));

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeSynchronizer>
          {children}
        </ThemeSynchronizer>
      </QueryClientProvider>
    </Provider>
  );
}
export default Providers;
