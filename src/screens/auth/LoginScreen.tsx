import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from '../../config/firebase';
import { PhoneAuthProvider } from '@react-native-firebase/auth';
import React, { useState, useRef, useEffect } from 'react';
import { PhoneAuthProvider } from '@react-native-firebase/auth';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  Modal,
  Animated,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../types/navigation';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { apiService } from '../../services/apiService';
import { login } from '../../store/slices/authSlice';
import { permissionManager } from '../../utils/permissions';

const countries = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
];
import { useDispatch } from 'react-redux';
import { apiService } from '../../services/apiService';
import { login } from '../../store/slices/authSlice';
import { permissionManager } from '../../utils/permissions';

const countries = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
];

const LoginScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const dispatch = useDispatch();

  const [selectedCountry, setSelectedCountry] = useState('India');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const dispatch = useDispatch();

  const [selectedCountry, setSelectedCountry] = useState('India');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [normalizedPhone, setNormalizedPhone] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [normalizedPhone, setNormalizedPhone] = useState<string>('');

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const otpAnim = useRef(new Animated.Value(0)).current;
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const otpAnim = useRef(new Animated.Value(0)).current;

  // Get current country code
  const getCurrentCountryCode = () => {
    const country = countries.find(c => c.name === selectedCountry);
    return country?.code || '+91';
  };

  // Timer effect for OTP resend
  // Get current country code
  const getCurrentCountryCode = () => {
    const country = countries.find(c => c.name === selectedCountry);
    return country?.code || '+91';
  };

  // Timer effect for OTP resend
  useEffect(() => {
    if (otpSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpSent, timer]);

  // OTP Animation effect
  useEffect(() => {
    if (otpSent) {
      Animated.timing(otpAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(otpAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [otpSent, otpAnim]);

  // OTP Handling Functions
  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // OTP Verification Logic
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');

    if (!otpString || otpString.length !== 6) {
      Toast.show({ type: 'error', text1: 'Please enter complete OTP' });
      return;
    }

    if (!verificationId) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: 'Please go back and request OTP again',
      });
      return;
    }

    if (!normalizedPhone) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: 'Phone number is required',
      });
      return;
    }

    try {
      setOtpLoading(true);

      const credential = PhoneAuthProvider.credential(verificationId, otpString);
      const userCredential = await auth().signInWithCredential(credential);

      if (!userCredential) {
        throw new Error('OTP verification failed');
      }

      const firebaseUid = userCredential.user.uid;
      const mobileNo = normalizedPhone.replace(/^\+91/, '');
      const data = await apiService.login(mobileNo);

      console.log('🔐 [LoginScreen] Login response:', data);

      // Handle user login logic
      if (!data.isNewUser && data.token) {
        try {
          console.log('🔐 [LoginScreen] Fetching complete user profile...');
          const profileData = await apiService.getUserProfile(firebaseUid, data.token);
          console.log('🔐 [LoginScreen] Profile data received:', profileData);

          const userProfile = profileData.user || profileData.data;

          if (userProfile) {
            const location = userProfile.location || {};
            const country = location.country || '';
            const state = location.state || '';

            dispatch(
              login({
                id: firebaseUid,
                firebaseUid,
                phone: mobileNo,
                isVerified: true,
                isNewUser: data.isNewUser,
                profileCompleted: true,
                token: data.token,
                fullName: userProfile.fullName || '',
                avatar: userProfile.profilePicture || '',
                country: country,
                state: state,
                status: userProfile.status || '',
              }),
            );
          } else {
            dispatch(
              login({
                id: firebaseUid,
                firebaseUid,
                phone: mobileNo,
                isVerified: true,
                isNewUser: data.isNewUser,
                profileCompleted: !data.isNewUser,
                token: data.token,
              }),
            );
          }
        } catch (profileError) {
          console.error('❌ [LoginScreen] Error fetching profile data:', profileError);
          dispatch(
            login({
              id: firebaseUid,
              firebaseUid,
              phone: mobileNo,
              isVerified: true,
              isNewUser: data.isNewUser,
              profileCompleted: !data.isNewUser,
              token: data.token,
            }),
          );
        }
      } else {
        dispatch(
          login({
            id: firebaseUid,
            firebaseUid,
            phone: mobileNo,
            isVerified: true,
            isNewUser: data.isNewUser,
            profileCompleted: !data.isNewUser,
            token: data.token,
          }),
        );
      }

      if (data.isNewUser) {
        navigation.navigate('AuthStack', { screen: 'ProfileScreen' });
      } else {
        // Request contacts permission for existing users
        console.log('🔐 Requesting contacts permission for existing user...');
        try {
          const permissionResult = await permissionManager.requestContactsPermission();
          if (permissionResult.granted) {
            console.log('✅ Contacts permission granted for existing user');
          } else {
            console.log('⚠️ Contacts permission denied for existing user');
            Toast.show({
              type: 'info',
              text1: 'Contacts permission denied',
              text2: 'You can enable it later in settings to find friends',
            });
          }
        } catch (permissionError) {
          console.error('❌ Error requesting contacts permission for existing user:', permissionError);
        }
      }
    } catch (err: any) {
      const safeError = {
        message: err?.message || String(err),
        code: err?.code || 'UNKNOWN',
        name: err?.name || 'Error',
        phone: normalizedPhone,
        otpLength: otpString.length,
        verificationId,
        stack: err?.stack || null,
      };

      // Handle API "User not found" case
      if (safeError.message.includes('User not found')) {
        const firebaseUid = auth().currentUser?.uid;
        const mobileNo = normalizedPhone.replace(/^\+91/, '');

        dispatch(
          login({
            id: firebaseUid || '',
            firebaseUid: firebaseUid || '',
            phone: mobileNo,
            isVerified: true,
            isNewUser: true,
            profileCompleted: false,
          }),
        );

        Toast.show({
          type: 'info',
          text1: 'Welcome! Please complete your profile.',
        });
        navigation.navigate('AuthStack', { screen: 'ProfileScreen' });
        return;
      }

      let errorMessage = 'Failed to verify OTP';
      if (safeError.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (safeError.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please request a new one.';
      } else if (safeError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (safeError.code === 'auth/credential-already-in-use') {
        errorMessage = 'This phone number is already in use.';
      }

      console.error('❌ [LoginScreen] OTP verification error:', safeError);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: errorMessage,
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP Logic
  const handleResendOtp = async () => {
    if (!normalizedPhone) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Phone number not found',
      });
      return;
    }

    try {
      setResendLoading(true);
      console.log('🔄 [LoginScreen] Resending OTP to:', normalizedPhone);

      const confirmation = await auth().signInWithPhoneNumber(normalizedPhone);
      setVerificationId(confirmation.verificationId || '');
      setTimer(30);
      setOtp(['', '', '', '', '', '']);

      Toast.show({
        type: 'success',
        text1: 'OTP Resent',
        text2: `New verification code sent to ${normalizedPhone}`,
      });
    } catch (resendError: any) {
      console.error('❌ [LoginScreen] Error resending OTP:', resendError);
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: resendError.message || 'Please try again',
      });
    } finally {
      setResendLoading(false);
    if (otpSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpSent, timer]);

  // OTP Animation effect
  useEffect(() => {
    if (otpSent) {
      Animated.timing(otpAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(otpAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [otpSent, otpAnim]);

  // OTP Handling Functions
  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // OTP Verification Logic
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');

    if (!otpString || otpString.length !== 6) {
      Toast.show({ type: 'error', text1: 'Please enter complete OTP' });
      return;
    }

    if (!verificationId) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: 'Please go back and request OTP again',
      });
      return;
    }

    if (!normalizedPhone) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: 'Phone number is required',
      });
      return;
    }

    try {
      setOtpLoading(true);

      const credential = PhoneAuthProvider.credential(verificationId, otpString);
      const userCredential = await auth().signInWithCredential(credential);

      if (!userCredential) {
        throw new Error('OTP verification failed');
      }

      const firebaseUid = userCredential.user.uid;
      const mobileNo = normalizedPhone.replace(/^\+91/, '');
      const data = await apiService.login(mobileNo);

      console.log('🔐 [LoginScreen] Login response:', data);

      // Handle user login logic
      if (!data.isNewUser && data.token) {
        try {
          console.log('🔐 [LoginScreen] Fetching complete user profile...');
          const profileData = await apiService.getUserProfile(firebaseUid, data.token);
          console.log('🔐 [LoginScreen] Profile data received:', profileData);

          const userProfile = profileData.user || profileData.data;

          if (userProfile) {
            const location = userProfile.location || {};
            const country = location.country || '';
            const state = location.state || '';

            dispatch(
              login({
                id: firebaseUid,
                firebaseUid,
                phone: mobileNo,
                isVerified: true,
                isNewUser: data.isNewUser,
                profileCompleted: true,
                token: data.token,
                fullName: userProfile.fullName || '',
                avatar: userProfile.profilePicture || '',
                country: country,
                state: state,
                status: userProfile.status || '',
              }),
            );
          } else {
            dispatch(
              login({
                id: firebaseUid,
                firebaseUid,
                phone: mobileNo,
                isVerified: true,
                isNewUser: data.isNewUser,
                profileCompleted: !data.isNewUser,
                token: data.token,
              }),
            );
          }
        } catch (profileError) {
          console.error('❌ [LoginScreen] Error fetching profile data:', profileError);
          dispatch(
            login({
              id: firebaseUid,
              firebaseUid,
              phone: mobileNo,
              isVerified: true,
              isNewUser: data.isNewUser,
              profileCompleted: !data.isNewUser,
              token: data.token,
            }),
          );
        }
      } else {
        dispatch(
          login({
            id: firebaseUid,
            firebaseUid,
            phone: mobileNo,
            isVerified: true,
            isNewUser: data.isNewUser,
            profileCompleted: !data.isNewUser,
            token: data.token,
          }),
        );
      }

      if (data.isNewUser) {
        navigation.navigate('AuthStack', { screen: 'ProfileScreen' });
      } else {
        // Request contacts permission for existing users
        console.log('🔐 Requesting contacts permission for existing user...');
        try {
          const permissionResult = await permissionManager.requestContactsPermission();
          if (permissionResult.granted) {
            console.log('✅ Contacts permission granted for existing user');
          } else {
            console.log('⚠️ Contacts permission denied for existing user');
            Toast.show({
              type: 'info',
              text1: 'Contacts permission denied',
              text2: 'You can enable it later in settings to find friends',
            });
          }
        } catch (permissionError) {
          console.error('❌ Error requesting contacts permission for existing user:', permissionError);
        }
      }
    } catch (err: any) {
      const safeError = {
        message: err?.message || String(err),
        code: err?.code || 'UNKNOWN',
        name: err?.name || 'Error',
        phone: normalizedPhone,
        otpLength: otpString.length,
        verificationId,
        stack: err?.stack || null,
      };

      // Handle API "User not found" case
      if (safeError.message.includes('User not found')) {
        const firebaseUid = auth().currentUser?.uid;
        const mobileNo = normalizedPhone.replace(/^\+91/, '');

        dispatch(
          login({
            id: firebaseUid || '',
            firebaseUid: firebaseUid || '',
            phone: mobileNo,
            isVerified: true,
            isNewUser: true,
            profileCompleted: false,
          }),
        );

        Toast.show({
          type: 'info',
          text1: 'Welcome! Please complete your profile.',
        });
        navigation.navigate('AuthStack', { screen: 'ProfileScreen' });
        return;
      }

      let errorMessage = 'Failed to verify OTP';
      if (safeError.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (safeError.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please request a new one.';
      } else if (safeError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (safeError.code === 'auth/credential-already-in-use') {
        errorMessage = 'This phone number is already in use.';
      }

      console.error('❌ [LoginScreen] OTP verification error:', safeError);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: errorMessage,
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP Logic
  const handleResendOtp = async () => {
    if (!normalizedPhone) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Phone number not found',
      });
      return;
    }

    try {
      setResendLoading(true);
      console.log('🔄 [LoginScreen] Resending OTP to:', normalizedPhone);

      const confirmation = await auth().signInWithPhoneNumber(normalizedPhone);
      setVerificationId(confirmation.verificationId || '');
      setTimer(30);
      setOtp(['', '', '', '', '', '']);

      Toast.show({
        type: 'success',
        text1: 'OTP Resent',
        text2: `New verification code sent to ${normalizedPhone}`,
      });
    } catch (resendError: any) {
      console.error('❌ [LoginScreen] Error resending OTP:', resendError);
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: resendError.message || 'Please try again',
      });
    } finally {
      setResendLoading(false);
    }
  };

  // Send OTP Logic
  // Send OTP Logic
  const handleSendOtp = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      Toast.show({ type: 'error', text1: 'Please enter your phone number' });
      return;
    }
    try {
      setLoading(true);
      setError('');

      const normalized = getCurrentCountryCode() + phoneNumber;
      const normalized = getCurrentCountryCode() + phoneNumber;
      console.log('=== OTP SENDING DEBUG ===');
      console.log('Original phone:', phoneNumber);
      console.log('Normalized phone:', normalized);
      console.log('Firebase auth instance:', auth());
      console.log('Current user:', auth().currentUser);
      console.log('Starting Firebase phone auth...');

      // Test Firebase connection first
      try {
        const app = auth().app;
        console.log('Firebase app name:', app.name);
        console.log('Firebase options:', app.options);
      } catch (firebaseError) {
        console.error('Firebase connection test failed:', firebaseError);
        throw new Error('Firebase not properly initialized');
      }

      // Send OTP using Firebase
      console.log('Calling signInWithPhoneNumber with:', normalized);
      const confirmation = await auth().signInWithPhoneNumber(normalized);

      console.log('=== OTP SENT SUCCESSFULLY ===');
      console.log('Confirmation object:', confirmation);
      console.log('Verification ID:', confirmation.verificationId);
      Toast.show({ type: 'success', text1: `OTP sent to ${normalized}` });
      
      // Show OTP input instead of navigating
      setVerificationId(confirmation.verificationId || '');
      setNormalizedPhone(normalized);
      setOtpSent(true);
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      
      // Show OTP input instead of navigating
      setVerificationId(confirmation.verificationId || '');
      setNormalizedPhone(normalized);
      setOtpSent(true);
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Full error:', JSON.stringify(err, null, 2));

      let errorMessage = 'Failed to send OTP';
      if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      Toast.show({ type: 'error', text1: errorMessage });
    } finally {
      setLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.content}>
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Phone Icon */}
          <View style={styles.iconContainer}>
            <Icon name="phone-portrait-outline" size={40} color="#8B5CF6" />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Enter your phone number</Text>

          {/* Country Selector */}
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryDropdown(true)}
            disabled={otpSent}
          >
            <Text style={styles.countryFlag}>
              {countries.find(c => c.name === selectedCountry)?.flag}
          {/* Heading */}
          <Text style={styles.heading}>Enter your phone number</Text>

          {/* Country Selector */}
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryDropdown(true)}
            disabled={otpSent}
          >
            <Text style={styles.countryFlag}>
              {countries.find(c => c.name === selectedCountry)?.flag}
            </Text>
            <Text style={styles.countryText}>{selectedCountry}</Text>
            {!otpSent && <Icon name="chevron-down" size={20} color="#8B5CF6" />}
          </TouchableOpacity>

          {/* Phone Number Input */}
          <View style={styles.phoneInputRow}>
            {/* Country Code Input */}
            <View style={styles.countryCodeInput}>
              <Text style={styles.countryCodeText}>{getCurrentCountryCode()}</Text>
            </View>
            
            {/* Phone Number Input */}
            <TextInput
              style={[styles.phoneNumberInput, otpSent && styles.phoneInputDisabled]}
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!otpSent}
              autoFocus={!otpSent}
            />
          </View>
            <Text style={styles.countryText}>{selectedCountry}</Text>
            {!otpSent && <Icon name="chevron-down" size={20} color="#8B5CF6" />}
          </TouchableOpacity>

          {/* Phone Number Input */}
          <View style={styles.phoneInputRow}>
            {/* Country Code Input */}
            <View style={styles.countryCodeInput}>
              <Text style={styles.countryCodeText}>{getCurrentCountryCode()}</Text>
            </View>
            
            {/* Phone Number Input */}
            <TextInput
              style={[styles.phoneNumberInput, otpSent && styles.phoneInputDisabled]}
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!otpSent}
              autoFocus={!otpSent}
            />
          </View>

          {/* Error Message */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Reserved Space for OTP Section */}
          <View style={styles.otpReservedSpace}>
            <Animated.View 
              style={[
                styles.otpSection,
                {
                  opacity: otpAnim,
                  transform: [{
                    translateY: otpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >
              {/* Enter OTP Text */}
              <Text style={styles.otpInstructionText}>
                Enter the 6-digit code sent to your phone
              </Text>

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) {
                        otpInputRefs.current[index] = ref;
                      }
                    }}
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                      error && styles.otpInputError,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, index)}
                    onFocus={() => {}}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        </View>
          {/* Error Message */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Reserved Space for OTP Section */}
          <View style={styles.otpReservedSpace}>
            <Animated.View 
              style={[
                styles.otpSection,
                {
                  opacity: otpAnim,
                  transform: [{
                    translateY: otpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >
              {/* Enter OTP Text */}
              <Text style={styles.otpInstructionText}>
                Enter the 6-digit code sent to your phone
              </Text>

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) {
                        otpInputRefs.current[index] = ref;
                      }
                    }}
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                      error && styles.otpInputError,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, index)}
                    onFocus={() => {}}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Bottom Section with Disclaimer and Buttons */}
        <View style={styles.bottomSection}>
          {/* Disclaimer */}
          <Text style={styles.disclaimerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>

          {/* Button Section */}
          <View style={styles.buttonContainer}>
            {!otpSent ? (
              /* Send OTP Button */
              <TouchableOpacity
                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.sendButtonText}>Sending OTP...</Text>
                ) : (
                  <Text style={styles.sendButtonText}>Get OTP</Text>
                )}
              </TouchableOpacity>
            ) : (
              /* OTP Verification Buttons */
              <View style={styles.otpButtonContainer}>
                {/* Verify OTP Button */}
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    otpLoading && styles.verifyButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP Link */}
                <View style={styles.resendContainer}>
                  {timer > 0 ? (
                    <Text style={styles.timerText}>
                      Resend OTP in {timer}s
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={resendLoading}
                      style={styles.resendButton}
                    >
                      {resendLoading ? (
                        <ActivityIndicator color="#8B5CF6" size="small" />
                      ) : (
                        <Text style={styles.resendButtonText}>Resend OTP</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
        {/* Bottom Section with Disclaimer and Buttons */}
        <View style={styles.bottomSection}>
          {/* Disclaimer */}
          <Text style={styles.disclaimerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>

          {/* Button Section */}
          <View style={styles.buttonContainer}>
            {!otpSent ? (
              /* Send OTP Button */
              <TouchableOpacity
                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.sendButtonText}>Sending OTP...</Text>
                ) : (
                  <Text style={styles.sendButtonText}>Get OTP</Text>
                )}
              </TouchableOpacity>
            ) : (
              /* OTP Verification Buttons */
              <View style={styles.otpButtonContainer}>
                {/* Verify OTP Button */}
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    otpLoading && styles.verifyButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP Link */}
                <View style={styles.resendContainer}>
                  {timer > 0 ? (
                    <Text style={styles.timerText}>
                      Resend OTP in {timer}s
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={resendLoading}
                      style={styles.resendButton}
                    >
                      {resendLoading ? (
                        <ActivityIndicator color="#8B5CF6" size="small" />
                      ) : (
                        <Text style={styles.resendButtonText}>Resend OTP</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
            )}
          </View>
        </View>
      </View>

      {/* Country Dropdown Modal */}
      <Modal
        visible={showCountryDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCountryDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountryDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Country</Text>
            {countries.map((country) => (
              <TouchableOpacity
                key={country.name}
                style={[
                  styles.dropdownItem,
                  selectedCountry === country.name && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  setSelectedCountry(country.name);
                  setShowCountryDropdown(false);
                }}
              >
                <Text style={styles.dropdownFlag}>{country.flag}</Text>
                <Text style={[
                  styles.dropdownText,
                  selectedCountry === country.name && styles.dropdownTextSelected
                ]}>
                  {country.name}
                </Text>
                <Text style={[
                  styles.dropdownCode,
                  selectedCountry === country.name && styles.dropdownCodeSelected
                ]}>
                  {country.code}
                </Text>
              </TouchableOpacity>
            ))}
      {/* Country Dropdown Modal */}
      <Modal
        visible={showCountryDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCountryDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountryDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Country</Text>
            {countries.map((country) => (
              <TouchableOpacity
                key={country.name}
                style={[
                  styles.dropdownItem,
                  selectedCountry === country.name && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  setSelectedCountry(country.name);
                  setShowCountryDropdown(false);
                }}
              >
                <Text style={styles.dropdownFlag}>{country.flag}</Text>
                <Text style={[
                  styles.dropdownText,
                  selectedCountry === country.name && styles.dropdownTextSelected
                ]}>
                  {country.name}
                </Text>
                <Text style={[
                  styles.dropdownCode,
                  selectedCountry === country.name && styles.dropdownCodeSelected
                ]}>
                  {country.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  mainContent: {
    flex: 1,
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    marginTop: 40,
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F0FF',
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 32,
    color: '#1F2937',
    marginBottom: 32,
    textAlign: 'center',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
    borderColor: '#E5E7EB',
    width: '100%',
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  countryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  phoneInputRow: {
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 8,
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  countryCodeInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  countryCodeInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  countryCodeText: {
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    fontWeight: '500',
    color: '#374151',
  },
  phoneNumberInput: {
  phoneNumberInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    color: '#374151',
  },
  phoneInputDisabled: {
    color: '#9CA3AF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    color: '#374151',
  },
  phoneInputDisabled: {
    color: '#9CA3AF',
  },
  errorText: {
    color: '#DC2626',
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  otpReservedSpace: {
    height: 120, // Fixed height to reserve space
    marginBottom: 16,
    justifyContent: 'center',
  },
  otpSection: {
    flex: 1,
    justifyContent: 'center',
  },
  otpInstructionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginBottom: 32,
    alignSelf: 'center',
    gap: 8,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  otpButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  resendButtonText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  otpReservedSpace: {
    height: 120, // Fixed height to reserve space
    marginBottom: 16,
    justifyContent: 'center',
  },
  otpSection: {
    flex: 1,
    justifyContent: 'center',
  },
  otpInstructionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginBottom: 32,
    alignSelf: 'center',
    gap: 8,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  otpButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    color: '#8B5CF6',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  verifyButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 56,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#8B5CF6',
    fontWeight: '500',
  },
  // Country Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: 300,
    minWidth: 280,
    shadowColor: '#000',
    width: '100%',
    minHeight: 56,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#8B5CF6',
    fontWeight: '500',
  },
  // Country Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: 300,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemSelected: {
    backgroundColor: '#F3F0FF',
  },
  dropdownFlag: {
    fontSize: 20,
    marginRight: 12,
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemSelected: {
    backgroundColor: '#F3F0FF',
  },
  dropdownFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  dropdownTextSelected: {
    color: '#8B5CF6',
    fontWeight: '500',
    color: '#374151',
  },
  dropdownTextSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  dropdownCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dropdownCodeSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  dropdownCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dropdownCodeSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});
