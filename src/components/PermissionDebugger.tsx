import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { permissionHelper } from '@/services/permissionHelper';
import { manifestPermissionManager } from '@/services/manifestPermissionManager';

interface PermissionDebuggerProps {
  visible: boolean;
  onClose: () => void;
}

const PermissionDebugger: React.FC<PermissionDebuggerProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      checkAllPermissions();
    }
  }, [visible]);

  const checkAllPermissions = async () => {
    setIsLoading(true);
    try {
      const storagePermissions = permissionHelper.getStoragePermissions();
      const permissionStatus: Record<string, boolean> = {};

      for (const permission of storagePermissions) {
        const granted = await permissionHelper.checkPermission(permission);
        permissionStatus[permission] = granted;
      }

      setPermissions(permissionStatus);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsLoading(true);
    try {
      const storagePermissions = permissionHelper.getStoragePermissions();
      const result = await permissionHelper.requestMultiplePermissions(storagePermissions);
      
      Alert.alert(
        'Permission Request Result',
        `Granted: ${result.granted}\nDenied: ${result.deniedPermissions.join(', ')}`,
        [{ text: 'OK', onPress: checkAllPermissions }]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const requestIndividualPermission = async (permission: string) => {
    try {
      const granted = await permissionHelper.requestPermission(permission);
      Alert.alert(
        'Permission Result',
        `${permission}: ${granted ? 'GRANTED' : 'DENIED'}`,
        [{ text: 'OK', onPress: checkAllPermissions }]
      );
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const openSettings = () => {
    permissionHelper.openAppSettings();
  };

  if (!visible) return null;

  const storagePermissions = permissionHelper.getStoragePermissions();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Permission Debugger</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Android Version: {Platform.Version}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Storage Permissions Status
          </Text>
          
          {storagePermissions.map((permission) => (
            <View key={permission} style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionName, { color: colors.text }]}>
                  {permission}
                </Text>
                <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                  {manifestPermissionManager.getPermissionDescription(permission)}
                </Text>
              </View>
              
              <View style={styles.permissionActions}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: permissions[permission] ? colors.accent : colors.error }
                ]}>
                  <Text style={styles.statusText}>
                    {permissions[permission] ? 'GRANTED' : 'DENIED'}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.requestButton, { backgroundColor: colors.accent }]}
                  onPress={() => requestIndividualPermission(permission)}
                  disabled={isLoading}
                >
                  <Text style={styles.requestText}>Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={checkAllPermissions}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={requestAllPermissions}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Request All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.textSecondary }]}
            onPress={openSettings}
          >
            <Text style={styles.actionButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  closeButton: {
    padding: moderateScale(8),
  },
  closeText: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: wp(4),
  },
  section: {
    padding: wp(4),
    borderRadius: moderateScale(12),
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: hp(1),
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  permissionInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  permissionName: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
    marginBottom: hp(0.5),
  },
  permissionDescription: {
    fontSize: responsiveFont(12),
    lineHeight: responsiveFont(16),
  },
  permissionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(4),
    marginRight: wp(2),
  },
  statusText: {
    fontSize: responsiveFont(10),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestButton: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
  },
  requestText: {
    fontSize: responsiveFont(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: hp(2),
  },
  actionButton: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    flex: 1,
    marginHorizontal: wp(1),
  },
  actionButtonText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  loadingText: {
    fontSize: responsiveFont(14),
  },
});

export default PermissionDebugger;
