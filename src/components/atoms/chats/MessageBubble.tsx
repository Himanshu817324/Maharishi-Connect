import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import OptimizedIcon from '@/components/atoms/ui/OptimizedIcon';
import PersistentImage from '@/components/atoms/ui/PersistentImage';
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
  onMediaPress?: (message: MessageData) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = memo(({
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
  onMediaPress,
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
            <View style={styles.messageTextContainer}>
              <Text
                style={[
                  styles.messageText,
                  { color: isOwn ? colors.chatBubbleText : colors.chatBubbleTextOther },
                ]}
              >
                {String(message.content || 'No content')}
              </Text>
            </View>
          );

        case 'image':
          return (
            <TouchableOpacity
              onPress={() => onMediaPress?.(message)}
              activeOpacity={0.8}
            >
              <PersistentImage
                source={{ uri: message.media_url || '' }}
                style={styles.mediaImage}
                resizeMode="cover"
                showLoadingIndicator={true}
                onPersistenceResult={(result) => {
                  if (result.success) {
                    console.log('🖼️ [MessageBubble] Image persisted successfully');
                  } else {
                    console.log('🖼️ [MessageBubble] Image persistence failed, using original URL');
                  }
                }}
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
            </TouchableOpacity>
          );

        case 'video':
          return (
            <TouchableOpacity
              onPress={() => onMediaPress?.(message)}
              activeOpacity={0.8}
            >
              <View style={styles.mediaPlaceholder}>
                <OptimizedIcon name="play-circle" size={moderateScale(40)} color={isOwn ? colors.textOnPrimary : colors.accent} />
                <Text
                  style={[
                    styles.mediaText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  📹 Video
                </Text>
                {message.media_metadata?.duration && (
                  <Text
                    style={[
                      styles.mediaDuration,
                      { color: isOwn ? colors.textOnPrimary : colors.textSecondary },
                    ]}
                  >
                    {Math.floor(message.media_metadata.duration / 1000)}s
                  </Text>
                )}
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
            </TouchableOpacity>
          );

        case 'audio':
          return (
            <TouchableOpacity
              onPress={() => onMediaPress?.(message)}
              activeOpacity={0.8}
            >
              <View style={styles.mediaPlaceholder}>
                <OptimizedIcon name="musical-notes" size={moderateScale(40)} color={isOwn ? colors.textOnPrimary : colors.accent} />
                <Text
                  style={[
                    styles.mediaText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  🎵 Audio
                </Text>
                {message.media_metadata?.duration && (
                  <Text
                    style={[
                      styles.mediaDuration,
                      { color: isOwn ? colors.textOnPrimary : colors.textSecondary },
                    ]}
                  >
                    {Math.floor(message.media_metadata.duration / 1000)}s
                  </Text>
                )}
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
            </TouchableOpacity>
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
            isOwn ? styles.ownBubble : styles.otherBubble,
            {
              backgroundColor: isOwn ? colors.chatBubble : colors.chatBubbleOther,
              borderColor: isOwn ? colors.chatBubble : colors.chatBubbleOther,
            },
          ]}
          onPress={onPress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          <View style={styles.messageContentContainer}>
            {renderMessageContent()}
            
            {showTime && (
              <View style={styles.timeAndStatusContainer}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: isOwn ? colors.chatBubbleText : colors.chatBubbleTextOther,
                    },
                  ]}
                >
                  {formatTime(message.created_at)}
                  {message.edited_at && (
                    <Text style={styles.editedText}> (edited)</Text>
                  )}
                </Text>
                
                {/* Message Status Indicator - Only show for own messages */}
                {isOwn && (
                  <MessageStatusIndicator
                    status={message.status || 'sent'}
                    showText={false}
                    showIcon={true}
                    size="small"
                    readCount={message.read_by?.length || 0}
                    totalRecipients={1}
                    canRetry={message.status === 'failed'}
                    onRetry={() => {
                      console.log('Retrying message:', message.id);
                    }}
                  />
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: hp(0.3), // Reduced margin for WhatsApp-like tight spacing
    paddingHorizontal: wp(2),
    alignItems: 'flex-end',
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
    maxWidth: wp(85), // Increased width to reduce wrapping
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: moderateScale(18),
    minHeight: hp(4),
    maxWidth: wp(85), // Increased width to reduce wrapping
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    borderTopRightRadius: moderateScale(4), // Pointed edge on bottom right (sender's side)
  },
  otherBubble: {
    borderTopLeftRadius: moderateScale(4), // Pointed edge on bottom left (receiver's side)
    borderWidth: 1,
  },
  messageTextContainer: {
    flex: 1,
    flexShrink: 1,
    marginRight: wp(1),
    minWidth: 0,
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
    marginBottom: 0, // Remove bottom margin for inline layout
  },
  mediaImage: {
    width: wp(50),
    height: hp(20),
    borderRadius: moderateScale(8),
    marginBottom: 0, // Remove bottom margin for inline layout
    maxWidth: wp(80), // Ensure it doesn't exceed screen width
  },
  mediaPlaceholder: {
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: 0, // Remove bottom margin for inline layout
  },
  mediaText: {
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
  mediaDuration: {
    fontSize: moderateScale(12),
    textAlign: 'center',
    marginTop: moderateScale(4),
    opacity: 0.8,
    marginBottom: 0, // Remove bottom margin for inline layout
  },
  messageContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start', // Start alignment instead of space-between
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
  timeAndStatusContainer: {
    flexDirection: 'row',
    fontWeight: '800',
    alignItems: 'center',
    marginLeft: wp(1),
    flexShrink: 0,
  },
  timeText: {
    fontSize: responsiveFont(11),
    opacity: 0.6, // More subtle for WhatsApp-like appearance
    fontWeight: '900',
  },
  editedText: {
    fontSize: responsiveFont(9),
    fontWeight: '800',
    opacity: 0.6,
    fontStyle: 'italic',
  },
});

export default MessageBubble;
