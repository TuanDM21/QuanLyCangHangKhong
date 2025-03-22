import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Layout from "./Layout";

const UpdateScheduleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { schedule } = route.params;

  const [scheduleId, setScheduleId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (schedule) {
      setScheduleId(schedule.scheduleId);
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
      setLocation(schedule.location);
      setDescription(schedule.description);
    }
  }, [schedule]);

  const handleUpdate = () => {
    // Xử lý cập nhật dữ liệu, gửi API hoặc cập nhật danh sách
    console.log("Cập nhật lịch trực:", { scheduleId, startTime, endTime, location, description });
    navigation.goBack();
  };

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Cập nhật lịch trực</Text>
        <TextInput style={styles.input} value={scheduleId} editable={false} />
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="Thời gian vào ca (HH:mm)" />
        <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="Thời gian ra ca (HH:mm)" />
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Địa điểm trực" />
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Mô tả" multiline />
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
