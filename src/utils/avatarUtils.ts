/**
 * Utility functions for avatar generation
 */

/**
 * Generate initials from a full name
 * @param name - Full name (e.g., "Palak Mishra", "John Doe Smith")
 * @returns Initials (e.g., "PM", "JDS")
 */
export const generateInitials = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '?';
  }

  // Split by spaces and filter out empty strings
  const words = name.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '?';
  }

  // If only one word, take first two characters
  if (words.length === 1) {
    const word = words[0];
    return word.length >= 2 ? word.substring(0, 2).toUpperCase() : word.toUpperCase();
  }

  // If multiple words, take first character of each word (max 2)
  const initials = words.slice(0, 2).map(word => word.charAt(0).toUpperCase());
  return initials.join('');
};

/**
 * Generate a consistent color for an avatar based on the name
 * @param name - Name to generate color for
 * @returns Hex color code
 */
export const generateAvatarColor = (name: string): string => {
  if (!name) return '#6B7280'; // Default gray

  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate a color from the hash
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Construct profile picture URL from UUID or return existing URL
 * @param profilePicture - Profile picture UUID or full URL
 * @param userId - User ID for constructing the URL
 * @returns Full profile picture URL
 */
export const constructProfilePictureUrl = (profilePicture: string | null | undefined, userId?: string): string | null => {
  if (!profilePicture || profilePicture.trim() === '') {
    return null;
  }

  // If it's already a full URL, return as is
  if (profilePicture.startsWith('http')) {
    return profilePicture;
  }

  // If it's just a UUID, construct the full URL
  if (userId) {
    const baseUrl = 'https://api.maharishiconnect.com';
    return `${baseUrl}/profile-images/${userId}/${profilePicture}`;
  }

  // If no userId provided, return the original value
  return profilePicture;
};

/**
 * Get avatar props for a user
 * @param user - User object with name and profilePicture
 * @returns Object with initials, color, and hasProfilePicture
 */
export const getAvatarProps = (user: { name?: string; fullName?: string; profilePicture?: string | null; id?: string; firebaseUid?: string }) => {
  const name = user.name || user.fullName || '';
  const userId = user.firebaseUid || user.id;
  const profilePictureUrl = constructProfilePictureUrl(user.profilePicture, userId);
  const hasProfilePicture = profilePictureUrl && profilePictureUrl.trim() !== '';
  
  return {
    initials: generateInitials(name),
    color: generateAvatarColor(name),
    hasProfilePicture,
    name,
    profilePictureUrl
  };
};
