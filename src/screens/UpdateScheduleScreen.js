import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Layout from "./Layout";
import httpApiClient from "../services";

const UpdateScheduleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { schedule } = route.params;

  const [shiftCode, setShiftCode] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (schedule) {
      setShiftCode(schedule.shiftCode || "");
      setStartTime(schedule.startTime || "");
      setEndTime(schedule.endTime || "");
      setLocation(schedule.location || "");
      setDescription(schedule.description || "");
    }
  }, [schedule]);

  const updateSchedule = async (url, payload) => {
    const response = await httpApiClient.post(url, { json: payload });
    return response;
  };

  const handleUpdate = async () => {
    if (!shiftCode || !startTime || !endTime || !location) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const payload = {
      shiftCode,
      startTime,
      endTime,
      location,
      description,
    };

    try {
      const scheduleUpdateResponse = await updateSchedule(
        `shifts/${schedule.id}`,
        payload
      );

      if (scheduleUpdateResponse.ok) {
        Alert.alert("Thành công", "Cập nhật lịch trực thành công", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else if (scheduleUpdateResponse.status === 409) {
        const errorJson = await scheduleUpdateResponse.json();
        Alert.alert("Lỗi", errorJson.message || "Mã lịch trực này đã tồn tại");
      } else {
        Alert.alert("Lỗi", "Cập nhật lịch trực thất bại");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối đến server");
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

        <TextInput
          style={styles.input}
          value={startTime}
          onChangeText={setStartTime}
          placeholder="Thời gian vào ca (HH:mm)"
        />

        <TextInput
          style={styles.input}
          value={endTime}
          onChangeText={setEndTime}
          placeholder="Thời gian ra ca (HH:mm)"
        />

        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Địa điểm trực"
        />

        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Mô tả"
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
    backgroundColor: "#E0F2FE",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default UpdateScheduleScreen;
