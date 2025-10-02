import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    ActivityIndicator
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { apiService } from '../../services/apiService';
import { locationsService } from '../../services/locationsService';
import { imageUploadService } from '../../services/imageUploadService';
import { RootState } from '../../store';
import { login } from '../../store/slices/authSlice';
import { LightColors } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';
import ModernDropdown from '../../components/atoms/ui/ModernDropdown';
import { requestContactsPermissionWithAlert } from '../../utils/permissions';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AuthStack'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  console.log("🎯 ProfileScreen loaded!");
  console.log("User data:", user);
  console.log("Is logged in:", useSelector((state: RootState) => state.auth.isLoggedIn));

  // Prefill fields if user data exists
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [selectedCountry, setSelectedCountry] = useState(user?.country || "");
  const [selectedState, setSelectedState] = useState(user?.state || "");
  const [selectedStatus, setSelectedStatus] = useState(user?.status || "");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Image upload state
  const [profileImage, setProfileImage] = useState<string | null>((user as any)?.profilePicture || null);
  const [uploading, setUploading] = useState(false);
  const [uploadTempId, setUploadTempId] = useState<string | null>(null);
  
  // Dynamic location data
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login' as never);
    }
  }, [user, navigation]);

  // Load countries and states from API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        
        // Load countries
        const countriesData = await locationsService.getCountries();
        setCountries(countriesData);
        
        // If user has a pre-selected country, load its states
        if (user?.country) {
          const statesData = await locationsService.getStates(user.country);
          setStates(statesData);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        // Don't show error toast for fallback data
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocations();
  }, [user?.country]);

  if (!user) {
    return null; 
  }

  const { firebaseUid, phone } = user;

  // Image picker functions
  const showImagePicker = () => {
    Alert.alert(
      "Select Profile Picture",
      "Choose how you want to select your profile picture",
      [
        { text: "Camera", onPress: () => openCamera() },
        { text: "Gallery", onPress: () => openImageLibrary() },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2048,
      maxWidth: 2048,
      quality: 0.8 as const,
      cameraType: 'back' as const,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        console.error('Camera error:', response.errorMessage);
        Toast.show({ 
          type: "error", 
          text1: "Camera Error",
          text2: response.errorMessage
        });
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.uri) {
          uploadImage(asset.uri);
        }
      }
    });
  };

  const openImageLibrary = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2048,
      maxWidth: 2048,
      quality: 0.8 as const,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        console.error('Gallery error:', response.errorMessage);
        Toast.show({ 
          type: "error", 
          text1: "Gallery Error",
          text2: response.errorMessage
        });
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.uri) {
          uploadImage(asset.uri);
        }
      }
    });
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);
      
      // Show initial upload status
      Toast.show({ 
        type: "info", 
        text1: "Uploading image...",
        text2: "Please wait"
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
          type: "success", 
          text1: "✅ Image uploaded successfully!",
          text2: "Profile picture ready for signup"
        });
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({ 
        type: "error", 
        text1: "❌ Upload failed",
        text2: error instanceof Error ? error.message : "Please try again"
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
      Toast.show({ type: "error", text1: "Please wait while locations are loading" });
      return;
    }
    
    if (!fullName || !selectedCountry || !selectedState || !selectedStatus) {
      Toast.show({ type: "error", text1: "Please fill all fields" });
      return;
    }

    const formData = {
      firebaseUid,
      isVerified: true,
      fullName,
      mobileNo: phone,
      location: {
        country: selectedCountry,
        state: selectedState
      },
      status: selectedStatus,
      // Send tempId if image was uploaded, otherwise use manual URL
      profilePicture: uploadTempId || profileImage || null,
    };

    try {
      setLoading(true);

      const response = await apiService.signup(formData);

      // Update Redux with latest user info from backend
      if (response && response.user) {
        // Handle location object structure
        const location = response.user.location || { country: selectedCountry, state: selectedState };
        const country = location.country || selectedCountry;
        const state = location.state || selectedState;
        
        dispatch(
          login({
            id: response.user.firebaseUid, // Use firebaseUid as id
            firebaseUid: response.user.firebaseUid,
            phone: response.user.mobileNo,
            isVerified: response.user.isVerified,
            fullName: response.user.fullName,
            avatar: response.user.profilePicture || "https://picsum.photos/200",
            country: country,
            state: state,
            status: response.user.status,
          })
        );
      }

      Toast.show({ type: "success", text1: "Profile saved successfully!" });
      
      // Reset image upload state
      resetImageUpload();
      
      // Request contacts permission after successful profile completion
      try {
        const permissionResult = await requestContactsPermissionWithAlert(false);
        if (permissionResult.granted) {
          // Contacts permission granted
        } else {
          // Contacts permission denied, but proceeding to main app
          Toast.show({
            type: "info",
            text1: "Contacts permission denied",
            text2: "You can enable it later in settings to find friends"
          });
        }
      } catch (error) {
        console.error('❌ Error requesting contacts permission:', error);
      }
      
      navigation.navigate('MainStack' as never);
    } catch (err: unknown) {
      console.error("❌ Profile save error:", err);
      console.error("Error type:", typeof err);
      console.error("Error details:", JSON.stringify(err, null, 2));

      let errorMessage = "Failed to save profile";

      if (err instanceof Error) {
        errorMessage = err.message;
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);

        if (err.message.includes("Network request failed")) {
          errorMessage = "Network error: Please check your internet connection";
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timeout: Please try again";
        } else if (err.message.includes("CORS")) {
          errorMessage = "Server configuration error: Please contact support";
        } else if (err.message.includes("User not found")) {
          errorMessage = "User not found. Please try logging in again.";
        } else if (err.message.includes("Validation")) {
          errorMessage = "Please check all fields are filled correctly";
        }
      }

      Toast.show({ type: "error", text1: "Profile Save Failed", text2: errorMessage });
    } finally {
      setLoading(false);
    }
  };


  const getCountryEmoji = (country: string) => {
    switch(country) {
      case 'India': return '🇮🇳';
      case 'UK': return '🇬🇧';
      case 'USA': return '🇺🇸';
      default: return '🌍';
    }
  };

  const getStateEmoji = (_state: string) => {
    // You can add specific state emojis if needed
    return '📍';
  };

  // Reset state when country changes and load new states
  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    setSelectedState(""); // Reset state when country changes
    
    // Load states for the selected country
    try {
      const statesData = await locationsService.getStates(country);
      setStates(statesData);
    } catch (error) {
      console.error(`Error loading states for ${country}:`, error);
      // Don't show error toast for fallback data
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Let&apos;s set up your account to get started
          </Text>
        </View>

        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <TouchableOpacity 
            style={[styles.imageContainer, uploading && styles.imageContainerDisabled]}
            onPress={showImagePicker}
            disabled={uploading}
          >
            <Image
              source={{ uri: profileImage || "https://picsum.photos/200" }}
              style={styles.profileImage}
            />
            <View style={styles.imageOverlay}>
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : (
                <View style={styles.cameraIconContainer}>
                  <Text style={styles.imageOverlayText}>📷</Text>
                  <Text style={styles.cameraIconText}>Change Photo</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.imageText}>
            {uploading ? "Uploading image..." : "Tap to select profile picture"}
          </Text>
          {profileImage && !uploading && (
            <Text style={styles.imageStatusText}>
              ✅ Image uploaded successfully
            </Text>
          )}
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>👤 Full Name</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'fullName' && styles.inputFocused
              ]}
              placeholder="Enter your full name"
              placeholderTextColor={LightColors.subText}
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedField('fullName')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Country Picker */}
          <ModernDropdown
            label="Country"
            emoji="🌍"
            options={countries.map(country => ({
              label: country,
              value: country,
              emoji: getCountryEmoji(country)
            }))}
            selectedValue={selectedCountry}
            onValueChange={handleCountryChange}
            placeholder="Select your country"
            loading={loadingLocations}
            disabled={loadingLocations}
          />

          {/* State Picker */}
          <ModernDropdown
            label="State/Region"
            emoji="📍"
            options={states.map(state => ({
              label: state,
              value: state,
              emoji: getStateEmoji(state)
            }))}
            selectedValue={selectedState}
            onValueChange={(value) => setSelectedState(value)}
            placeholder={
              loadingLocations 
                ? "Loading states..." 
                : selectedCountry 
                  ? "Select your state/region" 
                  : "Select country first"
            }
            loading={loadingLocations}
            disabled={!selectedCountry || loadingLocations}
          />

          {/* Status Picker */}
          <ModernDropdown
            label="Status"
            emoji="📊"
            options={[
              { label: "Available", value: "Available", emoji: "🟢" },
              { label: "Working", value: "Working", emoji: "💼" },
              { label: "Busy", value: "Busy", emoji: "🔴" },
              { label: "Away", value: "Away", emoji: "⏰" },
            ]}
            selectedValue={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value)}
            placeholder="Select your status"
          />
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.saveButton, (loading || loadingLocations) && styles.saveButtonDisabled]}
          onPress={onSubmit}
          disabled={loading || loadingLocations}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {loadingLocations 
              ? "Loading locations..." 
              : loading 
                ? "Setting up your profile..." 
                : "Complete Setup"
            }
          </Text>
          {!loading && !loadingLocations && <Text style={styles.buttonArrow}>✨</Text>}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by</Text>
          <Text style={styles.brandText}>Maharishi Connect</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: LightColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: LightColors.subText,
    textAlign: 'center',
    lineHeight: 24,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: LightColors.primary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LightColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: LightColors.background,
  },
  imageOverlayText: {
    fontSize: 16,
  },
  imageText: {
    fontSize: 14,
    color: LightColors.subText,
    fontWeight: '600',
  },
  imageStatusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
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
  cameraIconText: {
    color: 'white',
    fontSize: 8,
    marginTop: 1,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: LightColors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: LightColors.card,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: LightColors.text,
    borderWidth: 2,
    borderColor: LightColors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFocused: {
    borderColor: LightColors.primary,
    shadowColor: LightColors.primary,
    shadowOpacity: 0.1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 20,
    backgroundColor: LightColors.background,
  },
  saveButton: {
    backgroundColor: LightColors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LightColors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: LightColors.subText,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: LightColors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  buttonArrow: {
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: LightColors.subText,
    marginBottom: 4,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: LightColors.primary,
  },
});
