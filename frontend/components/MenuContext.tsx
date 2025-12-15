import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface MenuContextType {
  isOpen: boolean;
  toggleMenu: (isOpen: boolean) => void;
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback((newIsOpen: boolean) => {
    setIsOpen(newIsOpen);
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      toggleMenu,
      openMenu,
      closeMenu,
    }),
    [isOpen, toggleMenu, openMenu, closeMenu],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export const useMenuContext = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  return context;
};
