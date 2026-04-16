'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { TradeFilters, TradeSort } from '@/types';

interface AppContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  tradeFilters: TradeFilters;
  setTradeFilters: (filters: TradeFilters) => void;
  tradeSort: TradeSort;
  setTradeSort: (sort: TradeSort) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType>({
  selectedDate: '',
  setSelectedDate: () => {},
  tradeFilters: {},
  setTradeFilters: () => {},
  tradeSort: { field: 'tradeDate', order: 'desc' },
  setTradeSort: () => {},
  sidebarOpen: true,
  setSidebarOpen: () => {},
});

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [tradeFilters, setTradeFilters] = useState<TradeFilters>({});
  const [tradeSort, setTradeSort] = useState<TradeSort>({ field: 'tradeDate', order: 'desc' });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AppContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        tradeFilters,
        setTradeFilters,
        tradeSort,
        setTradeSort,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
