import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LightColors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setOnboardingSeen } from '../../store/slices/authSlice';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get("window");

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isAgreed, setIsAgreed] = useState(false);

  const onContinue = () => {
    if (isAgreed) {
      // Mark onboarding as seen
      dispatch(setOnboardingSeen());
  
      // Navigate to AuthStack -> LoginScreen
      (navigation as any).navigate('AuthStack', { screen: 'LoginScreen' });
    }
  };
  

  const toggleAgreement = () => {
    setIsAgreed(!isAgreed);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      {/* Background Decorations */}
      <View style={styles.backgroundDecoration}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.brandTitle}>Maharishi Connect</Text>
        <View style={styles.titleUnderline} />
      </View>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Image style={styles.logo} source={require("../../assets/logo.png")} />
        </View>
        <Text style={styles.logoSubtext}>Connect • Chat • Collaborate</Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.termsTitle}>Before we begin</Text>
        
        {/* <Text style={styles.normalText}>
          Please read our <Text style={styles.highlight}>Privacy Policy</Text>.
          By tapping <Text style={styles.highlight}>Agree and Continue</Text>,
          you accept our <Text style={styles.highlight}>Terms of Service</Text>.
        </Text> */}

        {/* Checkbox Section */}
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          onPress={toggleAgreement}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isAgreed && styles.checkboxChecked]}>
            {isAgreed && (
              <Icon 
                name="checkmark" 
                size={16} 
                color={LightColors.textOnPrimary} 
              />
            )}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the <Text style={styles.highlight}>Terms of Service</Text> and{" "}
            <Text style={styles.highlight}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.continueButton, !isAgreed && styles.continueButtonDisabled]}
          onPress={onContinue}
          activeOpacity={isAgreed ? 0.8 : 1}
        >
          <Text style={[styles.continueButtonText, !isAgreed && styles.continueButtonTextDisabled]}>
            Agree & Continue
          </Text>
          <View style={[styles.buttonArrow, !isAgreed && styles.buttonArrowDisabled]}>
            <Icon 
              name="arrow-forward"
              size={20} 
              color={isAgreed ? LightColors.textOnPrimary : LightColors.subText} 
            />
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by</Text>
          <Text style={styles.brandFooter}>Maharishi Connect</Text>
        </View>
      </View>
    </View>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
  backgroundDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: LightColors.primary,
    opacity: 0.05,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: height * 0.3,
    left: width * 0.8,
  },
  headerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    color: LightColors.subText,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  brandTitle: {
    fontSize: 32,
    color: LightColors.primary,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: LightColors.accent,
    borderRadius: 2,
  },
  logoSection: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: LightColors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: LightColors.primary,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 15,
    borderWidth: 3,
    borderColor: LightColors.background,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  logoSubtext: {
    fontSize: 16,
    color: LightColors.subText,
    fontWeight: "500",
    letterSpacing: 1,
  },
  contentSection: {
    flex: 1.3,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: LightColors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  normalText: {
    fontSize: 14,
    color: LightColors.subText,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  highlight: {
    color: LightColors.accent,
    fontWeight: "600",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: LightColors.border,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LightColors.background,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: LightColors.accent,
    borderColor: LightColors.background,
  },
  checkboxText: {
    fontSize: 13,
    color: LightColors.subText,
    lineHeight: 18,
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    zIndex: 1,
  },
  continueButton: {
    backgroundColor: LightColors.accent,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: LightColors.accent,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 32,
  },
  continueButtonDisabled: {
    backgroundColor: LightColors.border,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  continueButtonText: {
    color: LightColors.textOnPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 12,
  },
  continueButtonTextDisabled: {
    color: LightColors.subText,
  },
  buttonArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonArrowDisabled: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  footer: {
    alignItems: "center",
    position: "relative",
  },
  footerText: {
    fontSize: 14,
    color: LightColors.subText,
    marginBottom: 8,
    fontWeight: "400",
  },
  brandFooter: {
    fontSize: 18,
    color: LightColors.primary,
    fontWeight: "800",
    marginBottom: 12,
  },
});
