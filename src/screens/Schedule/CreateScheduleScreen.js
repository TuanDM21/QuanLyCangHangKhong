import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import httpApiClient from "../../services";

const CreateScheduleScreen = () => {
  const navigation = useNavigation();

  // State dữ liệu form
  const [scheduleId, setScheduleId] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // State điều khiển hiển thị DateTimePickerModal cho giờ
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);

  // Hàm chuyển đổi Date sang chuỗi "HH:mm"
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Hàm regex kiểm tra định dạng "HH:mm"
  const validateTime = (timeStr) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeStr);
  };

  // Hàm gọi API tạo lịch trực
  const createSchedule = async (payload) => {
    // Lưu ý: httpApiClient.post trả về một Promise của response.
    const response = await httpApiClient.post("shifts", { json: payload });
    return response;
  };

  // Xử lý submit form
  const handleSubmit = async () => {
    const formattedStartTime = formatTime(startTime);
    const formattedEndTime = formatTime(endTime);
  
    if (
      !scheduleId ||
      !validateTime(formattedStartTime) ||
      !validateTime(formattedEndTime) ||
      !location
    ) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin và đúng định dạng!");
      return;
    }
  
    const payload = {
      shiftCode: scheduleId,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      location,
      description,
    };
  
    console.log("Payload gửi xuống server:", payload);
  
    try {
      const response = await createSchedule(payload);
      console.log("Response status:", response.status);
  
      // Sử dụng clone nếu cần đọc body cho 2 nhánh khác nhau
      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          "Thành công",
          `Lịch trực đã được lưu vào DB với ID = ${data.data.shiftCode}`,
          [{ text: "OK", onPress: () => navigation.navigate("ScheduleListScreen") }]
        );
      } else if (response.status === 409) {
        // Clone response trước khi đọc lại body
        const errorJson = await response.clone().json();
        Alert.alert("Lỗi", errorJson.data );
      } else {
        Alert.alert("Lỗi", "Có lỗi xảy ra khi tạo lịch trực!");
      }
    } catch (error) {
      console.log("Lỗi khi kết nối đến server:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối đến server");
    }
  };

  return (
    <Layout>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="add-circle" size={28} color="#007AFF" />
              <Text style={styles.title}>Tạo lịch trực</Text>
            </View>
            <Text style={styles.subtitle}>Thêm lịch trực mới vào hệ thống</Text>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>
            {/* Mã lịch trực */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="code" size={16} color="#007AFF" /> Mã lịch trực
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Ca1"
                  placeholderTextColor="#8E8E93"
                  value={scheduleId}
                  onChangeText={setScheduleId}
                />
              </View>
            </View>

            {/* Thời gian làm việc */}
            <View style={styles.timeSection}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="time" size={16} color="#007AFF" /> Thời gian làm việc
              </Text>
              
              <View style={styles.timeRow}>
                {/* Thời gian vào ca */}
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>Vào ca</Text>
                  <TouchableOpacity 
                    style={styles.timePicker}
                    onPress={() => setIsStartPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={20} color="#007AFF" />
                    <Text style={styles.timeText}>{formatTime(startTime)}</Text>
                  </TouchableOpacity>
                </View>

                {/* Separator */}
                <View style={styles.timeSeparator}>
                  <Ionicons name="arrow-forward" size={20} color="#8E8E93" />
                </View>

                {/* Thời gian ra ca */}
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>Ra ca</Text>
                  <TouchableOpacity 
                    style={styles.timePicker}
                    onPress={() => setIsEndPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={20} color="#007AFF" />
                    <Text style={styles.timeText}>{formatTime(endTime)}</Text>
                  </TouchableOpacity>
                </View>
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
            </View>

            {/* Địa điểm trực */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="location" size={16} color="#007AFF" /> Địa điểm trực
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Nhà ga T1"
                  placeholderTextColor="#8E8E93"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            {/* Mô tả */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="document-text" size={16} color="#007AFF" /> Mô tả
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="VD: Ca trực kỹ thuật, kiểm tra an toàn..."
                  placeholderTextColor="#8E8E93"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.createButton} 
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.createButtonText}>Tạo lịch trực</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontWeight: "500",
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1D1D1F",
    borderRadius: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  timeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
    marginBottom: 8,
    textAlign: "center",
  },
  timePicker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  timeSeparator: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  timeText: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
});

export default CreateScheduleScreen;