import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DrawerContextType {
  isDrawerVisible: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

interface DrawerProviderProps {
  children: ReactNode;
}

export const DrawerProvider: React.FC<DrawerProviderProps> = ({ children }) => {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const openDrawer = () => setIsDrawerVisible(true);
  const closeDrawer = () => setIsDrawerVisible(false);
  const toggleDrawer = () => setIsDrawerVisible(prev => !prev);

  return (
    <DrawerContext.Provider value={{
      isDrawerVisible,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};
