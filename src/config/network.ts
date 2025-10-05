// Network configuration and debugging utilities

export const NETWORK_CONFIG = {
  BASE_URL: "https://api.maharishiconnect.com/api", // Production backend server
  TIMEOUT: 15000, // 15 seconds for better reliability
  RETRY_ATTEMPTS: 3,
};

// Network debugging utility
export const logNetworkRequest = (_url: string, _config: RequestInit) => {
  // Logging disabled
};

export const logNetworkResponse = (_response: Response, _data?: any) => {
  // Logging disabled
};

// Common network error messages
export const NETWORK_ERRORS = {
  TIMEOUT: "Request timeout: Please check your internet connection",
  NETWORK_FAILED: "Network error: Please check your internet connection",
  CORS_ERROR: "Server configuration error: Please contact support",
  SERVER_ERROR: "Server error: Please try again later",
  INVALID_RESPONSE: "Invalid response from server",
};

// Network status checker (you can implement this with NetInfo if needed)
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    await fetch("https://www.google.com", {
      method: "HEAD",
      mode: "no-cors",
    });
    return true;
  } catch {
    return false;
  }
};

// Test server connectivity
export const testServerConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${NETWORK_CONFIG.BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};
