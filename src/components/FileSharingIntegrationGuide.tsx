import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';

interface FileSharingIntegrationGuideProps {
  visible: boolean;
  onClose: () => void;
}

const FileSharingIntegrationGuide: React.FC<FileSharingIntegrationGuideProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            File Sharing Integration Guide
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={moderateScale(24)} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🚀 Implementation Complete
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Your file sharing system is now fully integrated! Here's what has been implemented:
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📁 Core Services
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • FileUploadService - S3 integration with backend API
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • FileSharingPermissionManager - Comprehensive permission handling
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Enhanced PermissionService - Android 13+ media permissions
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🎨 UI Components
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • MediaPickerModal - Camera, gallery, documents, audio
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • FileSharingModal - Browse and share existing files
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • FileMessageBubble - Display file messages in chat
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • EnhancedChatInput - Plus button with file sharing options
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🔧 Features Implemented
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Image sharing (camera + gallery)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Video sharing (camera + gallery)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Audio sharing (recording + file selection)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Document sharing (all file types)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • File validation and size limits (100MB max)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Real-time upload progress indicators
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • File preview and download functionality
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🔐 Permissions Handled
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Camera permission for photos/videos
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Storage permissions (Android 12 and below)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Media permissions (Android 13+)
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Microphone permission for audio recording
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • File access permissions for documents
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🧪 Testing & Debugging
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • FileSharingTest component for comprehensive testing
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Console logging for all file operations
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Error handling with user-friendly messages
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                • Toast notifications for success/error states
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📱 Usage
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              The file sharing is now integrated into your chat input. Users can:
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                1. Tap the + button to open media picker
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                2. Tap the folder button to browse existing files
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                3. Select files from camera, gallery, or documents
              </Text>
              <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                4. Files are automatically uploaded and shared
              </Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.accent + '10', padding: moderateScale(16), borderRadius: moderateScale(8) }]}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>
              ✅ Ready to Use!
            </Text>
            <Text style={[styles.sectionText, { color: colors.text }]}>
              Your file sharing system is fully functional and ready for production use. 
              All components are properly integrated with your existing chat system.
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
    zIndex: 1000,
  },
  container: {
    flex: 1,
    marginTop: hp(5),
    marginHorizontal: wp(5),
    borderRadius: moderateScale(16),
    maxHeight: hp(90),
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
  section: {
    marginBottom: moderateScale(20),
  },
  sectionTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: moderateScale(8),
  },
  sectionText: {
    fontSize: responsiveFont(14),
    lineHeight: responsiveFont(20),
    marginBottom: moderateScale(8),
  },
  featureList: {
    marginLeft: moderateScale(8),
  },
  featureItem: {
    fontSize: responsiveFont(14),
    lineHeight: responsiveFont(20),
    marginBottom: moderateScale(4),
  },
});

export default FileSharingIntegrationGuide;
