import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LightColors } from '../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');

interface DropdownOption {
  label: string;
  value: string;
  emoji?: string;
  disabled?: boolean;
}

interface ModernDropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  emoji?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  style?: any;
}

const ModernDropdown: React.FC<ModernDropdownProps> = ({
  options,
  selectedValue,
  onValueChange,
  placeholder = "Select an option",
  label,
  emoji,
  disabled = false,
  loading = false,
  error,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const selectedOption = options.find(option => option.value === selectedValue);

  const toggleDropdown = () => {
    if (disabled || loading) return;
    
    if (isOpen) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    } else {
      setIsOpen(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    toggleDropdown();
  };

  const renderOption = ({ item }: { item: DropdownOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        item.value === selectedValue && styles.selectedOption,
        item.disabled && styles.disabledOption,
      ]}
      onPress={() => !item.disabled && handleSelect(item.value)}
      disabled={item.disabled}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        {item.emoji && <Text style={styles.optionEmoji}>{item.emoji}</Text>}
        <Text
          style={[
            styles.optionText,
            item.value === selectedValue && styles.selectedOptionText,
            item.disabled && styles.disabledOptionText,
          ]}
        >
          {item.label}
        </Text>
        {item.value === selectedValue && (
          <Icon name="checkmark-circle" size={20} color={LightColors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, error && styles.errorLabel]}>
          {emoji && <Text style={styles.labelEmoji}>{emoji} </Text>}
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.dropdown,
          error && styles.dropdownError,
          disabled && styles.dropdownDisabled,
          isOpen && styles.dropdownOpen,
        ]}
        onPress={toggleDropdown}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <View style={styles.dropdownContent}>
          {selectedOption ? (
            <View style={styles.selectedContent}>
              {selectedOption.emoji && (
                <Text style={styles.selectedEmoji}>{selectedOption.emoji}</Text>
              )}
              <Text style={styles.selectedText}>{selectedOption.label}</Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {loading ? "Loading..." : placeholder}
            </Text>
          )}
          
          <View style={styles.dropdownIcon}>
            {loading ? (
              <Icon name="refresh" size={20} color={LightColors.subText} />
            ) : (
              <Icon
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={isOpen ? LightColors.primary : LightColors.subText}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={toggleDropdown}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleDropdown}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {emoji && <Text style={styles.modalTitleEmoji}>{emoji} </Text>}
                {label || "Select Option"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={toggleDropdown}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color={LightColors.subText} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={renderOption}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              bounces={false}
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: LightColors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  labelEmoji: {
    fontSize: 18,
  },
  errorLabel: {
    color: '#ef4444',
  },
  dropdown: {
    backgroundColor: LightColors.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: LightColors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownError: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.15,
  },
  dropdownDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  dropdownOpen: {
    borderColor: LightColors.primary,
    shadowColor: LightColors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 60,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  selectedText: {
    fontSize: 16,
    color: LightColors.text,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
  },
  placeholderText: {
    fontSize: 16,
    color: LightColors.subText,
    flex: 1,
    fontStyle: 'italic',
  },
  dropdownIcon: {
    marginLeft: 14,
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
    marginLeft: 6,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: LightColors.card,
    borderRadius: 24,
    width: screenWidth - 40,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: LightColors.border,
    backgroundColor: LightColors.primary + '05',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: LightColors.text,
    letterSpacing: 0.5,
  },
  modalTitleEmoji: {
    fontSize: 22,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: LightColors.border + '30',
  },
  optionsList: {
    maxHeight: 350,
  },
  optionItem: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: LightColors.border + '50',
  },
  selectedOption: {
    backgroundColor: LightColors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: LightColors.primary,
  },
  disabledOption: {
    opacity: 0.4,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  optionText: {
    fontSize: 16,
    color: LightColors.text,
    flex: 1,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  selectedOptionText: {
    color: LightColors.primary,
    fontWeight: '700',
  },
  disabledOptionText: {
    color: LightColors.subText,
  },
});

export default ModernDropdown;
