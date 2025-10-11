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
import ModernDropdown from '@/components/atoms/ui/ModernDropdown';
import Toast from 'react-native-toast-message';

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
    (user as any)?.profilePicture || null,
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
        setCountries(['India', 'United States', 'United Kingdom', 'Canada', 'Australia']);
        setStates(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata']);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocations();
  }, [user?.country]);

  const handleImagePicker = async () => {
    try {
      setUploading(true);
      const result = await lightweightImagePicker.pickImage();
      
      if (result && result.uri) {
        setProfileImage(result.uri);
        
        // Upload image
        const uploadResult = await imageUploadService.uploadImage(result.uri, 'profile');
        if (uploadResult.success) {
          setUploadTempId(uploadResult.tempId);
          Toast.show({
            type: 'success',
            text1: 'Image uploaded successfully',
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to upload image',
      });
    } finally {
      setUploading(false);
    }
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

    if (!selectedCountry) {
      Alert.alert('Error', 'Please select your country');
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

      // Update profile via API
      const response = await apiService.updateUserProfile(user?.id!, profileData);
      
      if (response.success) {
        // Update Redux store
        dispatch(updateUserProfile({
          fullName: profileData.fullName,
          country: profileData.country,
          state: profileData.state,
          status: profileData.status,
          profilePicture: profileData.profilePicture,
        }));

        Toast.show({
          type: 'success',
          text1: 'Profile updated successfully',
        });

        // Navigate back
        navigation.goBack();
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
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
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.accent }]}>
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
            <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.textInput,
                { 
                  borderColor: focusedField === 'fullName' ? colors.accent : colors.border,
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
              emoji: '🏳️' 
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
              emoji: '🏛️' 
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
