import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale, responsiveFont, wp, hp } from '@/theme/responsive';
import { MessageData } from '@/services/chatService';
import MessageStatusIndicator from '@/components/MessageStatusIndicator';
import FileMessageBubble from '@/components/FileMessageBubble';
import MediaPreview from '@/components/MediaPreview';
import Icon from 'react-native-vector-icons/Ionicons';

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
}) => {
  const { colors } = useTheme();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video' | 'audio' | 'file'>('file');

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderImageMessage = () => {
    const mediaUrl = message.media_url;
    if (!mediaUrl) {
      return (
        <Text style={[styles.messageText, { color: isOwn ? colors.textOnPrimary : colors.text }]}>
          Image not available
        </Text>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <TouchableOpacity
          onPress={() => handleMediaPress(mediaUrl, 'image')}
          style={styles.mediaButton}
        >
          <Image
            source={{ uri: mediaUrl }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        </TouchableOpacity>
        {message.content && (
          <Text style={[styles.mediaCaption, { color: isOwn ? colors.textOnPrimary : colors.text }]}>
            {message.content}
          </Text>
        )}
      </View>
    );
  };

  const renderVideoMessage = () => {
    const mediaUrl = message.media_url;
    if (!mediaUrl) {
      return (
        <Text style={[styles.messageText, { color: isOwn ? colors.textOnPrimary : colors.text }]}>
          Video not available
        </Text>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <TouchableOpacity
          onPress={() => handleMediaPress(mediaUrl, 'video')}
          style={styles.mediaButton}
        >
          <View style={[styles.videoPreview, { backgroundColor: colors.border }]}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶️</Text>
            </View>
          </View>
        </TouchableOpacity>
        {message.content && (
          <Text style={[styles.mediaCaption, { color: isOwn ? colors.textOnPrimary : colors.text }]}>
            {message.content}
          </Text>
        )}
      </View>
    );
  };

  const renderAudioMessage = () => {
    const mediaUrl = message.media_url;
    if (!mediaUrl) {
      return (
        <Text style={[styles.messageText, { color: isOwn ? colors.textOnPrimary : colors.text }]}>
          Audio not available
        </Text>
      );
    }

    const audioContainerStyle = {
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : colors.border,
    };
    const audioTextStyle = {
      color: isOwn ? colors.textOnPrimary : colors.text,
    };
    const audioSubtextStyle = {
      color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
    };

    return (
      <View style={styles.mediaContainer}>
        <TouchableOpacity
          onPress={() => handleMediaPress(mediaUrl, 'audio')}
          style={[styles.audioContainer, audioContainerStyle]}
        >
          <View style={styles.audioInfo}>
            <Text style={[styles.audioText, audioTextStyle]}>
              Audio Message
            </Text>
            <Text style={[styles.audioSubtext, audioSubtextStyle]}>
              Tap to play
            </Text>
          </View>
        </TouchableOpacity>
        {message.content && (
          <Text style={[styles.mediaCaption, { color: isOwn ? colors.textOnPrimary : colors.text }]}>
            {message.content}
          </Text>
        )}
      </View>
    );
  };

  const renderFileMessage = () => {
    return (
      <FileMessageBubble
        message={message}
        isOwn={isOwn}
        onDownload={(url) => handleMediaPress(url, 'file')}
        onPreview={(url, type) => handleMediaPress(url, type)}
      />
    );
  };

  const handleMediaPress = async (url: string, type: string) => {
    try {
      console.log(`📱 Opening ${type} media preview:`, url);
      console.log('📱 Current previewVisible state:', previewVisible);
      
      // Create a file object for the preview
      const file = {
        uri: url,
        name: message.content || `${type} file`,
        type: getMimeTypeFromMessageType(type),
        size: 0, // We don't have size info from the message
      };

      console.log('📱 Created file object:', file);
      console.log('📱 Setting preview states...');

      // Show preview instead of opening external link
      setPreviewFile(file);
      setPreviewMediaType(type as 'image' | 'video' | 'audio' | 'file');
      setPreviewVisible(true);
      
      console.log('📱 States set, previewVisible should be true now');
    } catch (error) {
      console.error('Error opening media preview:', error);
      Alert.alert('Error', 'Failed to open media preview');
    }
  };

  const getMimeTypeFromMessageType = (messageType: string): string => {
    switch (messageType) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      case 'audio':
        return 'audio/mpeg';
      case 'file':
        return 'application/octet-stream';
      default:
        return 'application/octet-stream';
    }
  };

  const handlePreviewClose = () => {
    setPreviewVisible(false);
    setPreviewFile(null);
  };

  const handlePreviewConfirm = (_file: any) => {
    // For chat messages, we don't need to do anything after preview
    // The preview is just for viewing, not for sharing
    setPreviewVisible(false);
    setPreviewFile(null);
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
          return renderImageMessage();

        case 'video':
          return renderVideoMessage();

        case 'audio':
          return renderAudioMessage();

        case 'file':
          return renderFileMessage();

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

      {/* Media Preview Modal */}
      {console.log('📱 Rendering MediaPreview with props:', {
        visible: previewVisible,
        file: previewFile,
        mediaType: previewMediaType
      })}
      <MediaPreview
        visible={previewVisible}
        onClose={handlePreviewClose}
        onConfirm={handlePreviewConfirm}
        file={previewFile}
        mediaType={previewMediaType}
      />
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

  // Media message styles
  mediaContainer: {
    marginVertical: moderateScale(4),
  },
  mediaButton: {
    position: 'relative',
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  imagePreview: {
    width: wp(60),
    height: wp(40),
    borderRadius: moderateScale(8),
  },
  videoPreview: {
    width: wp(60),
    height: wp(40),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: moderateScale(20),
    color: '#FFFFFF',
  },
  mediaOverlay: {
    position: 'absolute',
    top: moderateScale(8),
    right: moderateScale(8),
  },
  mediaIconContainer: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaIcon: {
    fontSize: moderateScale(12),
  },
  mediaCaption: {
    fontSize: responsiveFont(14),
    marginTop: moderateScale(8),
    lineHeight: responsiveFont(18),
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    minWidth: wp(50),
  },
  audioIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  audioIcon: {
    fontSize: moderateScale(20),
  },
  audioInfo: {
    flex: 1,
  },
  audioText: {
    fontSize: responsiveFont(14),
    fontWeight: '500',
    marginBottom: moderateScale(2),
  },
  audioSubtext: {
    fontSize: responsiveFont(12),
  },
});

export default MessageBubble;
