// Firebase TypeScript declarations for better type safety

declare module '@react-native-firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: any;
  }

  export function initializeApp(config: FirebaseConfig): FirebaseApp;
}

declare module '@react-native-firebase/messaging' {
  export interface FirebaseMessagingTypes {
    Module: {
      getToken(): Promise<string>;
      requestPermission(): Promise<AuthorizationStatus>;
      onMessage(callback: (message: RemoteMessage) => void): () => void;
      onNotificationOpenedApp(callback: (message: RemoteMessage) => void): () => void;
      getInitialNotification(): Promise<RemoteMessage | null>;
      subscribeToTopic(topic: string): Promise<void>;
      unsubscribeFromTopic(topic: string): Promise<void>;
      onTokenRefresh(callback: (token: string) => void): () => void;
    };

    RemoteMessage: {
      notification?: {
        title?: string;
        body?: string;
      };
      data: Record<string, string>;
      from?: string;
    };

    AuthorizationStatus: {
      AUTHORIZED: number;
      PROVISIONAL: number;
      DENIED: number;
    };
  }

  const messaging: () => FirebaseMessagingTypes.Module;
  export default messaging;
}

declare module '@react-native-firebase/analytics' {
  export interface FirebaseAnalyticsTypes {
    Module: {
      logEvent(eventName: string, parameters?: Record<string, any>): Promise<void>;
      setUserId(userId: string): Promise<void>;
      setUserProperty(name: string, value: string): Promise<void>;
    };
  }

  const analytics: () => FirebaseAnalyticsTypes.Module;
  export default analytics;
}

// Firebase configuration interface
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  webAppId: string;
  measurementId: string;
}
