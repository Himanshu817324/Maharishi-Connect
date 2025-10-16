import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import CustomHeader from '@/components/atoms/ui/CustomHeader';
import { RootState } from '@/store';
import { updateUserProfile } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { imageUploadService } from '@/services/imageUploadService';
import { lightweightImagePicker } from '@/services/lightweightImagePicker';
import { locationsService } from '@/services/locationsService';
import Toast from 'react-native-toast-message';
import ModernDropdown from '@/components/atoms/ui/ModernDropdown';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [selectedCountry, setSelectedCountry] = useState(user?.country || '');
  const [selectedState, setSelectedState] = useState(user?.state || '');
  const [selectedStatus, setSelectedStatus] = useState(user?.status || '');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Image upload state
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profilePicture || user?.avatar || null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadTempId, setUploadTempId] = useState<string | null>(null);

  // Dynamic location data
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Load countries and states from API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        const countriesData = await locationsService.getCountries();
        setCountries(countriesData);

        if (user?.country) {
          const statesData = await locationsService.getStates(user.country);
          setStates(statesData);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        // Use fallback data
        setCountries([
          'India',
          'United States',
          'United Kingdom',
          'Canada',
          'Australia',
        ]);
        setStates(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata']);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocations();
  }, [user?.country]);

  // Fetch fresh profile data if needed
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id || !user?.token) {
        return;
      }

      // Check if we need to fetch fresh data (missing profile data)
      const needsRefresh =
        !user.fullName || !user.country || !user.state || !user.status;

      if (!needsRefresh) {
        console.log(
          '📱 EditProfileScreen - Profile data is complete, no need to fetch',
        );
        return;
      }

      try {
        console.log(
          '📱 EditProfileScreen - Fetching fresh profile data from server...',
        );

        const profileData = await apiService.getUserProfile(
          user.id,
          user.token,
        );
        console.log(
          '📱 EditProfileScreen - Profile API response:',
          profileData,
        );

        if (profileData.user || profileData.data) {
          const userProfile = profileData.user || profileData.data;
          const location = userProfile.location || {};

          console.log('📱 EditProfileScreen - Extracted user profile:', {
            fullName: userProfile.fullName,
            country: location.country,
            state: location.state,
            status: userProfile.status,
            profilePicture: userProfile.profilePicture,
          });

          // Update form state with fresh data
          setFullName(userProfile.fullName || user.fullName || '');
          setSelectedCountry(location.country || user.country || '');
          setSelectedState(location.state || user.state || '');
          setSelectedStatus(userProfile.status || user.status || '');
          setProfileImage(
            userProfile.profilePicture ||
              user.profilePicture ||
              user.avatar ||
              null,
          );

          console.log(
            '✅ EditProfileScreen - Form state updated with fresh data',
          );
        } else {
          console.log(
            '⚠️ EditProfileScreen - No user profile data found in API response',
          );
        }
      } catch (error) {
        console.error(
          '❌ EditProfileScreen - Error fetching user profile:',
          error,
        );
        // Don't show error to user, just log it - they can still edit with cached data
      }
    };

    fetchProfileData();
  }, [user]);

  const openImageLibrary = async () => {
    try {
      console.log('🖼️ Opening image library...');
      setUploading(true);
      const result = await lightweightImagePicker.pickImages(1);

      console.log('🖼️ Image picker result:', result);

      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        console.log('🖼️ Selected file:', file);
        uploadImage(file.uri);
      } else if (result.error) {
        console.error('🖼️ Gallery error:', result.error);
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
    } finally {
      setUploading(false);
    }
  };

  const openCamera = async () => {
    try {
      console.log('📷 Opening camera...');
      const result = await lightweightImagePicker.takePhoto();

      console.log('📷 Camera result:', result);

      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        console.log('📷 Captured file:', file);
        uploadImage(file.uri);
      } else if (result.error) {
        console.error('📷 Camera error:', result.error);
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

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);

      // Show initial upload status
      Toast.show({
        type: 'info',
        text1: 'Uploading image...',
        text2: 'Please wait',
      });

      // Upload image
      const uploadResult = await imageUploadService.uploadProfileImage(
        imageUri,
        user?.id || '',
      );

      if (uploadResult.success) {
        setProfileImage(uploadResult.imageUrl || uploadResult.url || imageUri);
        setUploadTempId(uploadResult.tempId || null);

        Toast.show({
          type: 'success',
          text1: '✅ Image uploaded successfully!',
          text2: 'Profile picture updated',
        });
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: '❌ Upload failed',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImagePicker = () => {
    console.log('🖼️ Image picker button pressed');
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to add a profile picture',
      [
        {
          text: 'Camera',
          onPress: () => {
            console.log('📷 Camera option selected');
            openCamera();
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            console.log('🖼️ Gallery option selected');
            openImageLibrary();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    setSelectedState(''); // Reset state when country changes

    try {
      const statesData = await locationsService.getStates(country);
      setStates(statesData);
    } catch (error) {
      console.error(`Error loading states for ${country}:`, error);
      // Use fallback data
      setStates(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata']);
    }
  };

  const onSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    // Validate full name length (assuming similar validation as state)
    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'Full name must be at least 2 characters long');
      return;
    }

    if (fullName.trim().length > 100) {
      Alert.alert(
        'Error',
        'Full name must be no more than 100 characters long',
      );
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Error', 'Please select your country');
      return;
    }

    // Validate state field if provided (must be 2-50 characters)
    if (selectedState && selectedState.trim().length < 2) {
      Alert.alert('Error', 'State must be at least 2 characters long');
      return;
    }

    if (selectedState && selectedState.trim().length > 50) {
      Alert.alert('Error', 'State must be no more than 50 characters long');
      return;
    }

    // Validate status field if provided
    if (selectedStatus && selectedStatus.trim().length > 100) {
      Alert.alert('Error', 'Status must be no more than 100 characters long');
      return;
    }

    try {
      setLoading(true);

      const profileData = {
        fullName: fullName.trim(),
        country: selectedCountry,
        state: selectedState,
        status: selectedStatus,
        profilePicture: uploadTempId,
      };

      // Prepare data for API call - only include fields that have values
      const apiData: any = {};

      if (profileData.fullName && profileData.fullName.trim()) {
        apiData.fullName = profileData.fullName.trim();
      }

      if (profileData.status && profileData.status.trim()) {
        apiData.status = profileData.status.trim();
      }

      if (profileData.country && profileData.country.trim()) {
        apiData.location = {
          country: profileData.country.trim(),
        };

        // Only include state if it has a valid value (2+ characters)
        if (
          profileData.state &&
          profileData.state.trim() &&
          profileData.state.trim().length >= 2
        ) {
          apiData.location.state = profileData.state.trim();
        }
      }

      if (profileData.profilePicture && profileData.profilePicture.trim()) {
        apiData.profilePicture = profileData.profilePicture.trim();
      }

      // Check if we have at least one field to update
      if (Object.keys(apiData).length === 0) {
        Alert.alert('Error', 'Please fill in at least one field to update');
        return;
      }

      // Ensure we have required fields for validation
      if (!apiData.fullName) {
        Alert.alert('Error', 'Full name is required');
        return;
      }

      console.log(
        '📝 [EditProfileScreen] Sending API data:',
        JSON.stringify(apiData, null, 2),
      );
      console.log(
        '📝 [EditProfileScreen] Profile data before API call:',
        profileData,
      );

      // Update profile via API
      const response = await apiService.updateUserProfile(apiData);

      console.log('✅ [EditProfileScreen] API response:', response);

      // Handle both response.user and response.data structures
      const userData = response.user || response.data;

      if (response.status === 'SUCCESS' && userData) {
        console.log(
          '✅ [EditProfileScreen] Profile update successful, updating Redux store...',
        );
        console.log('✅ [EditProfileScreen] API response user data:', userData);

        // Handle location object structure from API response
        const location = userData.location || {};
        const country = location.country || userData.country;
        const state = location.state || userData.state;

        // Update Redux store with the updated user data from API
        dispatch(
          updateUserProfile({
            fullName: userData.fullName,
            country: country,
            state: state,
            status: userData.status,
            profilePicture: userData.profilePicture,
            avatar: userData.profilePicture, // Also update avatar field for consistency
          }),
        );

        console.log(
          '✅ [EditProfileScreen] Redux store updated, showing success message...',
        );

        Toast.show({
          type: 'success',
          text1: 'Profile updated successfully',
        });

        console.log(
          '✅ [EditProfileScreen] Waiting for Redux state to update...',
        );
        // Add a small delay to ensure Redux state is properly updated
        setTimeout(() => {
          console.log('✅ [EditProfileScreen] Navigating back...');
          navigation.goBack();
        }, 100);
      } else {
        console.error(
          '❌ [EditProfileScreen] Profile update failed:',
          response,
        );
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);

      // Show more specific error messages
      let errorMessage = 'Failed to update profile. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('State must be between 2-50 characters')) {
          errorMessage =
            'State must be between 2-50 characters. Please check your state field.';
        } else if (error.message.includes('Full name must be between')) {
          errorMessage =
            'Full name must be between 2-100 characters. Please check your name.';
        } else if (error.message.includes('Authentication token not found')) {
          errorMessage = 'Please log in again to update your profile.';
        } else if (error.message.includes('Invalid input data')) {
          errorMessage = 'Please check all fields and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <CustomHeader
        title="Edit Profile"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={[
              styles.imageContainer,
              uploading && styles.imageContainerDisabled,
            ]}
            onPress={handleImagePicker}
            disabled={uploading}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View
                style={[
                  styles.imagePlaceholder,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Icon name="camera" size={moderateScale(30)} color="#FFFFFF" />
              </View>
            )}

            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}

            <View style={styles.editIconContainer}>
              <Icon name="camera" size={moderateScale(16)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.imageLabel, { color: colors.text }]}>
            {uploading ? 'Uploading...' : 'Tap to change photo'}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Full Name
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor:
                    focusedField === 'fullName' ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                },
              ]}
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedField('fullName')}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Country Picker */}
          <ModernDropdown
            label="Country"
            emoji="🌍"
            options={countries.map(country => ({
              label: country,
              value: country,
              emoji: '🏳️',
            }))}
            selectedValue={selectedCountry}
            onValueChange={handleCountryChange}
            placeholder="Select your country"
            loading={loadingLocations}
          />

          {/* State Picker */}
          <ModernDropdown
            label="State/Region"
            emoji="📍"
            options={states.map(state => ({
              label: state,
              value: state,
              emoji: '🏛️',
            }))}
            selectedValue={selectedState}
            onValueChange={value => setSelectedState(value)}
            placeholder={
              selectedCountry
                ? 'Select your state/region'
                : 'Select country first'
            }
            loading={loadingLocations}
            disabled={!selectedCountry || loadingLocations}
          />

          {/* Status Picker */}
          <ModernDropdown
            label="Status"
            emoji="📊"
            options={[
              { label: 'Available', value: 'Available', emoji: '🟢' },
              { label: 'Working', value: 'Working', emoji: '💼' },
              { label: 'Busy', value: 'Busy', emoji: '🔴' },
              { label: 'Away', value: 'Away', emoji: '⏰' },
            ]}
            selectedValue={selectedStatus}
            onValueChange={value => setSelectedStatus(value)}
            placeholder="Select your status"
          />
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent },
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
              ? 'Updating profile...'
              : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  imageContainerDisabled: {
    opacity: 0.6,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: responsiveFont(16),
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
});
