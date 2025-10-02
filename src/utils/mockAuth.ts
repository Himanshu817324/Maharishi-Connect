// Mock authentication for development/testing
export const mockSendOTP = async (phoneNumber: string) => {
  console.log('🔧 MOCK: Sending OTP to', phoneNumber);
  
  // Simulate network delay
  await new Promise<void>(resolve => setTimeout(resolve, 2000));
  
  // Return a mock confirmation object
  return {
    confirm: async (otp: string) => {
      console.log('🔧 MOCK: Verifying OTP', otp);
      
      // Simulate verification delay
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      // Mock successful verification
      return {
        user: {
          uid: 'mock-user-' + Date.now(),
          phoneNumber: phoneNumber,
        }
      };
    },
    verificationId: 'mock-verification-id-' + Date.now()
  };
};

export const isDevelopment = __DEV__;
