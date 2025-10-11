import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

const SimplePermissionTest: React.FC = () => {
  const { colors } = useTheme();
  const [results, setResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testPermission = async (permission: any) => {
    try {
      addResult(`Testing permission: ${permission}`);
      
      // Check if permission exists
      const hasPermission = await PermissionsAndroid.check(permission);
      addResult(`Permission ${permission} exists: ${hasPermission ? 'GRANTED' : 'DENIED'}`);
      
      if (!hasPermission) {
        addResult(`Requesting permission: ${permission}`);
        const granted = await PermissionsAndroid.request(permission);
        addResult(`Permission ${permission} result: ${granted}`);
        
        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          addResult(`⚠️ ${permission} set to NEVER_ASK_AGAIN - user must enable in settings`);
        }
      }
    } catch (error) {
      addResult(`Error with ${permission}: ${error}`);
    }
  };

  const testAllPermissions = async () => {
    setResults([]);
    addResult('Starting permission tests...');
    
    const permissions = [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
    ];

    for (const permission of permissions) {
      await testPermission(permission);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    addResult('Permission tests completed!');
  };

  const clearResults = () => {
    setResults([]);
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Permission Test (iOS)
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          iOS handles permissions automatically through native pickers
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Simple Permission Test
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Android Version: {Platform.Version}
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={testAllPermissions}
      >
        <Text style={styles.buttonText}>Test All Permissions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.textSecondary }]}
        onPress={clearResults}
      >
        <Text style={styles.buttonText}>Clear Results</Text>
      </TouchableOpacity>

      <View style={[styles.resultsContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.resultsTitle, { color: colors.text }]}>
          Test Results:
        </Text>
        {results.map((result, index) => (
          <Text key={index} style={[styles.resultText, { color: colors.textSecondary }]}>
            {result}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: wp(4),
  },
  title: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(3),
  },
  button: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: moderateScale(8),
    marginBottom: hp(2),
    alignItems: 'center',
  },
  buttonText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
    padding: wp(4),
    borderRadius: moderateScale(8),
    marginTop: hp(2),
  },
  resultsTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: hp(1),
  },
  resultText: {
    fontSize: responsiveFont(12),
    marginBottom: hp(0.5),
    fontFamily: 'monospace',
  },
});

export default SimplePermissionTest;
