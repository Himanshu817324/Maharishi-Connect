import { useState, useEffect } from 'react';
import { permissionManager, ContactPermissionResult } from '@/utils/permissions';

interface UseContactsPermissionReturn {
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<ContactPermissionResult>;
  checkPermission: () => Promise<boolean>;
  syncContacts: () => Promise<any[]>;
}

export const useContactsPermission = (): UseContactsPermissionReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const granted = await permissionManager.checkContactsPermission();
      setHasPermission(granted);
      
      return granted;
    } catch (err: any) {
      setError(err.message || 'Failed to check permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (): Promise<ContactPermissionResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await permissionManager.requestContactsPermission();
      setHasPermission(result.granted);
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to request permission');
      return {
        granted: false,
        canAskAgain: false,
        status: 'unavailable',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const syncContacts = async (): Promise<any[]> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const contacts = await permissionManager.syncContactsWithBackend();
      return contacts;
    } catch (err: any) {
      setError(err.message || 'Failed to sync contacts');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    hasPermission,
    isLoading,
    error,
    requestPermission,
    checkPermission,
    syncContacts,
  };
};
