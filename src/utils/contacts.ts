// Contact utilities for normalization and extraction

export const normalizePhoneNumber = (num: string): string => {
  // Remove all non-digit characters and keep only the last 10 digits
  return num.replace(/\D/g, "").slice(-10);
};

export const extractContacts = (contacts: any[]): string[] => {
  const numbers = new Set<string>();
  
  contacts.forEach(contact => {
    contact.phoneNumbers?.forEach((phoneNumber: any) => {
      const cleanNumber = normalizePhoneNumber(phoneNumber.number);
      if (cleanNumber.length === 10) {
        numbers.add(cleanNumber);
      }
    });
  });
  
  return Array.from(numbers);
};

export const mergeLocalNames = (localContacts: any[], serverUsers: any[]) => {
  return serverUsers.map((user: any) => {
    const localContact = localContacts.find(contact =>
      contact.phoneNumbers?.some((phoneNumber: any) =>
        normalizePhoneNumber(phoneNumber.number) === normalizePhoneNumber(user.mobileNo)
      )
    );
    
    return {
      ...user,
      name: localContact?.displayName || user.fullName,
      localName: localContact?.displayName || null
    };
  });
};

export const splitContactsByExistence = (allContacts: string[], existingUsers: any[]) => {
  const existingNumbers = new Set(existingUsers.map(user => user.mobileNo));
  
  const existingContacts = allContacts.filter(number => existingNumbers.has(number));
  const nonExistingContacts = allContacts.filter(number => !existingNumbers.has(number));
  
  return {
    existingContacts,
    nonExistingContacts
  };
};
