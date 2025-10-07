import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { MessageData } from '@/services/chatService';
import MessageStatusIndicator from '@/components/MessageStatusIndicator';

interface MessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  showAvatar?: boolean;
  showTime?: boolean;
  isGroupChat?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  showTime = true,
  isGroupChat = false,
  onPress,
  onLongPress: _onLongPress,
  onReply,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLongPress = () => {
    Alert.alert('Message Options', 'What would you like to do?', [
      { text: 'Reply', onPress: onReply },
      {
        text: 'Copy',
        onPress: () => {
          /* Copy to clipboard */
        },
      },
      ...(isOwn
        ? [
            { text: 'Edit', onPress: onEdit },
            {
              text: 'Delete',
              onPress: onDelete,
              style: 'destructive' as const,
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const renderMessageContent = () => {
    const renderContent = () => {
      // Ensure message has required properties
      if (!message || !message.message_type) {
        return (
          <Text
            style={[
              styles.messageText,
              { color: isOwn ? colors.textOnPrimary : colors.text },
            ]}
          >
            Invalid message
          </Text>
        );
      }

      switch (message.message_type) {
        case 'text':
          return (
            <Text
              style={[
                styles.messageText,
                { color: isOwn ? colors.textOnPrimary : colors.text },
              ]}
            >
              {String(message.content || 'No content')}
            </Text>
          );

        case 'image':
          return (
            <View>
              <Image
                source={{ uri: message.media_url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              {message.content && (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              )}
            </View>
          );

        case 'video':
          return (
            <View>
              <View style={styles.mediaPlaceholder}>
                <Text
                  style={[
                    styles.mediaText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  📹 Video
                </Text>
              </View>
              {message.content && (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              )}
            </View>
          );

        case 'audio':
          return (
            <View>
              <View style={styles.mediaPlaceholder}>
                <Text
                  style={[
                    styles.mediaText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  🎵 Audio
                </Text>
              </View>
              {message.content && (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              )}
            </View>
          );

        case 'file':
          return (
            <View>
              <View style={styles.mediaPlaceholder}>
                <Text
                  style={[
                    styles.mediaText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  📄 {message.media_metadata?.filename || 'File'}
                </Text>
              </View>
              {message.content && (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              )}
            </View>
          );

        default:
          return (
            <Text
              style={[
                styles.messageText,
                { color: isOwn ? colors.textOnPrimary : colors.text },
              ]}
            >
              {String(message.content || 'Unknown message type')}
            </Text>
          );
      }
    };

    return (
      <View>
        {/* Show sender name inside message bubble for group chats only */}
        {isGroupChat && !isOwn && message.sender?.fullName && (
          <Text
            style={[
              styles.senderNameInside,
              { color: isOwn ? colors.textOnPrimary : colors.textSecondary },
            ]}
          >
            {message.sender.fullName}
          </Text>
        )}
        {renderContent()}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      {showAvatar && !isOwn && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
              {message.sender?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.bubble,
            {
              backgroundColor: isOwn ? colors.accent : colors.surface,
              borderColor: isOwn ? colors.accent : colors.border,
            },
          ]}
          onPress={onPress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          {renderMessageContent()}

          {showTime && (
            <View style={styles.timeContainer}>
              <Text
                style={[
                  styles.timeText,
                  {
                    color: isOwn ? colors.textOnPrimary : colors.textSecondary,
                  },
                ]}
              >
                {formatTime(message.created_at)}
                {message.edited_at && (
                  <Text style={styles.editedText}> (edited)</Text>
                )}
              </Text>
            </View>
          )}

          {/* Message Status Indicator - Only show for own messages */}
          {isOwn && (
            <>
              {console.log('🔍 MessageBubble rendering status indicator:', { 
                messageId: message.id, 
                status: message.status, 
                isOwn 
              })}
              <MessageStatusIndicator
                status={message.status || 'sent'}
                showText={true}
                showIcon={true}
                size="small"
                readCount={message.read_by?.length || 0}
                totalRecipients={1} // For direct chats, this would be 1
                canRetry={message.status === 'failed'}
                onRetry={() => {
                  // Handle retry logic here
                  console.log('Retrying message:', message.id);
                }}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: hp(0.8), // Increased vertical margin for better spacing
    paddingHorizontal: wp(2), // Reduced padding for more space
    minHeight: hp(5), // Increased minimum height for touch targets
    alignItems: 'flex-end', // Align items to bottom for better text alignment
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: moderateScale(8),
    justifyContent: 'flex-end',
  },
  avatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  messageContainer: {
    flex: 1,
    maxWidth: wp(80), // Use responsive width
    minWidth: wp(20), // Ensure minimum width
    marginHorizontal: wp(1), // Add horizontal margin for better spacing
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  senderNameInside: {
    fontSize: responsiveFont(11),
    fontWeight: '600',
    marginBottom: hp(0.2),
    opacity: 0.8,
  },
  bubble: {
    paddingHorizontal: wp(4), // Increased padding for better text spacing
    paddingVertical: hp(1.5), // Increased vertical padding
    paddingBottom: hp(1), // Less bottom padding to accommodate time
    borderRadius: moderateScale(20), // More rounded corners
    borderWidth: 1,
    minHeight: hp(5), // Increased minimum height
    maxWidth: '100%', // Ensure bubble doesn't exceed container
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2, // Increased shadow offset
    },
    shadowOpacity: 0.15, // Increased shadow opacity
    shadowRadius: 4, // Increased shadow radius
    elevation: 3, // Increased elevation for Android
  },
  messageText: {
    fontSize: responsiveFont(16),
    lineHeight: responsiveFont(22),
    flexWrap: 'wrap',
    flexShrink: 1, // Allow text to shrink if needed
    flexGrow: 0, // Don't grow beyond content
    textAlign: 'left', // Ensure consistent text alignment
    includeFontPadding: false, // Remove extra font padding on Android
    textAlignVertical: 'center', // Center text vertically on Android
    marginBottom: hp(0.2), // Small margin to separate from time
  },
  mediaImage: {
    width: wp(50),
    height: hp(20),
    borderRadius: moderateScale(8),
    marginBottom: hp(0.5),
    maxWidth: wp(80), // Ensure it doesn't exceed screen width
  },
  mediaPlaceholder: {
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: moderateScale(4),
  },
  mediaText: {
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
  timeContainer: {
    marginTop: hp(0.5),
    alignItems: 'flex-end', // Align time to the right
  },
  timeText: {
    fontSize: responsiveFont(10),
    opacity: 0.7, // Slightly transparent for subtle appearance
    fontWeight: '500',
  },
  editedText: {
    fontSize: responsiveFont(9),
    opacity: 0.6,
    fontStyle: 'italic',
  },
});

export default MessageBubble;
