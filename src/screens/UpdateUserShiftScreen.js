import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import { useNavigation, useRoute } from "@react-navigation/native";
import httpApiClient from "../services";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import SelectModal from "../components/SelectModal";

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
      Alert.alert("Thành công", "Cập nhật lịch trực thành công!");
      navigation.goBack();
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      Alert.alert("Lỗi", error.message || "Không thể kết nối đến server");
    }
  };

  // Hàm gửi request PUT để cập nhật lịch trực
  const updateShift = async (url, payload) => {
    const res = await httpApiClient.put(url, { json: payload });
    return res;
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Cập nhật lịch trực</Text>

        <Text style={styles.label}>Ngày (YYYY-MM-DD):</Text>
        {/* Dùng TouchableOpacity để mở DatePicker khi người dùng chạm vào */}
        <TouchableOpacity onPress={showDatePicker}>
          <TextInput
            style={styles.input}
            value={shiftDate}
            placeholder="Chọn ngày"
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
        {/* DateTimePickerModal để chọn ngày */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
        />

        <Text style={styles.label}>Chọn ca trực (theo ID):</Text>
        <SelectModal
          data={shifts.map(s => ({ label: s.shiftCode, value: s.id }))}
          value={shiftId}
          onChange={setShiftId}
          placeholder="Chọn ca trực"
          title="Chọn ca trực"
        />

        <Button title="Cập nhật" onPress={handleUpdate} />
      </View>
    </Layout>
  );
};

export default UpdateUserShiftScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    marginTop: 10,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "white",
    marginBottom: 20,
  },
});
