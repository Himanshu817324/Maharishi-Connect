import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { lightweightImagePicker } from '@/services/lightweightImagePicker';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { apiService } from '../../services/apiService';
import { locationsService } from '../../services/locationsService';
import { imageUploadService } from '../../services/imageUploadService';
import { RootState } from '../../store';
import { updateUserProfile } from '../../store/slices/authSlice';
import { RootStackParamList } from '../../types/navigation';
import ModernDropdown from '../../components/atoms/ui/ModernDropdown';
import requestContactsPermissionWithAlert from '../../utils/permissions';

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AuthStack'                                                                                                                                                                                                                                                                                                                       
>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  console.log('🎯 ProfileScreen loaded!');
  console.log('User data:', user);
  console.log(
    'Is logged in:',
    useSelector((state: RootState) => state.auth.isLoggedIn),
  );

  // Prefill fields if user data exists
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [selectedCountry, setSelectedCountry] = useState(user?.country || 'India');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Image upload state
  const [profileImage, setProfileImage] = useState<string | null>(
    (user as any)?.profilePicture || null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadTempId, setUploadTempId] = useState<string | null>(null);

  // Dynamic location data
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Generate initials from full name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login' as never);
    }
  }, [user, navigation]);

  // Load countries from API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);

        // Load countries
        const countriesData = await locationsService.getCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading locations:', error);
        // Don't show error toast for fallback data
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocations();
  }, []);

  if (!user) {
    return null;
  }

  const { firebaseUid, phone } = user;

  // Image picker functions
  const showImagePicker = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to select your profile picture',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openImageLibrary() },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const openCamera = async () => {
    try {
      const result = await lightweightImagePicker.takePhoto();
      
      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        uploadImage(file.uri);
      } else if (result.error) {
        Toast.show({
          type: 'error',
          text1: 'Camera Error',
          text2: result.error,
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to access camera',
      });
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await lightweightImagePicker.pickImages(1);
      
      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        uploadImage(file.uri);
      } else if (result.error) {
        Toast.show({
          type: 'error',
          text1: 'Gallery Error',
          text2: result.error,
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Toast.show({
        type: 'error',
        text1: 'Gallery Error',
        text2: 'Failed to access gallery',
      });
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);

      // Show initial upload status
      Toast.show({
        type: 'info',
        text1: 'Uploading image...',
        text2: 'Please wait',
      });

      // Upload image and get tempId for signup
      const result = await imageUploadService.uploadImageForSignup(imageUri);

      if (result.success) {
        // Set tempId if available
        if (result.tempId) {
          setUploadTempId(result.tempId);
        }

        // Use uploaded image URL for preview if available, otherwise use local URI
        setProfileImage(result.imageUrl || result.url || imageUri);

        Toast.show({
          type: 'success',
          text1: '✅ Image uploaded successfully!',
          text2: 'Profile picture ready for signup',
        });
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: '❌ Upload failed',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
      // Reset image upload state on error
      resetImageUpload();
    } finally {
      setUploading(false);
    }
  };

  // Reset image upload state
  const resetImageUpload = () => {
    setUploadTempId(null);
    setProfileImage(null);
  };

  // Save Profile Logic
  const onSubmit = async () => {
    if (loadingLocations) {
      Toast.show({
        type: 'error',
        text1: 'Please wait while locations are loading',
      });
      return;
    }

    if (!fullName || !selectedCountry) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }

    const formData = {
      firebaseUid,
      isVerified: true,
      fullName,
      mobileNo: phone,
      location: {
        country: selectedCountry,
        state: 'UP', // Dummy data
      },
      status: 'Working', // Dummy data
      // Send tempId if image was uploaded, otherwise use manual URL
      profilePicture: uploadTempId || profileImage || null,
    };

    try {
      setLoading(true);

      const response = await apiService.signup(formData);

      // Update Redux with latest user info from backend
      if (response && response.user) {
        console.log('📝 API Response received:', response);
        console.log('📝 User data from API:', response.user);

        // Handle location object structure from API response
        const location = response.user.location || {
          country: selectedCountry,
          state: 'UP', // Dummy data
        };
        const country = location.country || selectedCountry;
        const state = location.state || 'UP'; // Dummy data

        // Prepare user data for Redux store
        const userData = {
          fullName: response.user.fullName,
          avatar: response.user.profilePicture || null, // Will use initials if null
          country: country,
          state: state,
          status: 'Working', // Dummy data
          isVerified: response.user.isVerified,
          profileCompleted: true, // Mark profile as completed
          token: response.token, // Store the JWT token
        };

        console.log('📝 Updating Redux with user data:', userData);

        // Use updateUserProfile to update existing user data
        dispatch(updateUserProfile(userData));
      }

      Toast.show({ type: 'success', text1: 'Profile saved successfully!' });

      // Reset image upload state
      resetImageUpload();

      // Request contacts permission after successful profile completion
      try {
        const permissionResult = await requestContactsPermissionWithAlert.requestContactsPermission();
        if (permissionResult.granted) {
          // Contacts permission granted
        } else {
          // Contacts permission denied, but proceeding to main app
          Toast.show({
            type: 'info',
            text1: 'Contacts permission denied',
            text2: 'You can enable it later in settings to find friends',
          });
        }
      } catch (error) {
        console.error('❌ Error requesting contacts permission:', error);
      }

      navigation.navigate('MainStack' as never);
    } catch (err: unknown) {
      console.error('❌ Profile save error:', err);
      console.error('Error type:', typeof err);
      console.error('Error details:', JSON.stringify(err, null, 2));

      let errorMessage = 'Failed to save profile';

      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);

        if (err.message.includes('Network request failed')) {
          errorMessage = 'Network error: Please check your internet connection';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timeout: Please try again';
        } else if (err.message.includes('CORS')) {
          errorMessage = 'Server configuration error: Please contact support';
        } else if (err.message.includes('User not found')) {
          errorMessage = 'User not found. Please try logging in again.';
        } else if (err.message.includes('Validation')) {
          errorMessage = 'Please check all fields are filled correctly';
        }
      }

      Toast.show({
        type: 'error',
        text1: 'Profile Save Failed',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getCountryEmoji = (country: string) => {
    switch (country) {
      case 'India':
        return '🇮🇳';
      case 'UK':
        return '🇬🇧';
      case 'USA':
        return '🇺🇸';
      default:
        return '🌍';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.content}>
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Profile Image Section */}
          <TouchableOpacity
            style={[
              styles.imageContainer,
              uploading && styles.imageContainerDisabled,
            ]}
            onPress={showImagePicker}
            disabled={uploading}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.initialsContainer}>
                <Text style={styles.initialsText}>{getInitials(fullName)}</Text>
              </View>
            )}
            <View style={styles.imageOverlay}>
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : (
                <View style={styles.cameraIconContainer}>
                  <Text style={styles.imageOverlayText}>📷</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Username Input */}
          <TextInput
            style={[
              styles.input,
              focusedField === 'fullName' && styles.inputFocused,
            ]}
            placeholder="Username"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
            onFocus={() => setFocusedField('fullName')}
            onBlur={() => setFocusedField(null)}
          />

          {/* Country Picker */}
          <ModernDropdown
            label=""
            emoji=""
            options={countries.map(country => ({
              label: country,
              value: country,
              emoji: getCountryEmoji(country),
            }))}
            selectedValue={selectedCountry}
            onValueChange={setSelectedCountry}
            placeholder="Country"
            loading={loadingLocations}
            disabled={loadingLocations}
          />
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (loading || loadingLocations) && styles.saveButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={loading || loadingLocations}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loadingLocations
                ? 'Loading locations...'
                : loading
                ? 'Setting up your profile...'
                : 'CONTINUE'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
  },
  initialsContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  imageOverlayText: {
    fontSize: 16,
  },
  imageContainerDisabled: {
    opacity: 0.6,
  },
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  cameraIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: '#8B5CF6',
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 20,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
