import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import auth, { PhoneAuthProvider } from '@react-native-firebase/auth'; // ✅ ADDED PhoneAuthProvider import
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { apiService } from '../../services/apiService';
import { login } from '../../store/slices/authSlice';
import { LightColors } from '../../theme/colors';
import { RootStackParamList, AuthStackParamList } from '../../types/navigation';
import { requestContactsPermissionWithAlert } from '../../utils/permissions';

// ✅ FIXED: Correct route type
type OTPScreenRouteProp = RouteProp<AuthStackParamList, 'OTPScreen'>;
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

const OTPScreen = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const rootNavigation = useNavigation<RootNavigationProp>();
  const route = useRoute<OTPScreenRouteProp>();
  const dispatch = useDispatch();

  // ✅ FIXED: Correct parameter extraction - remove the nested .params
  const { verificationId, phoneNumber } = route.params || {};

  const inputRefs = useRef<(TextInput | null)[]>([]);


  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');


    if (!otpString || otpString.length !== 6) {
      Toast.show({ type: 'error', text1: 'Please enter complete OTP' });
      return;
    }

    // Check if we have the required parameters
    if (!verificationId) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: 'Please go back and request OTP again',
      });
      return;
    }

    if (!phoneNumber) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: 'Phone number is required',
      });
      return;
    }

    try {
      setLoading(true);

      // ✅ FIXED: Use PhoneAuthProvider.credential correctly
      const credential = PhoneAuthProvider.credential(
        verificationId,
        otpString,
      );
      const userCredential = await auth().signInWithCredential(credential);

      if (!userCredential) {
        throw new Error('OTP verification failed');
      }

      const firebaseUid = userCredential.user.uid;

      const mobileNo = phoneNumber.replace(/^\+91/, '');
      const data = await apiService.login(mobileNo);

      dispatch(
        login({
          id: firebaseUid, // Use firebaseUid as id
          firebaseUid,
          phone: mobileNo,
          isVerified: true,
          isNewUser: data.isNewUser,
          profileCompleted: !data.isNewUser,
          token: data.token,
        }),
      );

      if (data.isNewUser) {
        rootNavigation.navigate('AuthStack', { screen: 'ProfileScreen' });
      } else {
        // For existing users, request contacts permission before navigating to main app
        console.log('🔐 Requesting contacts permission for existing user...');
        try {
          const permissionResult = await requestContactsPermissionWithAlert(false);
          if (permissionResult.granted) {
            console.log('✅ Contacts permission granted for existing user');
          } else {
            console.log('⚠️ Contacts permission denied for existing user');
            Toast.show({
              type: "info",
              text1: "Contacts permission denied",
              text2: "You can enable it later in settings to find friends"
            });
          }
        } catch (error) {
          console.error('❌ Error requesting contacts permission for existing user:', error);
        }
        
        // For existing users, the RootNavigator will handle the switch to MainStack
        // automatically because isLoggedIn and profileCompleted are now true.
      }
    } catch (err: any) {
      const safeError = {
        message: err?.message || String(err),
        code: err?.code || 'UNKNOWN',
        name: err?.name || 'Error',
        phone: phoneNumber,
        otpLength: otpString.length,
        verificationId,
        stack: err?.stack || null,
      };


      // Handle API "User not found" case
      if (safeError.message.includes('User not found')) {
        const firebaseUid = auth().currentUser?.uid;
        const mobileNo = phoneNumber.replace(/^\+91/, '');

        dispatch(
          login({
            id: firebaseUid || '', // Use firebaseUid as id
            firebaseUid: firebaseUid || '',
            phone: mobileNo,
            isVerified: true,
            isNewUser: true, // Mark as new user
            profileCompleted: false, // Profile not completed for new users
          }),
        );

        Toast.show({
          type: 'info',
          text1: 'Welcome! Please complete your profile.',
        });
        rootNavigation.navigate('AuthStack', { screen: 'ProfileScreen' });
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
        errorMessage = 'This number is already verified.';
      } else if (safeError.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid OTP. Please try again.';
      } else if (safeError.message) {
        errorMessage = safeError.message;
      }


      Toast.show({
        type: 'error',
        text1: 'OTP Verification Failed',
        text2: errorMessage,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 60,
        bottomOffset: 40,
      });

      console.log('🚨 Toast should be showing:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;

    if (!phoneNumber) {
      Toast.show({
        type: 'error',
        text1: 'Cannot resend OTP',
        text2: 'Phone number is missing',
      });
      return;
    }

    setResendLoading(true);

    try {

      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);

      // Note: You might want to update the verificationId here
      // For now, we'll just reset the timer and clear OTP

      setTimer(30);
      setOtp(['', '', '', '', '', '']);

      Toast.show({
        type: 'success',
        text1: 'OTP resent successfully',
        text2: 'Please check your messages',
      });

    } catch (error: any) {

      Toast.show({
        type: 'error',
        text1: 'Failed to resend OTP',
        text2: error.message || 'Please try again',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const formatPhone = useMemo(() => {
    if (!phoneNumber) return '';
    const formatted =
      phoneNumber.length > 6
        ? `${phoneNumber.slice(0, -6)}******${phoneNumber.slice(-2)}`
        : phoneNumber;
    return formatted;
  }, [phoneNumber]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={require('../../assets/logo.png')}
            />
          </View>

          <Text style={styles.title}>Verify Your Number</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>
              We&apos;ve sent a 6-digit code to
            </Text>
            <Text style={styles.phoneNumber}>
              {formatPhone || phoneNumber || 'your number'}
            </Text>
          </View>
        </View>

        {/* OTP Input Section */}
        <View style={styles.otpSection}>
          <Text style={styles.otpLabel}>Enter verification code</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={value => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            {timer > 0 ? (
              <Text style={styles.timerText}>Resend OTP in {timer}s </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendLoading}
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>
                  {resendLoading ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              loading && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Secured by</Text>
            <Text style={styles.brandText}>Maharishi Connect</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OTPScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    minHeight: 250,
    maxHeight: 350,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: LightColors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: LightColors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: LightColors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitleContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: LightColors.subText,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: LightColors.primary,
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: LightColors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  otpSection: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: LightColors.text,
    marginBottom: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginBottom: 32,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: LightColors.border,
    backgroundColor: LightColors.card,
    fontSize: 20,
    fontWeight: '600',
    color: LightColors.text,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: LightColors.primary,
    backgroundColor: LightColors.background,
    shadowColor: LightColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    color: LightColors.subText,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    color: LightColors.button,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  verifyButton: {
    backgroundColor: LightColors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: LightColors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: LightColors.subText,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: LightColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
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
