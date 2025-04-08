import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import Layout from "./Layout";
import { useNavigation } from "@react-navigation/native";

const CreateScheduleScreen = () => {
  const [scheduleId, setScheduleId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  
  const navigation = useNavigation();

  const validateTime = (time) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Định dạng HH:mm
    return regex.test(time);
  };

  const handleSubmit = async () => {
    if (!scheduleId || !validateTime(startTime) || !validateTime(endTime) || !location) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin và đúng định dạng!");
      return;
    }
  
    // Chuẩn bị payload để gửi lên server
    const payload = {
      shiftCode: scheduleId,
      startTime: startTime,      // "HH:mm" (hoặc "HH:mm:ss")
      endTime: endTime,          // "HH:mm" (hoặc "HH:mm:ss")
      location: location,
      description: description,
    };
  
    try {
      const response = await fetch("http://10.0.2.2:8080/api/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          "Thành công",
          `Lịch trực đã được lưu vào DB với ID = ${data.shiftCode}`,
          [
            { text: "OK", onPress: () => navigation.navigate("ScheduleListScreen") }
          ]
        );
      } else {
        Alert.alert("Lỗi", "Mã Lịch Trực đã tồn tại hoặc có lỗi xảy ra!");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối đến server");
    }
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
