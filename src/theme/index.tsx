import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState, useEffect } from "react";
import { Appearance, StatusBar, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors } from "./colors";
import { dimensions } from "./responsive";

type ThemeContextType = {
  colors: typeof LightColors;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  toggleTheme: () => void;
  isSystemTheme: boolean;
  setIsSystemTheme: Dispatch<SetStateAction<boolean>>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

const THEME_STORAGE_KEY = '@maharishi_theme';
const SYSTEM_THEME_KEY = '@maharishi_system_theme';

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Load theme from storage on app start
  useEffect(() => {
    loadThemeFromStorage();
  }, []);

  // Listen to system theme changes when system theme is enabled
  useEffect(() => {
    if (isSystemTheme) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDark(colorScheme === 'dark');
      });
      
      // Set initial theme based on system
      setIsDark(Appearance.getColorScheme() === 'dark');
      
      return () => subscription?.remove();
    }
  }, [isSystemTheme]);

  // Update status bar when theme changes
  useEffect(() => {
    if (isThemeLoaded) {
      updateStatusBar();
    }
  }, [isDark, isThemeLoaded]);

  const loadThemeFromStorage = async () => {
    console.log('🎨 Loading theme from storage...');
    try {
      const [savedTheme, savedSystemTheme] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(SYSTEM_THEME_KEY),
      ]);

      if (savedSystemTheme !== null) {
        const useSystemTheme = JSON.parse(savedSystemTheme);
        setIsSystemTheme(useSystemTheme);
        
        if (useSystemTheme) {
          setIsDark(Appearance.getColorScheme() === 'dark');
        } else if (savedTheme !== null) {
          setIsDark(JSON.parse(savedTheme));
        }
      } else if (savedTheme !== null) {
        setIsDark(JSON.parse(savedTheme));
        setIsSystemTheme(false);
      }
    } catch (error) {
      console.error('Error loading theme from storage:', error);
    } finally {
      setIsThemeLoaded(true);
    }
  };

  const saveThemeToStorage = async (dark: boolean, systemTheme: boolean) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(dark)),
        AsyncStorage.setItem(SYSTEM_THEME_KEY, JSON.stringify(systemTheme)),
      ]);
    } catch (error) {
      console.error('Error saving theme to storage:', error);
    }
  };

  const updateStatusBar = () => {
    const colors = isDark ? DarkColors : LightColors;
    
    StatusBar.setBackgroundColor(colors.statusbar, true);
    StatusBar.setBarStyle(colors.statusbarContent as 'light-content' | 'dark-content', true);
    
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
    }
  };

  const handleSetIsDark = (dark: boolean | ((prev: boolean) => boolean)) => {
    const newIsDark = typeof dark === 'function' ? dark(isDark) : dark;
    setIsDark(newIsDark);
    setIsSystemTheme(false);
    saveThemeToStorage(newIsDark, false);
  };

  const handleSetIsSystemTheme = (systemTheme: boolean | ((prev: boolean) => boolean)) => {
    const newIsSystemTheme = typeof systemTheme === 'function' ? systemTheme(isSystemTheme) : systemTheme;
    setIsSystemTheme(newIsSystemTheme);
    
    if (newIsSystemTheme) {
      setIsDark(Appearance.getColorScheme() === 'dark');
    }
    
    saveThemeToStorage(isDark, newIsSystemTheme);
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;  
    setIsDark(newIsDark);
    setIsSystemTheme(false);
    saveThemeToStorage(newIsDark, false);
  };

  const colors = isDark ? DarkColors : LightColors;


  return (
    <ThemeContext.Provider 
      value={{ 
        colors, 
        isDark, 
        setIsDark: handleSetIsDark,
        toggleTheme,
        isSystemTheme,
        setIsSystemTheme: handleSetIsSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
