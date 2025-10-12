import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale } from '@/theme/responsive';
import { imagePersistenceService, ImagePersistenceResult } from '@/services/imagePersistenceService';

interface PersistentImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string };
  showLoadingIndicator?: boolean;
  fallbackComponent?: React.ReactNode;
  onPersistenceResult?: (result: ImagePersistenceResult) => void;
}

const PersistentImage: React.FC<PersistentImageProps> = ({
  source,
  showLoadingIndicator = true,
  fallbackComponent,
  onPersistenceResult,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string>(source.uri);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPersistentImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        if (!source.uri) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

        console.log('🖼️ [PersistentImage] Loading image:', source.uri);

        // Check if this is a local file URI (file:// or content://)
        const isLocalUri = source.uri.startsWith('file://') || source.uri.startsWith('content://');
        
        if (isLocalUri) {
          console.log('🖼️ [PersistentImage] Local URI detected, using directly:', source.uri);
          if (isMounted) {
            setImageUri(source.uri);
            setIsLoading(false);
          }
          return;
        }

        // For remote URLs, try to persist them
        const persistedPath = await imagePersistenceService.getPersistedImagePath(source.uri);
        
        if (persistedPath) {
          console.log('🖼️ [PersistentImage] Using persisted image:', persistedPath);
          if (isMounted) {
            setImageUri(persistedPath);
            setIsLoading(false);
          }
          return;
        }

        // If not persisted, persist it now
        const result = await imagePersistenceService.persistImage(source.uri);
        
        if (!isMounted) return;

        if (result.success && result.localPath) {
          console.log('🖼️ [PersistentImage] Image persisted successfully:', result.localPath);
          setImageUri(result.localPath);
          onPersistenceResult?.(result);
        } else {
          console.log('🖼️ [PersistentImage] Using original URL as fallback');
          setImageUri(source.uri);
          onPersistenceResult?.(result);
        }
      } catch (error) {
        console.error('🖼️ [PersistentImage] Error loading persistent image:', error);
        if (isMounted) {
          setImageUri(source.uri); // Fallback to original URL
          setHasError(false); // Don't show error, just use original URL
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPersistentImage();

    return () => {
      isMounted = false;
    };
  }, [source.uri, onPersistenceResult]);

  if (isLoading && showLoadingIndicator) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (hasError) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Failed to load image
        </Text>
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri: imageUri }}
      style={style}
      onError={() => {
        console.error('🖼️ [PersistentImage] Image load error for URI:', imageUri);
        setHasError(true);
      }}
      onLoad={() => {
        console.log('🖼️ [PersistentImage] Image loaded successfully:', imageUri);
      }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: moderateScale(8),
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: moderateScale(8),
    padding: moderateScale(8),
  },
  errorText: {
    fontSize: moderateScale(12),
    textAlign: 'center',
  },
});

export default PersistentImage;
