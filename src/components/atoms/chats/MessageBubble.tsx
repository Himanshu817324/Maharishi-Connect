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
          /* Copy to clipboard - keep original placeholder */
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
      // Guard: message object + message_type
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
              activeOpacity={0.85}
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
              {message.content ? (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );

        case 'video':
          return (
            <TouchableOpacity
              onPress={() => onMediaPress?.(message)}
              activeOpacity={0.85}
            >
              <View style={[styles.mediaPlaceholder, { borderColor: isOwn ? colors.chatBubble : colors.chatBubbleOther }]}>
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
              {message.content ? (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );

        case 'audio':
          return (
            <TouchableOpacity
              onPress={() => onMediaPress?.(message)}
              activeOpacity={0.85}
            >
              <View style={[styles.mediaPlaceholder, { borderColor: isOwn ? colors.chatBubble : colors.chatBubbleOther }]}>
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
              {message.content ? (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              ) : null}
            </TouchableOpacity>
          );

        case 'file':
          return (
            <View>
              <View style={[styles.mediaPlaceholder, { borderColor: isOwn ? colors.chatBubble : colors.chatBubbleOther }]}>
                <Text
                  style={[
                    styles.mediaText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  📄 {message.media_metadata?.filename || 'File'}
                </Text>
              </View>
              {message.content ? (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {String(message.content)}
                </Text>
              ) : null}
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
            numberOfLines={1}
            ellipsizeMode="tail"
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
      {/* Avatar (optional) */}
      {showAvatar && !isOwn && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
              {message.sender?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
      )}

      {/* Message wrapper */}
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
          activeOpacity={0.85}
        >
          {/* Two-row layout: content then metadata */}
          <View style={styles.messageContentContainer}>
            {/* First row: message content (text/media) */}
            <View style={styles.messageBody}>
              {renderMessageContent()}
            </View>

            {/* Second row: metadata */}
            {showTime && (
              <View style={styles.metadataRow}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: isOwn ? colors.chatBubbleText : colors.chatBubbleTextOther,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {formatTime(message.created_at)}
                  {message.edited_at && (
                    <Text style={styles.editedText}> (edited)</Text>
                  )}
                </Text>

                {/* Message status - only show for own messages */}
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
    marginVertical: hp(0.3), // tight vertical spacing
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

  /* messageContainer no longer flex:1 — use shrink so bubble wraps content */
  messageContainer: {
    maxWidth: wp(85),
    flexShrink: 1,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },

  /* Sender name inside bubble for group chats */
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
    maxWidth: wp(85),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    borderTopRightRadius: moderateScale(4), // pointed edge look
  },
  otherBubble: {
    borderTopLeftRadius: moderateScale(4),
    borderWidth: 1,
  },

  /* Text container */
  messageTextContainer: {
    flexShrink: 1,
    marginRight: wp(1),
    minWidth: 0,
  },
  messageText: {
    fontSize: responsiveFont(16),
    lineHeight: responsiveFont(22),
    flexWrap: 'wrap',
    flexShrink: 1,
    flexGrow: 0,
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 0,
  },

  /* Media styling - responsive */
  mediaImage: {
    width: wp(60), // larger on wider screens but constrained by maxWidth of bubble
    height: hp(24),
    borderRadius: moderateScale(8),
    marginBottom: hp(0.4),
    maxWidth: '100%',
  },
  mediaPlaceholder: {
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 0,
    borderWidth: 1,
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
    marginBottom: 0,
  },

  /* TWO-ROW LAYOUT: ensures bubble wraps content and metadata stays close */
  messageContentContainer: {
    flexDirection: 'column', // stack content and metadata vertically
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
  },
  messageBody: {
    flexShrink: 1,
    flexGrow: 0,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end', // bottom-right position inside bubble
    marginTop: hp(0.3),
    gap: wp(0.5),
    flexShrink: 1,
  },

  timeText: {
    fontSize: responsiveFont(11),
    opacity: 0.6,
    fontWeight: '700',
  },
  editedText: {
    fontSize: responsiveFont(9),
    fontWeight: '600',
    opacity: 0.6,
    fontStyle: 'italic',
  },
});

export default MessageBubble;
