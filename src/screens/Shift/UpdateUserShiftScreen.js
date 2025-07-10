import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "../Common/Layout";
import { useNavigation, useRoute } from "@react-navigation/native";
import httpApiClient from "../../services";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import SelectModal from "../../components/SelectModal";
import { Ionicons } from "@expo/vector-icons";

const UpdateUserShiftScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Nhận đối tượng schedule từ route params
  const { schedule } = route.params;

  // Lấy ID bản ghi (scheduleId), userId, shiftId từ schedule
  const scheduleId = schedule.scheduleId;
  const [userId] = useState(schedule.userId); // Không cần thay đổi userId
  const [shiftId, setShiftId] = useState(schedule.shiftId); // Ca trực hiện tại

  // State cho ngày làm việc, ban đầu lấy từ schedule (hoặc rỗng nếu không có)
  const [shiftDate, setShiftDate] = useState(schedule.shiftDate || "");
  const [shifts, setShifts] = useState([]); // Danh sách ca làm việc

  // State để điều khiển hiển thị Date Picker
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch danh sách shift khi component mount
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await httpApiClient.get("shifts");
      const shiftsJson = await response.json();
      setShifts(shiftsJson.data);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  // Hàm hiển thị Date Picker
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  // Hàm ẩn Date Picker
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  // Hàm xử lý khi người dùng chọn ngày
  const handleConfirmDate = (date) => {
    // Format ngày thành định dạng YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    setShiftDate(formattedDate);
    hideDatePicker();
  };

  // Hàm gửi request cập nhật lịch trực
  const handleUpdate = async () => {
    if (!shiftDate || !shiftId) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày và chọn ca trực!");
      return;
    }
    
    setIsLoading(true);
    try {
      // Payload gửi theo yêu cầu backend
      const payload = {
        userId,    // nếu backend cần userId
        shiftDate, // ngày được chọn
        shiftId,   // ID ca trực
      };

      const url = `user-shifts/${scheduleId}`;
      const res = await updateShift(url, payload);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Không thể cập nhật lịch trực");
      }
      Alert.alert("Thành công", "Cập nhật lịch trực thành công!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      Alert.alert("Lỗi", error.message || "Không thể kết nối đến server");
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm gửi request PUT để cập nhật lịch trực
  const updateShift = async (url, payload) => {
    const res = await httpApiClient.put(url, { json: payload });
    return res;
  };

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Ionicons name="calendar-outline" size={32} color="#0EA5E9" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Cập nhật lịch trực</Text>
              <Text style={styles.subtitle}>Chỉnh sửa thông tin ca trực</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Date Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="calendar" size={16} color="#1e40af" /> Chọn ngày làm việc
            </Text>
            <TouchableOpacity 
              style={styles.datePickerButton} 
              onPress={showDatePicker}
              activeOpacity={0.7}
            >
              <View style={styles.datePickerContent}>
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={[styles.dateText, !shiftDate && styles.placeholderText]}>
                  {shiftDate ? new Date(shiftDate).toLocaleDateString('vi-VN') : "Chọn ngày"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Shift Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="time" size={16} color="#1e40af" /> Chọn ca trực
            </Text>
            <SelectModal
              data={shifts.map(s => ({ label: s.shiftCode, value: s.id }))}
              value={shiftId}
              onChange={setShiftId}
              placeholder="Chọn ca trực"
              title="Chọn ca trực"
            />
          </View>

          {/* DateTimePickerModal */}
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleConfirmDate}
            onCancel={hideDatePicker}
            display="default"
            locale="vi"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color="#64748b" />
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.updateButton, isLoading && styles.disabledButton]}
            onPress={handleUpdate}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            )}
            <Text style={styles.updateButtonText}>
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Layout>
  );
};

export default UpdateUserShiftScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  
  // Header Card
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  // Form Card
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  // Date Picker
  datePickerButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
  },
  datePickerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  placeholderText: {
    color: "#9ca3af",
  },

  // Action Card
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Cancel Button
  cancelButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },

  // Update Button
  updateButton: {
    flex: 2,
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1e40af",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
    shadowOpacity: 0.1,
  },
});
