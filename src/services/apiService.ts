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
    console.log("🌐 Making API request to:", url);

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

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("📡 Response status:", response.status, response.statusText);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log("📡 Response content-type:", contentType);

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
    console.log('🔍 [getUserProfile] Fetching profile for user:', firebaseUid);
    console.log('🔍 [getUserProfile] Using token:', token.substring(0, 20) + '...');

    // Try multiple endpoints in order of preference
    const endpoints = [
      `/users/${firebaseUid}`,
      `/auth/profile`,
      `/user/profile`,
      `/profile`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 [getUserProfile] Trying endpoint: ${endpoint}`);
        const response = await this.makeRequest(endpoint, {
          method: "GET",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('✅ [getUserProfile] Profile data received from', endpoint, ':', response);
        return response;
      } catch (error) {
        console.log(`❌ [getUserProfile] Endpoint ${endpoint} failed:`, error);
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
      console.log("📡 FormData Response status:", response.status, response.statusText);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log("📡 FormData Response content-type:", contentType);

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
        const errorMessage =
          data.message || `HTTP ${response.status}: ${response.statusText}`;
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
    console.log("🔍 API: Filtering contacts with numbers:", phoneNumbers.length);
    console.log("🔍 API: Sample numbers:", phoneNumbers.slice(0, 3));

    // Retry mechanism with exponential backoff for rate limiting
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.makeRequest("/user/check-contacts", {
          method: "POST",
          body: JSON.stringify({ contacts: phoneNumbers }),
        });

        console.log("🔍 API: Filter response received:", response);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.log(`🔍 API: Attempt ${attempt + 1} failed:`, error);

        // Check if it's a rate limiting error
        if (error instanceof Error && error.message.includes('Too many authentication attempts')) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            console.log(`🔍 API: Rate limited, waiting ${delay}ms before retry...`);
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
    try {
      // Try the primary endpoint first
      return await this.makeFormDataRequest("/upload/profile-image", formData);
    } catch (error) {
      console.log('🔄 Primary upload endpoint failed, trying alternative...');
      try {
        // Try alternative endpoint
        return await this.makeFormDataRequest("/upload/image", formData);
      } catch (fallbackError) {
        console.log('🔄 Alternative upload endpoint also failed, trying cloud upload...');
        // Try cloud upload as last resort
        return await this.makeFormDataRequest("/upload/cloud", formData);
      }
    }
  }

  async uploadImageToCloud(formData: FormData): Promise<ApiResponse> {
    return this.makeFormDataRequest("/upload/image", formData);
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
      console.log("🧪 Testing server response format...");
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log("🧪 Health check response status:", response.status);
      console.log("🧪 Health check response headers:", Object.fromEntries(response.headers.entries()));
      
      const contentType = response.headers.get('content-type');
      console.log("🧪 Health check content-type:", contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log("🧪 Health check JSON response:", data);
      } else {
        const textResponse = await response.text();
        console.log("🧪 Health check non-JSON response:", textResponse.substring(0, 500));
      }
      
    } catch (error) {
      console.error("🧪 Health check failed:", error);
    }
  }
}

export const apiService = new ApiService();
