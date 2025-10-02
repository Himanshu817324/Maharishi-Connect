// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { saveAuthState, clearAuthState } from "../../utils/storage";

export interface AuthUser {
  id: string;
  firebaseUid: string;
  phone: string;
  isVerified: boolean;
  name?: string;
  fullName?: string;
  avatar?: string;
  country?: string;
  state?: string;
  status?: string;
  token?: string; // Added for API token
  isNewUser?: boolean; // Added to track new users
  profileCompleted?: boolean; // Added to track profile completion
}

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  profileCompleted: boolean;
  hasSeenOnboarding: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  profileCompleted: false,
  hasSeenOnboarding: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<AuthUser>) => {
      console.log('🔄 [login] Login action called');
      console.log('🔄 [login] Current state.user:', state.user);
      console.log('🔄 [login] Action payload:', action.payload);
      
      state.user = { ...state.user, ...action.payload };
      state.isLoggedIn = true;
      
      // If it's not a new user, profile is considered complete
      // Also check if user has profile data (fullName, country, state, status)
      const hasProfileData = action.payload.fullName && action.payload.country && action.payload.state && action.payload.status;
      state.profileCompleted = !action.payload.isNewUser || hasProfileData;
      
      console.log('🔄 [login] Updated state.user:', state.user);
      console.log('🔄 [login] Profile completed:', state.profileCompleted);
      console.log('🔄 [login] Profile data check:', {
        fullName: action.payload.fullName,
        country: action.payload.country,
        state: action.payload.state,
        status: action.payload.status,
        isNewUser: action.payload.isNewUser,
        hasAllData: hasProfileData
      });

      // Save to AsyncStorage
      saveAuthState({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        profileCompleted: state.profileCompleted,
        hasSeenOnboarding: state.hasSeenOnboarding,
      });
      
      console.log('🔄 [login] Data saved to AsyncStorage');
    },
    logout: (state) => {
      state.user = null;
      state.isLoggedIn = false;
      state.profileCompleted = false;
      // Keep hasSeenOnboarding true even after logout

      // Clear from AsyncStorage
      clearAuthState();
    },
    // New action to restore state from AsyncStorage
    restoreAuthState: (state, action: PayloadAction<{ user: AuthUser; isLoggedIn: boolean; profileCompleted: boolean; hasSeenOnboarding: boolean }>) => {
      console.log('🔄 [restoreAuthState] Restoring auth state from AsyncStorage');
      console.log('🔄 [restoreAuthState] Payload user:', action.payload.user);
      console.log('🔄 [restoreAuthState] Payload profileCompleted:', action.payload.profileCompleted);
      
      state.user = action.payload.user;
      state.isLoggedIn = action.payload.isLoggedIn;
      state.profileCompleted = action.payload.profileCompleted;
      state.hasSeenOnboarding = action.payload.hasSeenOnboarding;
      
      console.log('🔄 [restoreAuthState] State restored successfully');
      console.log('🔄 [restoreAuthState] Final state.user:', state.user);
    },
    // Action to mark onboarding as seen
    setOnboardingSeen: (state) => {
      state.hasSeenOnboarding = true;

      // Save to AsyncStorage
      saveAuthState({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        profileCompleted: state.profileCompleted,
        hasSeenOnboarding: true,
      });
    },
    // Action to update user profile data
    updateUserProfile: (state, action: PayloadAction<Partial<AuthUser>>) => {
      console.log('🔄 [updateUserProfile] Current state.user:', state.user);
      console.log('🔄 [updateUserProfile] Action payload:', action.payload);
      
      if (state.user) {
        // Ensure we have a complete user object structure
        const updatedUser = {
          ...state.user,
          ...action.payload,
        };
        
        // Merge the new data with existing user data
        state.user = updatedUser;
        
        console.log('🔄 [updateUserProfile] Updated state.user:', state.user);
        
        // Check if profile is now complete
        const hasProfileData = state.user.fullName && state.user.country && state.user.state && state.user.status;
        state.profileCompleted = hasProfileData;
        
        console.log('🔄 [updateUserProfile] Profile completed:', state.profileCompleted);
        console.log('🔄 [updateUserProfile] Profile data check:', {
          fullName: state.user.fullName,
          country: state.user.country,
          state: state.user.state,
          status: state.user.status,
          hasAllData: hasProfileData
        });

        // Save to AsyncStorage
        saveAuthState({
          user: state.user,
          isLoggedIn: state.isLoggedIn,
          profileCompleted: state.profileCompleted,
          hasSeenOnboarding: state.hasSeenOnboarding,
        });
        
        console.log('🔄 [updateUserProfile] Data saved to AsyncStorage');
      } else {
        console.error('❌ [updateUserProfile] No user in state, cannot update profile');
      }
    },
  },
});

export const { login, logout, restoreAuthState, setOnboardingSeen, updateUserProfile } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsLoggedIn = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectProfileCompleted = (state: { auth: AuthState }) => state.auth.profileCompleted;
export const selectHasSeenOnboarding = (state: { auth: AuthState }) => state.auth.hasSeenOnboarding;

export default authSlice.reducer;
