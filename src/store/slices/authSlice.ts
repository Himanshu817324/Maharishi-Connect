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
      state.user = { ...state.user, ...action.payload };
      state.isLoggedIn = true;
      // If it's not a new user, profile is considered complete
      state.profileCompleted = !action.payload.isNewUser;

      // Save to AsyncStorage
      saveAuthState({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        profileCompleted: state.profileCompleted,
        hasSeenOnboarding: state.hasSeenOnboarding,
      });
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
      state.user = action.payload.user;
      state.isLoggedIn = action.payload.isLoggedIn;
      state.profileCompleted = action.payload.profileCompleted;
      state.hasSeenOnboarding = action.payload.hasSeenOnboarding;
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
  },
});

export const { login, logout, restoreAuthState, setOnboardingSeen } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsLoggedIn = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectProfileCompleted = (state: { auth: AuthState }) => state.auth.profileCompleted;
export const selectHasSeenOnboarding = (state: { auth: AuthState }) => state.auth.hasSeenOnboarding;

export default authSlice.reducer;
