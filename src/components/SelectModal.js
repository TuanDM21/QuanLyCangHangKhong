import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';

const SelectModal = ({ data, value, onChange, labelKey = "label", valueKey = "value", placeholder = "Chọn...", title = "Chọn", disabled, multi = false, selectedValues = [], label, disabledValues = [] }) => {
  const [visible, setVisible] = useState(false);

  const handleSelect = (item) => {
    if (multi) {
      let newSelected;
      if (selectedValues.includes(item[valueKey])) {
        newSelected = selectedValues.filter(v => v !== item[valueKey]);
      } else {
        newSelected = [...selectedValues, item[valueKey]];
      }
      onChange(newSelected);
    } else {
      setVisible(false);
      onChange(item[valueKey]);
    }
  };

  const selectedItem = data.find(item => item[valueKey] === value);
  const selectedItems = data.filter(item => selectedValues.includes(item[valueKey]));

  return (
    <>
      {label && (
        <Text style={styles.selectLabel}>{label}</Text>
      )}
      <TouchableOpacity
        style={[styles.input, disabled && { backgroundColor: "#eee" }]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={{ color: (multi ? selectedValues.length : value) ? "#222" : "#aaa", flex: 1 }}>
          {multi
            ? selectedItems.length > 0
              ? `${selectedItems.length} đã chọn`
              : placeholder
            : selectedItem ? selectedItem[labelKey] : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#888" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>{title}</Text>
            <FlatList
              data={data}
              keyExtractor={item => item[valueKey].toString()}
              renderItem={({ item }) => {
                const isSelected = multi
                  ? selectedValues.includes(item[valueKey])
                  : value === item[valueKey];
                const isDisabled = disabledValues.includes(item[valueKey]);
                return (
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.selectedItem, isDisabled && { opacity: 0.5 }]}
                    onPress={() => !isDisabled && handleSelect(item)}
                    disabled={isDisabled}
                  >
                    <Text style={{ color: isDisabled ? '#aaa' : isSelected ? "#007AFF" : "#222", fontWeight: isSelected ? 'bold' : 'normal', flex: 1 }}>
                      {item[labelKey]}
                    </Text>
                    {isSelected && <Ionicons name={multi ? "checkbox" : "checkmark"} size={18} color="#007AFF" style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#007AFF",
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "85%",
    maxHeight: "70%",
    borderRadius: 14,
    padding: 18,
  },
  title: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 16,
    textAlign: "center",
    color: '#007AFF',
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#e6f0ff',
  },
  closeBtn: {
    marginTop: 18,
    alignItems: "center",
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignSelf: 'center',
  },
  closeBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#222',
    marginLeft: 2,
  },
});

export default SelectModal;
