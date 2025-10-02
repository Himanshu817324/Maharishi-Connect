import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { generateInitials, generateAvatarColor } from '../../../utils/avatarUtils';

interface AvatarWithInitialsProps {
  name: string;
  profilePicture?: string | null;
  size?: number;
  style?: any;
}

const AvatarWithInitials: React.FC<AvatarWithInitialsProps> = ({
  name,
  profilePicture,
  size = 56,
  style
}) => {
  const hasProfilePicture = profilePicture && profilePicture.trim() !== '';
  const initials = generateInitials(name);
  const backgroundColor = generateAvatarColor(name);

  if (hasProfilePicture) {
    return (
      <Image
        source={{ uri: profilePicture }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          style
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          { fontSize: size * 0.4 }
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  initialsText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AvatarWithInitials;
