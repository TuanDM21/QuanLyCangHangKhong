import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Button 
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";
import httpApiClient from "../services";

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
      <View style={styles.container}>
        <Text style={styles.title}>Tạo lịch trực</Text>

        {/* Mã lịch trực */}
        <Text style={styles.label}>Mã lịch trực</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Ca1"
          value={scheduleId}
          onChangeText={setScheduleId}
        />

        {/* Thời gian vào ca */}
        <Text style={styles.label}>Thời gian vào ca</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity 
            style={styles.timePicker}
            onPress={() => setIsStartPickerVisible(true)}
          >
            <Text style={styles.timeText}>{formatTime(startTime)}</Text>
          </TouchableOpacity>
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
        </View>

        {/* Thời gian ra ca */}
        <Text style={styles.label}>Thời gian ra ca</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity 
            style={styles.timePicker}
            onPress={() => setIsEndPickerVisible(true)}
          >
            <Text style={styles.timeText}>{formatTime(endTime)}</Text>
          </TouchableOpacity>
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
        <Text style={styles.label}>Địa điểm trực</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Nhà ga"
          value={location}
          onChangeText={setLocation}
        />

        {/* Mô tả */}
        <Text style={styles.label}>Mô tả</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="VD: Ca trực kỹ thuật..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={{ marginTop: 20 }}>
          <Button title="Tạo lịch trực" onPress={handleSubmit} color="#007AFF" />
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#CFE2FF",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "white",
    marginBottom: 15,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  timePicker: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    // Shadow cho iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Elevation cho Android
    elevation: 2,
  },
  timeText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
});

export default CreateScheduleScreen;
