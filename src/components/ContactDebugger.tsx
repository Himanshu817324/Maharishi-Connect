import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { permissionManager } from '@/utils/permissions';
import { contactService } from '@/services/contactService';

const ContactDebugger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog('🔍 Starting contact diagnostics...');

    try {
      // Device Info
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        manufacturer: Platform.constants?.Brand || 'Unknown',
        model: Platform.constants?.Model || 'Unknown',
      };
      addLog(`📱 Device: ${deviceInfo.manufacturer} ${deviceInfo.model} (${deviceInfo.platform} ${deviceInfo.version})`);

      // Permission Check
      addLog('🔐 Checking contacts permission...');
      const hasPermission = await permissionManager.checkContactsPermission();
      addLog(`🔐 Permission status: ${hasPermission ? 'GRANTED' : 'DENIED'}`);

      if (!hasPermission) {
        addLog('📱 Requesting permission...');
        const result = await permissionManager.requestContactsPermission();
        addLog(`📱 Permission request result: ${result.granted ? 'GRANTED' : 'DENIED'} (${result.status})`);
      }

      // Get Raw Contacts
      addLog('📱 Fetching raw contacts...');
      const rawContacts = await permissionManager.getAllContacts();
      addLog(`📱 Raw contacts count: ${rawContacts.length}`);

      if (rawContacts.length === 0) {
        addLog('⚠️ No raw contacts found');
      } else {
        addLog('📱 Sample raw contacts:');
        rawContacts.slice(0, 3).forEach((contact, index) => {
          addLog(`   ${index + 1}. ID: ${contact.recordID || contact.id || 'no-id'}`);
          addLog(`      Name: ${contact.displayName || contact.givenName || 'no-name'}`);
          addLog(`      Phone: ${contact.phoneNumbers?.[0]?.number || contact.phoneNumber || 'no-phone'}`);
        });
      }

      // Format Contacts
      addLog('📱 Formatting contacts...');
      const formattedContacts = permissionManager.formatContactData(rawContacts);
      addLog(`📱 Formatted contacts count: ${formattedContacts.length}`);

      // Test Contact Sync
      addLog('🔄 Testing contact sync...');
      const result = await contactService.getContactsWithStatus();
      addLog(`✅ Contact sync successful:`);
      addLog(`   Existing users: ${result.existingUsers.length}`);
      addLog(`   Non-users: ${result.nonUsers.length}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Error during diagnostics: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    contactService.clearCache();
    addLog('🗑️ Contact cache cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contact Debugger</Text>
        <Text style={styles.subtitle}>Diagnose contact fetching issues</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runDiagnostics}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Run Diagnostics</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearCache}
        >
          <Text style={styles.secondaryButtonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      {logs.length > 0 && (
        <View style={styles.logsContainer}>
          <Text style={styles.sectionTitle}>Diagnostic Logs</Text>
          <ScrollView style={styles.logsScrollView} nestedScrollEnabled>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logsContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 300,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  logsScrollView: {
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default ContactDebugger;
