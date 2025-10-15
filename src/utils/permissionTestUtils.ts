import { Platform } from 'react-native';
import { permissionHelper } from '@/services/permissionHelper';
import { manifestPermissionManager } from '@/services/manifestPermissionManager';

export interface PermissionTestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
}

export class PermissionTestUtils {
  /**
   * Test all permission-related functionality
   */
  static async runAllPermissionTests(): Promise<PermissionTestResult[]> {
    const results: PermissionTestResult[] = [];
    
    console.log('🧪 Starting comprehensive permission tests...');
    console.log(`📱 Platform: ${Platform.OS}`);
    console.log(`📱 Android Version: ${Platform.Version}`);

    // Test 1: Check Android version detection
    results.push(await this.testAndroidVersionDetection());
    
    // Test 2: Test manifest permission configuration
    results.push(await this.testManifestConfiguration());
    
    // Test 3: Test permission checking
    results.push(await this.testPermissionChecking());
    
    // Test 4: Test storage permissions
    results.push(await this.testStoragePermissions());
    
    // Test 5: Test camera permissions
    results.push(await this.testCameraPermissions());
    
    
    console.log('🧪 Permission tests completed');
    return results;
  }

  /**
   * Test Android version detection
   */
  private static async testAndroidVersionDetection(): Promise<PermissionTestResult> {
    try {
      if (Platform.OS !== 'android') {
        return {
          testName: 'Android Version Detection',
          success: true,
          details: 'Not Android platform'
        };
      }

      const version = Platform.Version;
      const isAndroid13Plus = version >= 33;
      
      return {
        testName: 'Android Version Detection',
        success: true,
        details: {
          version,
          isAndroid13Plus,
          expectedPermissions: isAndroid13Plus ? 'Granular media permissions' : 'Legacy storage permissions'
        }
      };
    } catch (error) {
      return {
        testName: 'Android Version Detection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test manifest permission configuration
   */
  private static async testManifestConfiguration(): Promise<PermissionTestResult> {
    try {
      if (Platform.OS !== 'android') {
        return {
          testName: 'Manifest Configuration',
          success: true,
          details: 'Not Android platform'
        };
      }

      const manifestSummary = manifestPermissionManager.getManifestSummary();
      const permissionGroups = manifestPermissionManager.getPermissionGroups();
      
      return {
        testName: 'Manifest Configuration',
        success: true,
        details: {
          manifestSummary,
          permissionGroups: permissionGroups.map(group => ({
            name: group.name,
            permissionCount: group.permissions.length,
            description: group.description
          }))
        }
      };
    } catch (error) {
      return {
        testName: 'Manifest Configuration',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test permission checking functionality
   */
  private static async testPermissionChecking(): Promise<PermissionTestResult> {
    try {
      if (Platform.OS !== 'android') {
        return {
          testName: 'Permission Checking',
          success: true,
          details: 'Not Android platform'
        };
      }

      const storagePermissions = permissionHelper.getStoragePermissions();
      const cameraPermissions = permissionHelper.getCameraPermissions();
      
      const storageChecks = await Promise.all(
        storagePermissions.map(p => permissionHelper.checkPermission(p))
      );
      
      const cameraChecks = await Promise.all(
        cameraPermissions.map(p => permissionHelper.checkPermission(p))
      );

      return {
        testName: 'Permission Checking',
        success: true,
        details: {
          storagePermissions,
          cameraPermissions,
          storageGranted: storageChecks.every(granted => granted),
          cameraGranted: cameraChecks.every(granted => granted),
          storageChecks,
          cameraChecks
        }
      };
    } catch (error) {
      return {
        testName: 'Permission Checking',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test storage permissions
   */
  private static async testStoragePermissions(): Promise<PermissionTestResult> {
    try {
      if (Platform.OS !== 'android') {
        return {
          testName: 'Storage Permissions',
          success: true,
          details: 'Not Android platform'
        };
      }

      const permissions = permissionHelper.getStoragePermissions();
      const result = await permissionHelper.requestPermissionsIfNeeded(permissions);
      
      return {
        testName: 'Storage Permissions',
        success: result.granted,
        details: {
          permissions,
          granted: result.granted,
          deniedPermissions: result.deniedPermissions
        },
        error: result.granted ? undefined : `Denied permissions: ${result.deniedPermissions.join(', ')}`
      };
    } catch (error) {
      return {
        testName: 'Storage Permissions',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test camera permissions
   */
  private static async testCameraPermissions(): Promise<PermissionTestResult> {
    try {
      if (Platform.OS !== 'android') {
        return {
          testName: 'Camera Permissions',
          success: true,
          details: 'Not Android platform'
        };
      }

      const permissions = permissionHelper.getCameraPermissions();
      const result = await permissionHelper.requestPermissionsIfNeeded(permissions);
      
      return {
        testName: 'Camera Permissions',
        success: result.granted,
        details: {
          permissions,
          granted: result.granted,
          deniedPermissions: result.deniedPermissions
        },
        error: result.granted ? undefined : `Denied permissions: ${result.deniedPermissions.join(', ')}`
      };
    } catch (error) {
      return {
        testName: 'Camera Permissions',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }


  /**
   * Format test results for display
   */
  static formatTestResults(results: PermissionTestResult[]): string {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    let output = `\n🧪 Permission Test Results:\n`;
    output += `📊 Summary: ${passed} passed, ${failed} failed\n\n`;
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      output += `${status} ${result.testName}\n`;
      
      if (result.error) {
        output += `   Error: ${result.error}\n`;
      }
      
      if (result.details) {
        output += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      
      output += '\n';
    });
    
    return output;
  }

  /**
   * Log test results to console
   */
  static logTestResults(results: PermissionTestResult[]): void {
    console.log(this.formatTestResults(results));
  }
}

export default PermissionTestUtils;
