import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Layout from "./Layout";
import { useNavigation, useRoute } from "@react-navigation/native";

const UpdateUserShiftScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Nhận đối tượng schedule
  const { schedule } = route.params;
  
  // Lấy ID bản ghi (scheduleId), userId, shiftId
  const scheduleId = schedule.scheduleId; 
  const [userId] = useState(schedule.userId);  // Có thể không sửa user
  const [shiftId, setShiftId] = useState(schedule.shiftId); // Ca hiện tại
  
  // Hoặc nếu bạn dùng shiftCode thay vì shiftId => setShiftCode(schedule.shiftCode)
  
  const [shiftDate, setShiftDate] = useState(schedule.shiftDate || "");
  const [shifts, setShifts] = useState([]); // Danh sách ca

  useEffect(() => {
    // Fetch danh sách shift
    fetch("http://10.0.2.2:8080/api/shifts")
      .then((res) => res.json())
      .then((data) => setShifts(data))
      .catch((err) => console.error("Lỗi fetch shifts:", err));
  }, []);

  const handleUpdate = async () => {
    if (!shiftDate || !shiftId) {
      Alert.alert("Lỗi", "Vui lòng nhập ngày và chọn ca trực!");
      return;
    }
    try {
      // Tùy backend yêu cầu body
      const payload = {
        userId,     // nếu backend cần userId
        shiftDate,  // ngày
        shiftId     // ID ca trực
      };
      
      const url = `http://10.0.2.2:8080/api/user-shifts/${scheduleId}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
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

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Cập nhật lịch trực</Text>

        <Text style={styles.label}>Ngày (YYYY-MM-DD):</Text>
        <TextInput
          style={styles.input}
          value={shiftDate}
          onChangeText={setShiftDate}
        />

        <Text style={styles.label}>Chọn ca trực (theo ID):</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={shiftId}
            onValueChange={(value) => setShiftId(value)}
          >
            <Picker.Item label="(Chọn ca)" value="" />
            {shifts.map((s) => (
              <Picker.Item key={s.id} label={s.shiftCode} value={s.id} />
            ))}
          </Picker>
        </View>

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
    justifyContent: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  label: {
    marginTop: 10,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "white",
    marginBottom: 20
  }
});
