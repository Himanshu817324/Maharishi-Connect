import { Alert, Linking, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export interface PermissionResult {
  granted: boolean;
  message?: string;
}

export const requestContactsPermission = async (): Promise<PermissionResult> => {
  try {
    console.log('🔐 Requesting contacts permission...');
    
    // Check current permission status
    const currentStatus = await Contacts.checkPermission();
    console.log('📋 Current permission status:', currentStatus);
    
    // If already granted, return success
    if (currentStatus === 'authorized') {
      console.log('✅ Contacts permission already granted');
      return { granted: true };
    }
    
    // Request permission
    const status = await Contacts.requestPermission();
    console.log('📋 Permission request result:', status);
    
    if (status === 'authorized') {
      console.log('✅ Contacts permission granted');
      return { granted: true };
    } else {
      console.log('❌ Contacts permission denied');
      return { 
        granted: false, 
        message: 'Contacts permission is required to find friends on Maharishi Connect' 
      };
    }
  } catch (error) {
    console.error('❌ Error requesting contacts permission:', error);
    return { 
      granted: false, 
      message: 'Failed to request contacts permission' 
    };
  }
};

export const showPermissionAlert = (
  title: string = 'Permission Required',
  message: string = 'Contacts permission is required to find friends on Maharishi Connect. Please enable it in your device settings.',
  onSettingsPress?: () => void
) => {
  Alert.alert(
    title,
    message,
    [
      { 
        text: 'Cancel', 
        style: 'cancel' 
      },
      { 
        text: 'Settings', 
        onPress: () => {
          if (onSettingsPress) {
            onSettingsPress();
          } else {
            // Default behavior - open app settings
            Linking.openSettings().catch(() => {
              console.log('Could not open settings');
            });
          }
        }
      }
    ]
  );
};

export const requestContactsPermissionWithAlert = async (
  showAlert: boolean = true
): Promise<PermissionResult> => {
  const result = await requestContactsPermission();
  
  if (!result.granted && showAlert) {
    showPermissionAlert(
      'Contacts Permission',
      result.message || 'Contacts permission is required to find friends on Maharishi Connect. Please enable it in your device settings.'
    );
  }
  
  return result;
};
