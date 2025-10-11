import React, { createContext, useContext, useState, ReactNode } from 'react';

type FilterType = 'all' | 'direct' | 'groups' | 'unread' | 'archived';

interface FilterContextType {
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  return (
    <FilterContext.Provider value={{
      activeFilter,
      setActiveFilter,
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};


