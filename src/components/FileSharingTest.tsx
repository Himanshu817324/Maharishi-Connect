import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { fileUploadService } from '@/services/fileUploadService';
import { fileSharingPermissionManager } from '@/services/fileSharingPermissionManager';
import { permissionService } from '@/services/permissionService';
import MediaPickerModal from './MediaPickerModal';
import FileSharingModal from './FileSharingModal';
import Toast from 'react-native-toast-message';

interface FileSharingTestProps {
  visible: boolean;
  onClose: () => void;
  chatId?: string;
  userId?: string;
}

const FileSharingTest: React.FC<FileSharingTestProps> = ({
  visible,
  onClose,
  chatId,
  userId,
}) => {
  const { colors } = useTheme();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showFileSharing, setShowFileSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`🧪 File Sharing Test: ${message}`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testPermissions = async () => {
    addResult('🔐 Testing file sharing permissions...');
    setIsLoading(true);

    try {
      const permissions = await fileSharingPermissionManager.checkFileSharingPermissions();
      addResult(`📊 Permission Results: ${JSON.stringify(permissions, null, 2)}`);

      if (!permissions.allGranted) {
        addResult('⚠️ Some permissions are missing, requesting...');
        const requestResult = await fileSharingPermissionManager.requestFileSharingPermissions();
        addResult(`📝 Request Results: ${JSON.stringify(requestResult, null, 2)}`);
      } else {
        addResult('✅ All permissions granted!');
      }
    } catch (error) {
      addResult(`❌ Permission test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFileUpload = async () => {
    if (!chatId || !userId) {
      addResult('❌ Missing chatId or userId for file upload test');
      return;
    }

    addResult('📤 Testing file upload service...');
    setIsLoading(true);

    try {
      // Create a test file object
      const testFile = {
        uri: 'file://test.txt',
        name: 'test-file.txt',
        type: 'text/plain',
        size: 1024,
      };

      addResult(`📁 Test file: ${JSON.stringify(testFile, null, 2)}`);

      // Test file validation
      const validation = fileUploadService.validateFile(testFile);
      addResult(`✅ File validation: ${JSON.stringify(validation, null, 2)}`);

      if (!validation.valid) {
        addResult(`❌ File validation failed: ${validation.error}`);
        return;
      }

      // Test file upload (this will fail without real file, but we can test the service)
      addResult('🚀 Attempting file upload...');
      const uploadResult = await fileUploadService.uploadFile(testFile, userId);
      addResult(`📤 Upload result: ${JSON.stringify(uploadResult, null, 2)}`);

    } catch (error) {
      addResult(`❌ File upload test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFileSharing = async () => {
    if (!chatId || !userId) {
      addResult('❌ Missing chatId or userId for file sharing test');
      return;
    }

    addResult('📤 Testing file sharing in chat...');
    setIsLoading(true);

    try {
      // Test getting user files
      addResult('📁 Loading user files...');
      const userFiles = await fileUploadService.getUserFiles(userId, 10, 0);
      addResult(`📁 User files loaded: ${userFiles.length} files`);

      if (userFiles.length > 0) {
        const firstFile = userFiles[0];
        addResult(`📄 First file: ${JSON.stringify(firstFile, null, 2)}`);

        // Test file sharing
        addResult('📤 Testing file sharing...');
        const shareResult = await fileUploadService.shareFileInChat(
          {
            id: firstFile.id,
            s3Url: firstFile.s3Url || firstFile.mediaUrl || '',
            originalName: firstFile.originalName,
            size: firstFile.size,
            mimeType: firstFile.mimeType,
            s3Key: firstFile.s3Key,
          },
          chatId,
          'Test file share from debug'
        );

        addResult(`📤 Share result: ${JSON.stringify(shareResult, null, 2)}`);
      } else {
        addResult('⚠️ No files available for sharing test');
      }

    } catch (error) {
      addResult(`❌ File sharing test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testMediaPicker = () => {
    addResult('📱 Opening media picker...');
    setShowMediaPicker(true);
  };

  const testFileSharingModal = () => {
    if (!chatId || !userId) {
      addResult('❌ Missing chatId or userId for file sharing modal test');
      return;
    }
    addResult('📁 Opening file sharing modal...');
    setShowFileSharing(true);
  };

  const testAll = async () => {
    addResult('🚀 Starting comprehensive file sharing test...');
    clearResults();

    await testPermissions();
    await testFileUpload();
    await testFileSharing();

    addResult('✅ File sharing test completed!');
  };

  const handleFileSelected = (file: any, type: 'image' | 'video' | 'audio' | 'file') => {
    addResult(`📁 File selected: ${type} - ${file.name || file.fileName}`);
    addResult(`📄 File details: ${JSON.stringify(file, null, 2)}`);
    setShowMediaPicker(false);
  };

  const handleFileShared = (file: any) => {
    addResult(`📤 File shared: ${file.originalName}`);
    setShowFileSharing(false);
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            File Sharing Test
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={moderateScale(24)} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.accent }]}
              onPress={testAll}
              disabled={isLoading}
            >
              <Icon name="play" size={moderateScale(20)} color="#FFFFFF" />
              <Text style={styles.buttonText}>Run All Tests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={testPermissions}
              disabled={isLoading}
            >
              <Icon name="shield-checkmark" size={moderateScale(20)} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.secondary }]}
              onPress={testFileUpload}
              disabled={isLoading}
            >
              <Icon name="cloud-upload" size={moderateScale(20)} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Upload</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.accent }]}
              onPress={testFileSharing}
              disabled={isLoading}
            >
              <Icon name="share" size={moderateScale(20)} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Sharing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={testMediaPicker}
              disabled={isLoading}
            >
              <Icon name="camera" size={moderateScale(20)} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Media Picker</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.secondary }]}
              onPress={testFileSharingModal}
              disabled={isLoading}
            >
              <Icon name="folder" size={moderateScale(20)} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test File Modal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.border }]}
              onPress={clearResults}
            >
              <Icon name="trash" size={moderateScale(20)} color={colors.text} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Clear Results</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.resultsContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.resultsTitle, { color: colors.text }]}>
              Test Results
            </Text>
            <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
              {testResults.map((result, index) => (
                <Text
                  key={index}
                  style={[styles.resultText, { color: colors.textSecondary }]}
                >
                  {result}
                </Text>
              ))}
              {testResults.length === 0 && (
                <Text style={[styles.noResults, { color: colors.textSecondary }]}>
                  No test results yet. Run a test to see results here.
                </Text>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Media Picker Modal */}
      <MediaPickerModal
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onFileSelected={handleFileSelected}
        chatId={chatId}
        userId={userId}
      />

      {/* File Sharing Modal */}
      {chatId && userId && (
        <FileSharingModal
          visible={showFileSharing}
          onClose={() => setShowFileSharing(false)}
          onFileShared={handleFileShared}
          chatId={chatId}
          userId={userId}
        />
      )}
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
    zIndex: 1000,
  },
  container: {
    flex: 1,
    marginTop: hp(10),
    marginHorizontal: wp(5),
    borderRadius: moderateScale(16),
    maxHeight: hp(80),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
    borderBottomWidth: 1,
  },
  title: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  closeButton: {
    padding: moderateScale(4),
  },
  content: {
    flex: 1,
    padding: moderateScale(16),
  },
  buttonContainer: {
    gap: moderateScale(12),
    marginBottom: moderateScale(20),
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: responsiveFont(14),
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
  },
  resultsTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: moderateScale(8),
  },
  resultsScroll: {
    flex: 1,
  },
  resultText: {
    fontSize: responsiveFont(12),
    lineHeight: responsiveFont(16),
    marginBottom: moderateScale(4),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noResults: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: moderateScale(20),
  },
});

export default FileSharingTest;
