# Permission Fixes for Media Sharing

## Overview

This document outlines the comprehensive permission fixes implemented to resolve permission errors in the WhatsApp-style media sharing feature.

## Issues Fixed

### 1. **Android Manifest Permissions**
- Added explicit permissions for all Android versions
- Properly configured permissions for Android 13+ (API 33+)
- Added granular media permissions for modern Android versions

### 2. **Permission Request Logic**
- Implemented version-specific permission handling
- Added comprehensive error handling and user feedback
- Created permission helper service for better management

### 3. **User Experience**
- Added permission test component for debugging
- Improved error messages with actionable steps
- Added settings button to open app permissions

## Android Manifest Changes

### Added Permissions
```xml
<!-- Camera and Media Permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />

<!-- Storage Permissions (Android < 13) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />

<!-- Media Access Permissions (Android 13+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.WRITE_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.WRITE_MEDIA_VIDEO" />

<!-- Additional Permissions -->
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## New Files Created

### 1. **`src/services/permissionHelper.ts`**
Comprehensive permission management service with:
- Version-specific permission handling
- User-friendly error messages
- Settings redirection
- Permission status checking

### 2. **`src/components/PermissionTest.tsx`**
Debug component for testing permissions:
- Individual permission tests
- Bulk permission testing
- Visual feedback for test results
- Easy access from media picker

## Updated Files

### 1. **`src/services/mediaService.ts`**
- Integrated permission helper
- Better error handling
- Version-specific permission requests
- Improved logging and debugging

### 2. **`src/components/MediaPicker.tsx`**
- Added permission test access
- Settings button in header
- Better error feedback

### 3. **`android/app/src/main/AndroidManifest.xml`**
- Added comprehensive permissions
- Version-specific permission configuration
- Proper permission grouping

## Permission Handling by Android Version

### Android < 13 (API < 33)
```typescript
const permissions = [
  PermissionsAndroid.PERMISSIONS.CAMERA,
  PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
];
```

### Android 13+ (API 33+)
```typescript
const permissions = [
  PermissionsAndroid.PERMISSIONS.CAMERA,
  PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
  PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
  PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
];
```

## Usage Examples

### Basic Permission Check
```typescript
import { permissionHelper } from '@/services/permissionHelper';

// Check single permission
const hasCamera = await permissionHelper.checkPermission(
  PermissionsAndroid.PERMISSIONS.CAMERA
);

// Request multiple permissions
const result = await permissionHelper.requestMultiplePermissions([
  PermissionsAndroid.PERMISSIONS.CAMERA,
  PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
]);
```

### Permission Test Component
```typescript
import PermissionTest from '@/components/PermissionTest';

<PermissionTest
  visible={showTest}
  onClose={() => setShowTest(false)}
/>
```

## Testing Permissions

### 1. **Manual Testing**
- Open MediaPicker
- Tap settings icon (gear) in header
- Run permission tests
- Check individual permission status

### 2. **Debug Logging**
All permission requests are logged with:
- Permission type being requested
- Android version
- Permission results
- Error details

### 3. **Error Handling**
- User-friendly error messages
- Settings redirection for denied permissions
- Retry options for failed permissions

## Common Permission Issues and Solutions

### Issue: "Permission denied" errors
**Solution:**
1. Check Android manifest has required permissions
2. Verify permission requests are made before media operations
3. Use permission test component to debug

### Issue: "Storage permission denied" on Android 13+
**Solution:**
1. Use granular media permissions (READ_MEDIA_IMAGES, etc.)
2. Don't use READ_EXTERNAL_STORAGE on Android 13+
3. Check permission helper is using correct permissions

### Issue: "Camera permission denied"
**Solution:**
1. Ensure CAMERA permission is in manifest
2. Request permission before camera operations
3. Handle permission denial gracefully

## Debugging Tips

### 1. **Check Console Logs**
Look for permission-related logs:
```
🔐 Requesting permissions for: image
📱 Android version: 33
🔐 Permission results: {...}
```

### 2. **Use Permission Test**
- Access via MediaPicker settings button
- Run individual tests
- Check which permissions are failing

### 3. **Verify Manifest**
- Ensure all required permissions are present
- Check permission syntax is correct
- Verify maxSdkVersion attributes

## Best Practices

### 1. **Request Permissions Early**
Request permissions before showing media picker options.

### 2. **Handle Denial Gracefully**
Show user-friendly messages and provide settings access.

### 3. **Version-Specific Handling**
Use different permission sets for different Android versions.

### 4. **Test on Multiple Devices**
Test on different Android versions to ensure compatibility.

## Troubleshooting

### Permission Still Denied?
1. Check device settings manually
2. Clear app data and reinstall
3. Verify manifest permissions are correct
4. Check if permission was permanently denied

### App Crashes on Permission Request?
1. Check console for error logs
2. Verify permission strings are correct
3. Ensure permissions are in manifest
4. Test on different Android versions

### Media Picker Not Working?
1. Run permission tests first
2. Check if all required permissions are granted
3. Verify media service is using correct permissions
4. Test individual media types

This comprehensive permission system should resolve all permission-related issues with the media sharing feature.
