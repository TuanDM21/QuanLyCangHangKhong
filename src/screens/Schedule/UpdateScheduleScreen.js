import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Common/Layout";
import { useNavigation, useRoute } from "@react-navigation/native";
import httpApiClient from "../../services";
import { Ionicons } from "@expo/vector-icons";

// Hàm chuyển chuỗi "HH:mm" sang đối tượng Date (dùng ngày hôm nay)
const parseTimeStringToDate = (timeStr) => {
  if (!timeStr) return new Date();
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
};

const UpdateScheduleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { schedule } = route.params;

  const [shiftCode, setShiftCode] = useState("");
  // Dùng state kiểu Date cho time picker
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // State điều khiển hiển thị DateTimePickerModal cho time picker
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (schedule) {
      setShiftCode(schedule.shiftCode || "");
      // Chuyển đổi chuỗi giờ ("HH:mm") sang đối tượng Date
      setStartTime(parseTimeStringToDate(schedule.startTime));
      setEndTime(parseTimeStringToDate(schedule.endTime));
      setLocation(schedule.location || "");
      setDescription(schedule.description || "");
    }
  }, [schedule]);

  // Hàm chuyển đổi Date sang chuỗi "HH:mm"
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Hàm update schedule qua API: sử dụng PUT tại URL "shifts/{id}"
  const updateSchedule = async (url, payload) => {
    // Sử dụng httpApiClient.put để gửi request
    const response = await httpApiClient.put(url, { json: payload });
    return response;
  };

  const handleUpdate = async () => {
    const formattedStartTime = formatTime(startTime);
    const formattedEndTime = formatTime(endTime);

    if (!shiftCode || !formattedStartTime || !formattedEndTime || !location) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const payload = {
      shiftCode,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      location,
      description,
    };

    // Log payload để kiểm tra dữ liệu gửi xuống server
    console.log("Payload gửi xuống server:", payload);

    setIsLoading(true);
    try {
      const scheduleUpdateResponse = await updateSchedule(`shifts/${schedule.id}`, payload);
      // Log status để kiểm tra
      console.log("Response status:", scheduleUpdateResponse.status);

      if (scheduleUpdateResponse.ok) {
        Alert.alert("Thành công", "Cập nhật lịch trực thành công", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else if (scheduleUpdateResponse.status === 409) {
        // Clone response để có thể đọc body và parse JSON mà không bị consume
        const errorJson = await scheduleUpdateResponse.clone().json();
        Alert.alert(
          "Lỗi",
          errorJson.data || "Mã lịch trực đã tồn tại, vui lòng chọn mã khác!"
        );
      } else {
        Alert.alert("Lỗi", "Cập nhật lịch trực thất bại!");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      // Nếu lỗi có thuộc tính status 409 (hoặc lỗi từ server backend được parse thành object)
      if (error.status === 409 || (error.response && error.response.status === 409)) {
        Alert.alert("Lỗi", "Mã lịch trực đã tồn tại, vui lòng chọn mã khác!");
      } else {
        Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối đến server");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.titleIcon}>
            <Ionicons name="create" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.title}>Cập nhật lịch trực</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Shift Code */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="code-working" size={16} color="#1E3A8A" /> Mã lịch trực
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="bookmark-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={shiftCode}
                onChangeText={setShiftCode}
                placeholder="Nhập mã lịch trực"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Start Time */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="time" size={16} color="#1E3A8A" /> Thời gian vào ca
            </Text>
            <TouchableOpacity
              style={styles.timePickerContainer}
              onPress={() => setIsStartPickerVisible(true)}
            >
              <Ionicons name="time-outline" size={20} color="#1E3A8A" style={styles.timeIcon} />
              <Text style={styles.timeText}>{formatTime(startTime)}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* End Time */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="time" size={16} color="#1E3A8A" /> Thời gian ra ca
            </Text>
            <TouchableOpacity
              style={styles.timePickerContainer}
              onPress={() => setIsEndPickerVisible(true)}
            >
              <Ionicons name="time-outline" size={20} color="#1E3A8A" style={styles.timeIcon} />
              <Text style={styles.timeText}>{formatTime(endTime)}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Location */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="location" size={16} color="#1E3A8A" /> Địa điểm trực
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="VD: Nhà ga T1"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>
              <Ionicons name="document-text" size={16} color="#1E3A8A" /> Mô tả
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons name="create-outline" size={20} color="#6B7280" style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Mô tả chi tiết về ca trực..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" style={styles.buttonIcon} />
            <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.updateButton, isLoading && styles.disabledButton]} 
            onPress={handleUpdate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" style={styles.buttonIcon} />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="white" style={styles.buttonIcon} />
            )}
            <Text style={styles.updateButtonText}>
              {isLoading ? "Đang cập nhật..." : "Cập nhật lịch trực"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Pickers */}
        <DateTimePickerModal
          isVisible={isStartPickerVisible}
          mode="time"
          is24Hour={true}
          display="default"
          onConfirm={(date) => {
            setStartTime(date);
            setIsStartPickerVisible(false);
          }}
          onCancel={() => setIsStartPickerVisible(false)}
        />
        <DateTimePickerModal
          isVisible={isEndPickerVisible}
          mode="time"
          is24Hour={true}
          display="default"
          onConfirm={(date) => {
            setEndTime(date);
            setIsEndPickerVisible(false);
          }}
          onCancel={() => setIsEndPickerVisible(false)}
        />
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },

  // Header Section
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E3A8A",
    flex: 1,
  },

  // Form Card
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },

  // Input Sections
  inputSection: {
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

  // Input Container
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    paddingVertical: 0,
  },

  // Text Area
  textAreaContainer: {
    alignItems: "flex-start",
    minHeight: 120,
    paddingVertical: 16,
  },
  textAreaIcon: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Time Picker
  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: "space-between",
  },
  timeIcon: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 16,
    color: "#1E3A8A",
    fontWeight: "600",
    flex: 1,
  },

  // Action Section
  actionSection: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  updateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E3A8A",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default UpdateScheduleScreen;
