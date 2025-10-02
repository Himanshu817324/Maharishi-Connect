import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from '../../config/firebase';
import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { RootStackParamList } from '../../types/navigation';
import { LightColors } from '../../theme/colors';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import ModernDropdown from '../../components/atoms/ui/ModernDropdown';

// type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, keyof RootStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // --- States ---
  const [selectedCountry, setSelectedCountry] = useState<string>("India");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const phoneInputRef = useRef<TextInput>(null);

  // --- Auto-scroll functionality ---
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      if (isFocused) {
        // Scroll to a position that shows the input field clearly
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 350, animated: true });
        }, 200);
      }
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Reset focus state when keyboard hides
      setIsFocused(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [isFocused]);

  // Also trigger scroll on focus
  useEffect(() => {
    if (isFocused) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 350, animated: true });
      }, 100);
    }
  }, [isFocused]);

  // --- Helper ---
  const normalizePhone = (input: string) => {
    let number = input.replace(/\s+/g, ""); // remove spaces
    if (!number.startsWith("+")) {
      number = "+91" + number; // default India code
    }
    return number;
  };

  const getCountryCode = () => {
    switch (selectedCountry) {
      case "USA":
        return "+1";
      case "UK":
        return "+44";
      default:
        return "+91";
    }
  };

  // --- Send OTP Logic ---
  const handleSendOtp = async () => {
    if (!phoneNumber) {
      setError("Please enter your phone number");
      Toast.show({ type: "error", text1: "Please enter your phone number" });
      return;
    }
    try {
      setLoading(true);
      setError("");

      const normalized = normalizePhone(phoneNumber);
      console.log("=== OTP SENDING DEBUG ===");
      console.log("Original phone:", phoneNumber);
      console.log("Normalized phone:", normalized);
      console.log("Firebase auth instance:", auth());
      console.log("Current user:", auth().currentUser);
      console.log("Starting Firebase phone auth...");

      // Test Firebase connection first
      try {
        const app = auth().app;
        console.log("Firebase app name:", app.name);
        console.log("Firebase options:", app.options);
      } catch (firebaseError) {
        console.error("Firebase connection test failed:", firebaseError);
        throw new Error("Firebase not properly initialized");
      }

      // Send OTP using Firebase
      console.log("Calling signInWithPhoneNumber with:", normalized);
      const confirmation = await auth().signInWithPhoneNumber(normalized);
      
      console.log("=== OTP SENT SUCCESSFULLY ===");
      console.log("Confirmation object:", confirmation);
      console.log("Verification ID:", confirmation.verificationId);
      Toast.show({ type: "success", text1: `OTP sent to ${normalized}` });
      navigation.navigate('AuthStack', { screen: 'OTPScreen', params: { verificationId: confirmation.verificationId || '', phoneNumber: normalized } });
    } catch (err: any) {
      console.error("Send OTP error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      console.error("Full error:", JSON.stringify(err, null, 2));
      
      let errorMessage = "Failed to send OTP";
      if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again later.";
      } else if (err.code === 'auth/invalid-phone-number') {
        errorMessage = "Invalid phone number format.";
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      Toast.show({ type: "error", text1: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="height"
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 50 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image style={styles.logo} source={require("../../assets/logo.png")} />
            </View>

            <Text style={styles.heading}>Welcome to Maharishi Connect</Text>
            <Text style={styles.subText}>
              Enter your phone number to get started
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Country Picker Card */}
            <View style={styles.inputCard}>
              <ModernDropdown
                label="Country"
                options={[
                  { label: "India", value: "India", emoji: "🇮🇳" },
                  { label: "United States", value: "USA", emoji: "🇺🇸" },
                  { label: "United Kingdom", value: "UK", emoji: "🇬🇧" },
                ]}
                selectedValue={selectedCountry}
                onValueChange={(value: string) => setSelectedCountry(value)}
                placeholder="Select your country"
              />
            </View>

            {/* Phone Number Card */}
            <View
              style={[styles.inputCard, isFocused && styles.inputCardFocused]}
            >
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.phoneContainer}>
                <View style={styles.countryCodeContainer}>
                  <Text style={styles.countryCode}>{getCountryCode()}</Text>
                </View>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor={LightColors.subText}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </View>
            </View>

            {/* Error message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Info Text */}
            <Text style={styles.infoText}>
              We&apos;ll send you a verification code via SMS
            </Text>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.nextButtonDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {loading ? "Sending OTP..." : "Continue"}
              </Text>
              {!loading && <Icon name="arrow-forward" size={22} color="#fff" />}
            </TouchableOpacity>

            <Text style={styles.disclaimerText}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerSection: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#6366f1",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    height: 80,
    width: 80,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
  formSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  inputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  inputCardFocused: {
    borderColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOpacity: 0.1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryCodeContainer: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    paddingVertical: 12,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
  },
  infoText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: "#6366f1",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  nextButtonDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
});
