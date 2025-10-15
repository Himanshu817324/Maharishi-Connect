import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { permissionHelper } from '@/services/permissionHelper';
import PermissionTestUtils from '@/utils/permissionTestUtils';

interface PermissionTestProps {
  visible: boolean;
  onClose: () => void;
}

const PermissionTest: React.FC<PermissionTestProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runPermissionTest = async (testName: string, testFunction: () => Promise<boolean>) => {
    try {
      console.log(`🧪 Running test: ${testName}`);
      const result = await testFunction();
      setTestResults(prev => ({ ...prev, [testName]: result }));
      console.log(`🧪 Test ${testName}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`💥 Test ${testName} error:`, error);
      setTestResults(prev => ({ ...prev, [testName]: false }));
    }
  };

  const testCameraPermissions = async () => {
    const permissions = permissionHelper.getCameraPermissions();
    const result = await permissionHelper.requestPermissionsIfNeeded(permissions);
    return result.granted;
  };

  const testStoragePermissions = async () => {
    const permissions = permissionHelper.getStoragePermissions();
    const result = await permissionHelper.requestPermissionsIfNeeded(permissions);
    return result.granted;
  };


  const runComprehensiveTest = async () => {
    try {
      console.log('🧪 Running comprehensive permission test...');
      const results = await PermissionTestUtils.runAllPermissionTests();
      PermissionTestUtils.logTestResults(results);
      
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      Alert.alert(
        'Permission Test Complete',
        `Tests completed: ${passed} passed, ${failed} failed. Check console for detailed results.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('💥 Comprehensive test error:', error);
      Alert.alert('Test Error', 'Failed to run comprehensive test. Check console for details.');
    }
  };

  const getTestIcon = (testName: string) => {
    const result = testResults[testName];
    if (result === undefined) return 'help-circle-outline';
    return result ? 'checkmark-circle' : 'close-circle';
  };

  const getTestColor = (testName: string) => {
    const result = testResults[testName];
    if (result === undefined) return colors.textSecondary;
    return result ? '#4CAF50' : '#F44336';
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Permission Test
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={moderateScale(24)} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Test all media sharing permissions and functionality
          </Text>

          <TouchableOpacity
            style={[styles.runAllButton, { backgroundColor: colors.accent }]}
            onPress={runComprehensiveTest}
          >
            <Icon name="checkmark-circle" size={moderateScale(20)} color="#FFFFFF" />
            <Text style={styles.runAllText}>Run Comprehensive Test</Text>
          </TouchableOpacity>


          <View style={styles.testList}>
            {[
              'Camera Permissions',
              'Storage Permissions',
            ].map((testName) => (
              <TouchableOpacity
                key={testName}
                style={[styles.testItem, { backgroundColor: colors.background }]}
                onPress={() => runPermissionTest(testName, eval(`test${testName.replace(/\s+/g, '')}`))}
              >
                <Icon
                  name={getTestIcon(testName)}
                  size={moderateScale(20)}
                  color={getTestColor(testName)}
                />
                <Text style={[styles.testName, { color: colors.text }]}>
                  {testName}
                </Text>
                <Icon name="chevron-forward" size={moderateScale(16)} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.accent + '20' }]}>
            <Icon name="information-circle" size={moderateScale(20)} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              If any tests fail, check that all required permissions are granted in your device settings.
            </Text>
          </View>
        </ScrollView>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: wp(90),
    maxHeight: hp(80),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
  },
  title: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  content: {
    padding: wp(5),
  },
  description: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(2),
  },
  runAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    borderRadius: moderateScale(12),
    marginBottom: hp(3),
  },
  runAllText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  testList: {
    marginBottom: hp(3),
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: moderateScale(12),
    marginBottom: hp(1),
  },
  testName: {
    flex: 1,
    fontSize: responsiveFont(16),
    marginLeft: wp(3),
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: wp(4),
    borderRadius: moderateScale(12),
  },
  infoText: {
    flex: 1,
    fontSize: responsiveFont(14),
    marginLeft: wp(3),
    lineHeight: responsiveFont(20),
  },
});

export default PermissionTest;
