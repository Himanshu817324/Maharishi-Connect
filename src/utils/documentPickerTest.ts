import DocumentPicker, { DocumentPickerResponse, types } from '@react-native-documents/picker';

export const testDocumentPicker = async () => {
  try {
    console.log('🧪 Testing DocumentPicker...');
    console.log('DocumentPicker available:', !!DocumentPicker);
    console.log('DocumentPicker.pick available:', !!DocumentPicker?.pick);
    console.log('types available:', !!types);
    console.log('types.audio:', types?.audio);
    console.log('types.allFiles:', types?.allFiles);

    if (!DocumentPicker || !DocumentPicker.pick) {
      throw new Error('DocumentPicker is not available');
    }

    const result = await DocumentPicker.pick({
      type: [types.audio],
      allowMultiSelection: false,
    });

    console.log('DocumentPicker result:', result);
    return { success: true, result };
  } catch (error) {
    console.error('DocumentPicker test error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
