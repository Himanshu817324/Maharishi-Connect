// Firebase test utility
import { auth } from '../config/firebase';

export const testFirebaseConnection = () => {
  console.log('=== FIREBASE CONNECTION TEST ===');
  console.log('Firebase app:', auth().app);
  console.log('Firebase auth instance:', auth());
  console.log('Current user:', auth().currentUser);
  console.log('App name:', auth().app.name);
  console.log('App options:', auth().app.options);
  
  // Test if we can call Firebase methods
  try {
    const testPhone = '+1234567890'; // Test phone number
    console.log('Testing phone auth with:', testPhone);
    
    // This will fail but we can see the error
    auth().signInWithPhoneNumber(testPhone)
      .then(() => {
        console.log('✅ Firebase phone auth is working');
      })
      .catch((error) => {
        console.log('❌ Firebase phone auth error:', error.code, error.message);
        if (error.code === 'auth/invalid-phone-number') {
          console.log('✅ Firebase is working, just invalid phone number');
        }
      });
  } catch (error) {
    console.log('❌ Firebase setup error:', error);
  }
};
