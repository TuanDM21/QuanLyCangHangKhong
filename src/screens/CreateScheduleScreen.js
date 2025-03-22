import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import Layout from "./Layout";

const CreateScheduleScreen = () => {
  const [scheduleId, setScheduleId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const validateTime = (time) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Định dạng HH:mm
    return regex.test(time);
  };

  const handleSubmit = () => {
    if (!scheduleId || !validateTime(startTime) || !validateTime(endTime) || !location) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin và đúng định dạng!");
      return;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    let shiftDate = "Hôm nay"; // Mặc định cùng ngày
    if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
      shiftDate = "Ngày mai";
    }

    Alert.alert(
      "Lịch trực đã tạo",
      `🆔 Mã: ${scheduleId}\n🕘 Vào ca: ${startTime}\n🕙 Ra ca: ${endTime} (${shiftDate})\n📍 Địa điểm: ${location}\n📝 Mô tả: ${description || "Không có"}`
    );
  };

  return (
    <Layout>
    <View style={styles.container}>
      <Text style={styles.title}>Tạo lịch trực</Text>

      <TextInput
        style={styles.input}
        placeholder="Mã lịch trực"
        value={scheduleId}
        onChangeText={setScheduleId}
      />

      <TextInput
        style={styles.input}
        placeholder="Thời gian vào ca (HH:mm)"
        keyboardType="numeric"
        value={startTime}
        onChangeText={setStartTime}
      />

      <TextInput
        style={styles.input}
        placeholder="Thời gian ra ca (HH:mm)"
        keyboardType="numeric"
        value={endTime}
        onChangeText={setEndTime}
      />

      <TextInput
        style={styles.input}
        placeholder="Địa điểm trực"
        value={location}
        onChangeText={setLocation}
      />

      <TextInput
        style={styles.textarea}
        placeholder="Mô tả"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Button title="Tạo lịch trực" onPress={handleSubmit} />
    </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#CFE2FF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
    borderRadius: 5,
    backgroundColor: "white",
  },
  textarea: {
    height: 80,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
    borderRadius: 5,
    backgroundColor: "white",
    textAlignVertical: "top",
  },
});

export default CreateScheduleScreen;
