import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { useTheme } from '../../../../theme';
import CustomStatusBar from '../../../../components/atoms/ui/StatusBar';
import AvatarWithInitials from '../../../../components/atoms/ui/AvatarWithInitials';

export default function UserInfoScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);

  const infoItems = [
    { label: 'Phone', value: user?.phone || 'Not set', icon: 'call-outline' },
    { label: 'Country', value: user?.country || 'Not set', icon: 'location-outline' },
    { label: 'State', value: user?.state || 'Not set', icon: 'location-outline' },
    { label: 'Status', value: user?.status || 'Not set', icon: 'ellipse-outline' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomStatusBar />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Account</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.profileSection}>
        <AvatarWithInitials
          name={user?.fullName || 'User Name'}
          profilePicture={user?.avatar}
          size={100}
        />
        <Text style={[styles.profileName, { color: colors.text }]}>
          {user?.fullName || 'User Name'}
        </Text>
        <Text style={[styles.profileSubtitle, { color: colors.subText }]}>
          {user?.phone || 'Phone number'}
        </Text>
      </View>

      <View style={styles.infoSection}>
        {infoItems.map((item, index) => (
          <View
            key={index}
            style={[
              styles.infoItem,
              { borderBottomColor: colors.border },
              index === infoItems.length - 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={styles.infoLeft}>
              <Icon name={item.icon} size={20} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.text }]}>
                {item.label}
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.subText }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => {
            // Handle edit profile
          }}
        >
          <Icon name="create-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Edit Profile
          </Text>
          <Icon name="chevron-forward" size={20} color={colors.subText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => {
            // Handle logout
          }}
        >
          <Icon name="log-out-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>
            Logout
          </Text>
          <Icon name="chevron-forward" size={20} color={colors.subText} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileSubtitle: {
    fontSize: 16,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 16,
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
});
