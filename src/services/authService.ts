import { auth } from '../config/firebase';
import { PhoneAuthProvider } from '@react-native-firebase/auth';

export async function sendOtp(phoneNumber: string) {
  // Firebase automatically uses Play Integrity on Android, APNs on iOS
  const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
  return confirmation;
}

export async function verifyOtp(confirmation: any, otp: string) {
  return await confirmation.confirm(otp);
}
