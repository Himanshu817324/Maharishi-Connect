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
          {
            text: "Settings", onPress: () => {
              // Open app settings
              import('react-native').then(({ Linking }) => {
                Linking.openSettings().catch(() => {
                  console.log('Could not open settings');
                });
              });
            }
          }
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

    // Batch processing for better performance with large contact lists
    const batchSize = 100; // Process contacts in batches of 100
    const batches = [];

    for (let i = 0; i < numbers.length; i += batchSize) {
      batches.push(numbers.slice(i, i + batchSize));
    }

    let allUsers: any[] = [];

    // Process batches sequentially to avoid overwhelming the server
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📞 Processing batch ${i + 1}/${batches.length} (${batch.length} numbers)`);

      try {
        const response = await apiService.filterContacts(batch);
        const users = (response as any).data?.users || (response as any).data || (response as any).users || [];
        allUsers = allUsers.concat(users);

        // Small delay between batches to prevent rate limiting
        if (i < batches.length - 1) {
          await new Promise<void>(resolve => setTimeout(resolve, 500));
        }
      } catch (batchError) {
        console.error(`❌ Error processing batch ${i + 1}:`, batchError);
        // Continue with next batch instead of failing completely
      }
    }

    console.log("📞 Total matched users:", allUsers.length);

    return {
      users: allUsers,
      message: `Found ${allUsers.length} contacts`
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
