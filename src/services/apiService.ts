import { NETWORK_CONFIG, NETWORK_ERRORS } from "../config/network";

const API_BASE_URL = NETWORK_CONFIG.BASE_URL;

interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  user?: T;
  isNewUser?: boolean;
  token?: string;
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_CONFIG.TIMEOUT);

      console.log('🌐 [ApiService] Making request to:', url);
      console.log('🌐 [ApiService] Request config:', {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.parse(config.body as string) : 'No body'
      });

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log('🌐 [ApiService] Response status:', response.status);
      console.log('🌐 [ApiService] Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, get the text response for debugging
        const textResponse = await response.text();
        console.error("❌ Non-JSON response received:", textResponse.substring(0, 200));
        
        if (!response.ok) {
          throw new Error(`Server error ${response.status}: ${response.statusText}. Server returned: ${textResponse.substring(0, 100)}`);
        } else {
          throw new Error("Server returned non-JSON response. Please check your API endpoint.");
        }
      }

      let data: ApiResponse<T>;

      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        // Try to get the raw response for debugging
        const textResponse = await response.text();
        console.error("Raw response:", textResponse.substring(0, 200));
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (!response.ok) {
        const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ [ApiService] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          message: errorMessage
        });
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(NETWORK_ERRORS.TIMEOUT);
        } else if (error.message.includes('Network request failed')) {
          throw new Error(NETWORK_ERRORS.NETWORK_FAILED);
        } else if (error.message.includes('CORS')) {
          throw new Error(NETWORK_ERRORS.CORS_ERROR);
        }
      }

      throw error;
    }
  }

  async signup(userData: {
    firebaseUid: string;
    isVerified: boolean;
    fullName: string;
    mobileNo: string;
    location: {
      country: string;
      state: string;
    };
    status: string;
    profilePicture?: string | null; // Can be tempId, URL, or null
  }): Promise<ApiResponse> {
    // Remove null/empty values before sending
    const cleanedData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) =>
        value !== null && value !== "" && value !== undefined
      )
    );

    return this.makeRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(cleanedData),
    });
  }

  async login(mobileNo: string): Promise<ApiResponse> {
    return this.makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ mobileNo }),
    });
  }

  // Fetch complete user profile data
  async getUserProfile(firebaseUid: string, token: string): Promise<ApiResponse> {

    // Try multiple endpoints in order of preference
    const endpoints = [
      `/users/${firebaseUid}`,
      `/auth/profile`,
      `/user/profile`,
      `/profile`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint, {
          method: "GET",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        return response;
      } catch (error) {
        // Continue to next endpoint
      }
    }

    // If all endpoints fail, throw the last error
    throw new Error('All profile endpoints failed. Please check your backend API.');
  }

  private async makeFormDataRequest<T>(
    endpoint: string,
    formData: FormData,
    timeout: number = 30000 // 30s for file uploads
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          // Don't set Content-Type for FormData, RN sets it with boundary
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, get the text response for debugging
        const textResponse = await response.text();
        console.error("❌ Non-JSON response received for FormData:", textResponse.substring(0, 200));
        
        if (!response.ok) {
          throw new Error(`Upload failed ${response.status}: ${response.statusText}. Server returned: ${textResponse.substring(0, 100)}`);
        } else {
          throw new Error("Server returned non-JSON response for file upload. Please check your upload endpoint.");
        }
      }

      let data: ApiResponse<T>;

      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        // Try to get the raw response for debugging
        const textResponse = await response.text();
        console.error("Raw FormData response:", textResponse.substring(0, 200));
        throw new Error(`Invalid JSON response from upload: ${parseError.message}`);
      }

      if (!response.ok) {
        let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Provide more specific error messages based on status codes
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid request. Please check your file and try again.';
            break;
          case 401:
            errorMessage = 'Authentication failed. Please log in again.';
            break;
          case 403:
            errorMessage = 'Permission denied. You may not have access to upload files.';
            break;
          case 413:
            errorMessage = 'File too large. Please choose a smaller file.';
            break;
          case 415:
            errorMessage = 'Unsupported file type. Please choose a different file format.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;
          default:
            if (response.status >= 500) {
              errorMessage = 'Server error. Please try again later.';
            } else if (response.status >= 400) {
              errorMessage = 'Request failed. Please check your file and try again.';
            }
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error("FormData request failed:", error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            "Upload timeout: Please try again with a smaller image"
          );
        } else if (error.message.includes("Network request failed")) {
          throw new Error("Network error: Please check your internet connection");
        } else if (error.message.includes("CORS")) {
          throw new Error("Server configuration error: Please contact support");
        }
      }

      throw error;
    }
  }

  async filterContacts(phoneNumbers: string[]): Promise<ApiResponse> {

    // Retry mechanism with exponential backoff for rate limiting
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.makeRequest("/user/check-contacts", {
          method: "POST",
          body: JSON.stringify({ contacts: phoneNumbers }),
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limiting error
        if (error instanceof Error && error.message.includes('Too many authentication attempts')) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            await new Promise<void>(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // For non-rate-limiting errors or final attempt, throw immediately
        throw error;
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  async uploadProfileImage(formData: FormData): Promise<ApiResponse> {
    const endpoints = [
      "/upload/profile-image",
      "/upload/image", 
      "/upload/cloud",
      "/user/upload-profile-image",
      "/api/upload/profile-image"
    ];
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const result = await this.makeFormDataRequest(endpoints[i], formData);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // If it's a client error (4xx), don't try other endpoints
        if (error instanceof Error && error.message.includes('4')) {
          throw error;
        }
        
        // Wait before trying next endpoint (except for last one)
        if (i < endpoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If all endpoints failed, throw the last error with context
    throw new Error(`All upload endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async uploadImageToCloud(formData: FormData): Promise<ApiResponse> {
    return this.makeFormDataRequest("/upload/image", formData);
  }

  /**
   * Update user profile
   * @param profileData - Profile data to update
   * @returns Updated user profile
   */
  async updateUserProfile(profileData: {
    fullName?: string;
    status?: string;
    location?: {
      country: string;
      state: string;
    };
    profilePicture?: string;
  }): Promise<ApiResponse> {
    // Get auth token from AsyncStorage
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    console.log('🔧 [ApiService] updateUserProfile called with:', JSON.stringify(profileData, null, 2));
    console.log('🔧 [ApiService] Auth token exists:', !!token);

    return this.makeRequest("/auth/profile", {
      method: "PUT",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Get authentication token from AsyncStorage
   * @returns Auth token or null
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Debug method to test server connectivity
  async testServerConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/health`, {
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
  }

  /**
   * Test server response format for debugging
   */
  async testServerResponse(): Promise<void> {
    try {
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
      } else {
        const textResponse = await response.text();
      }
      
    } catch (error) {
      console.error("🧪 Health check failed:", error);
    }
  }
}

export const apiService = new ApiService();
