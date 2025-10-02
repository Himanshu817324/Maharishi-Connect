// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_STATE: '@maharishi_connect_auth_state',
  USER_DATA: '@maharishi_connect_user_data',
} as const;

export interface StoredAuthState {
  user: any;
  isLoggedIn: boolean;
  profileCompleted: boolean;
  hasSeenOnboarding: boolean;
}

// Save auth state to AsyncStorage
export const saveAuthState = async (authState: StoredAuthState): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authState));
    console.log('✅ Auth state saved to AsyncStorage');
  } catch (error) {
    console.error('❌ Error saving auth state to AsyncStorage:', error);
  }
};

// Load auth state from AsyncStorage
export const loadAuthState = async (): Promise<StoredAuthState | null> => {
  try {
    const storedState = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      console.log('✅ Auth state loaded from AsyncStorage');
      return parsedState;
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading auth state from AsyncStorage:', error);
    return null;
  }
};

// Clear auth state from AsyncStorage
export const clearAuthState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    console.log('✅ Auth state cleared from AsyncStorage');
  } catch (error) {
    console.error('❌ Error clearing auth state from AsyncStorage:', error);
  }
};

// Save user data separately (for future use)
export const saveUserData = async (userData: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    console.log('✅ User data saved to AsyncStorage');
  } catch (error) {
    console.error('❌ Error saving user data to AsyncStorage:', error);
  }
};

// Load user data separately (for future use)
export const loadUserData = async (): Promise<any | null> => {
  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      console.log('✅ User data loaded from AsyncStorage');
      return parsedData;
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading user data from AsyncStorage:', error);
    return null;
  }
};

// Clear all stored data
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_STATE,
      STORAGE_KEYS.USER_DATA,
    ]);
    console.log('✅ All data cleared from AsyncStorage');
  } catch (error) {
    console.error('❌ Error clearing all data from AsyncStorage:', error);
  }
};
