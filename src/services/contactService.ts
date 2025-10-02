import Contacts from "react-native-contacts";
import { Alert } from "react-native";
import { apiService } from "./apiService";
import { extractContacts } from "../utils/contacts";

export async function fetchContacts() {
  try {
    // Check if permission is already granted
    const permissionStatus = await Contacts.checkPermission();
    
    if (permissionStatus !== 'authorized') {
      console.log("❌ Contacts permission not granted:", permissionStatus);
      Alert.alert(
        "Permission Required", 
        "Contacts permission is required to find friends. Please enable it in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Settings", onPress: () => {
            // Open app settings
            import('react-native').then(({ Linking }) => {
              Linking.openSettings().catch(() => {
                console.log('Could not open settings');
              });
            });
          }}
        ]
      );
      return [];
    }

    // Get contacts
    const contacts = await Contacts.getAll();
    
    if (!contacts || contacts.length === 0) {
      Alert.alert("No Contacts Found", "Your contact list is empty.");
      return [];
    }

    // Filter contacts that have phone numbers
    const contactsWithPhones = contacts.filter(contact => 
      contact.phoneNumbers && contact.phoneNumbers.length > 0
    );

    console.log("📱 Found contacts with phone numbers:", contactsWithPhones.length);
    
    return contactsWithPhones; // return contacts that have phone numbers
  } catch (error) {
    console.error("Error fetching contacts:", error);
    Alert.alert("Error", "Something went wrong while fetching contacts.");
    return [];
  }
}

export const fetchMatchedContacts = async (localContacts: any[]) => {
  try {
    const numbers = extractContacts(localContacts);
    
    if (numbers.length === 0) {
      return { users: [] };
    }

    console.log("📞 Sending phone numbers to filter:", numbers.length);
    console.log("📞 Sample numbers:", numbers.slice(0, 5));
    
    const response = await apiService.filterContacts(numbers);
    console.log("📞 Filter response:", response);
    console.log("📞 Response data:", response.data);
    console.log("📞 Response users:", response.data?.users);
    
    // The API returns { message: "...", users: [...] }
    // We need to return it in the expected format
    const users = response.data?.users || response.data || response.users || [];
    console.log("📞 Final users array:", users);
    
    return {
      users: users,
      message: response.message
    };
  } catch (error) {
    console.error("Error checking contacts:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};
