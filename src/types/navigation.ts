import {NavigatorScreenParams} from '@react-navigation/native'; 

// -------- Onboarding Stack --------
export type OnboardingStackParamList = {
  OnboardingScreen: undefined;
};


export type AuthStackParamList = {
  LoginScreen: undefined;
  OTPScreen: {
    verificationId: string;
    phoneNumber: string;
  };
  ProfileScreen: undefined;
};


// -------- Main Tab Stack --------
export type TabStackParamList = {
  Chat: undefined;
  Calls: undefined;
  Updates: undefined;
  Settings: undefined;
};

// -------- Main Stack --------
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<TabStackParamList>;
  ConversationScreen: undefined;
  FilteredContactsScreen: undefined;
  UserInfoScreen: undefined;
  // EditProfileScreen: undefined;
};

// -------- Root Stack --------
export type RootStackParamList = {
  SplashScreen: undefined;
  OnboardingStack: NavigatorScreenParams<OnboardingStackParamList>;
  MainStack: NavigatorScreenParams<MainStackParamList>;
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  NotFoundScreen: undefined;
};
