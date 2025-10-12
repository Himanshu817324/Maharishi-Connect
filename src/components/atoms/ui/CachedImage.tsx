import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { moderateScale } from '@/theme/responsive';
import { imageCacheService, ImageCacheResult } from '@/services/imageCacheService';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string };
  mimeType?: string;
  showLoadingIndicator?: boolean;
  fallbackComponent?: React.ReactNode;
  onCacheResult?: (result: ImageCacheResult) => void;
}

const CachedImage: React.FC<CachedImageProps> = ({
  source,
  mimeType,
  showLoadingIndicator = true,
  fallbackComponent,
  onCacheResult,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCachedImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        if (!source.uri) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

        console.log('🖼️ [CachedImage] Loading image:', source.uri);

        const result = await imageCacheService.getCachedImage(source.uri, mimeType);
        
        if (!isMounted) return;

        if (result.success && result.localPath) {
          console.log('🖼️ [CachedImage] Image cached successfully:', result.localPath);
          setCachedUri(result.localPath);
          onCacheResult?.(result);
        } else {
          console.error('🖼️ [CachedImage] Failed to cache image:', result.error);
          setHasError(true);
          onCacheResult?.(result);
        }
      } catch (error) {
        console.error('🖼️ [CachedImage] Error loading cached image:', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [source.uri, mimeType, onCacheResult]);

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

  if (!cachedUri) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          No image available
        </Text>
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri: cachedUri }}
      style={style}
      onError={() => {
        console.error('🖼️ [CachedImage] Image load error for cached URI:', cachedUri);
        setHasError(true);
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

export default CachedImage;
