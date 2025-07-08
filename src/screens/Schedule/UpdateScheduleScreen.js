import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Common/Layout";
import { useNavigation, useRoute } from "@react-navigation/native";
import httpApiClient from "../../services";

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
    }
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Cập nhật lịch trực</Text>

        <TextInput
          style={styles.input}
          value={shiftCode}
          onChangeText={setShiftCode}
          placeholder="Mã lịch trực"
        />

        <Text style={styles.label}>Thời gian vào ca</Text>
        <TouchableOpacity
          style={styles.timePickerContainer}
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

        <Text style={styles.label}>Thời gian ra ca</Text>
        <TouchableOpacity
          style={styles.timePickerContainer}
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

        <Text style={styles.label}>Địa điểm trực</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="VD: Nhà ga"
        />

        <Text style={styles.label}>Mô tả</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="VD: Ca trực kỹ thuật..."
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>CẬP NHẬT LỊCH TRỰC</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#E0F2FE",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
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
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  timePickerContainer: {
    height: 48,
    borderColor: "#007AFF",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "white",
    marginBottom: 15,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    // Shadow cho iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    // Elevation cho Android
    elevation: 3,
  },
  timeText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});

export default UpdateScheduleScreen;
