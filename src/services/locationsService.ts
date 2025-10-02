import { NETWORK_CONFIG } from '../config/network';

export interface Country {
  name: string;
  states: string[];
}

export interface CountriesResponse {
  countries: string[];
}

export interface StatesResponse {
  country: string;
  states: string[];
}

export interface AllLocationsResponse {
  countries: Country[];
}

class LocationsService {
  private baseUrl = '/api/locations';

  /**
   * Fetch all supported countries
   */
  async getCountries(): Promise<string[]> {
    try {
      const response = await fetch(`${NETWORK_CONFIG.BASE_URL}${this.baseUrl}/countries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Locations API not implemented yet, using fallback data');
          return this.getFallbackCountries();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.countries || [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      // Fallback to static data if API fails
      return this.getFallbackCountries();
    }
  }

  /**
   * Fetch states for a specific country
   */
  async getStates(country: string): Promise<string[]> {
    try {
      const response = await fetch(`${NETWORK_CONFIG.BASE_URL}${this.baseUrl}/states?country=${encodeURIComponent(country)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`States API not implemented yet for ${country}, using fallback data`);
          return this.getFallbackStates(country);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.states || [];
    } catch (error) {
      console.error(`Error fetching states for ${country}:`, error);
      // Fallback to static data if API fails
      return this.getFallbackStates(country);
    }
  }

  /**
   * Fetch all countries with their states
   */
  async getAllLocations(): Promise<Country[]> {
    try {
      const response = await fetch(`${NETWORK_CONFIG.BASE_URL}${this.baseUrl}/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.countries || [];
    } catch (error) {
      console.error('Error fetching all locations:', error);
      // Fallback to static data if API fails
      return this.getFallbackLocations();
    }
  }

  /**
   * Get fallback countries (static data)
   */
  private getFallbackCountries(): string[] {
    return ['India', 'UK', 'USA'];
  }

  /**
   * Get fallback states for a country (static data)
   */
  private getFallbackStates(country: string): string[] {
    const fallbackData: Record<string, string[]> = {
      India: [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
        "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
        "Lakshadweep"
      ],
      UK: [
        "England", "Scotland", "Wales", "Northern Ireland"
      ],
      USA: [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
        "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
        "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
        "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
        "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
        "New Hampshire", "New Jersey", "New Mexico", "New York",
        "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
        "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
        "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
      ]
    };
    return fallbackData[country] || [];
  }

  /**
   * Get fallback locations (static data)
   */
  private getFallbackLocations(): Country[] {
    return [
      {
        name: "India",
        states: this.getFallbackStates("India")
      },
      {
        name: "UK", 
        states: this.getFallbackStates("UK")
      },
      {
        name: "USA",
        states: this.getFallbackStates("USA")
      }
    ];
  }
}

export const locationsService = new LocationsService();
