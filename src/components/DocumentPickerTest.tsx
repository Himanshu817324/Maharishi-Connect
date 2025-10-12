import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { mediaService } from '@/services/mediaService';

const DocumentPickerTest: React.FC = () => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testDocumentPicker = async () => {
    setIsLoading(true);
    addTestResult('Testing DocumentPicker...');

    try {
      // Test file picking
      const result = await mediaService.pickFiles(1);
      
      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        addTestResult(`✅ Success! Selected: ${file.name}`);
        Alert.alert('Test Success', `Selected file: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes`);
      } else {
        addTestResult(`ℹ️ ${result.error || 'No file selected'}`);
      }
    } catch (error) {
      console.error('DocumentPicker test error:', error);
      addTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testAudioPicker = async () => {
    setIsLoading(true);
    addTestResult('Testing Audio Picker...');

    try {
      const result = await mediaService.pickAudioFiles(1);
      
      if (result.success && result.files.length > 0) {
        const file = result.files[0];
        addTestResult(`✅ Audio Success! Selected: ${file.name}`);
        Alert.alert('Audio Test Success', `Selected file: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes`);
      } else {
        addTestResult(`ℹ️ Audio: ${result.error || 'No audio file selected'}`);
      }
    } catch (error) {
      console.error('Audio picker test error:', error);
      addTestResult(`❌ Audio Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Audio Test Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        DocumentPicker Test
      </Text>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Test if DocumentPicker is properly linked and working
      </Text>

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.accent }]}
        onPress={testDocumentPicker}
        disabled={isLoading}
      >
        <Icon 
          name={isLoading ? "hourglass-outline" : "document-outline"} 
          size={moderateScale(20)} 
          color="#FFFFFF" 
        />
        <Text style={styles.testButtonText}>
          {isLoading ? 'Testing...' : 'Test File Picker'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.primary }]}
        onPress={testAudioPicker}
        disabled={isLoading}
      >
        <Icon 
          name={isLoading ? "hourglass-outline" : "musical-notes-outline"} 
          size={moderateScale(20)} 
          color="#FFFFFF" 
        />
        <Text style={styles.testButtonText}>
          {isLoading ? 'Testing...' : 'Test Audio Picker'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.clearButton, { backgroundColor: colors.error }]}
        onPress={clearResults}
      >
        <Icon name="trash-outline" size={moderateScale(16)} color="#FFFFFF" />
        <Text style={styles.clearButtonText}>Clear Results</Text>
      </TouchableOpacity>

      {testResults.length > 0 && (
        <View style={[styles.resultsContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.resultsTitle, { color: colors.text }]}>Test Results:</Text>
          {testResults.map((result, index) => (
            <Text key={index} style={[styles.resultText, { color: colors.text }]}>
              {result}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.infoContainer, { backgroundColor: colors.accent + '20' }]}>
        <Icon name="information-circle" size={moderateScale(20)} color={colors.accent} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          If the test fails, you may need to rebuild the app with: npx react-native run-android
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: wp(4),
  },
  title: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  description: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: hp(3),
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: moderateScale(8),
    marginBottom: hp(1),
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: moderateScale(8),
    marginBottom: hp(2),
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(14),
    fontWeight: '500',
    marginLeft: wp(1),
  },
  resultsContainer: {
    padding: wp(3),
    borderRadius: moderateScale(8),
    marginBottom: hp(2),
  },
  resultsTitle: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    marginBottom: hp(1),
  },
  resultText: {
    fontSize: responsiveFont(12),
    marginBottom: hp(0.5),
    fontFamily: 'monospace',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3),
    borderRadius: moderateScale(8),
    marginTop: hp(1),
  },
  infoText: {
    fontSize: responsiveFont(12),
    marginLeft: wp(2),
    flex: 1,
    lineHeight: 18,
  },
});

export default DocumentPickerTest;

