import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import httpApiClient from "../../services";
import { Calendar } from "react-native-calendars";
import Layout from "../Layout";

// Hàm lấy ngày đầu tuần (Thứ 2) và cuối tuần (Chủ nhật) từ một ngày bất kỳ
function getWeekRange(dateStr) {
  const arr = dateStr.split("-");
  const d = new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2]));
  let day = d.getDay();
  if (day === 0) day = 7; // Chủ nhật là 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toStr = d =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")}`;
  return {
    start: toStr(monday),
    end: toStr(sunday),
  };
}

// Lấy ngày YYYY-MM-DD local
function getVNDateString(input) {
  let d = typeof input === "string" ? new Date(input) : new Date(input);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const date = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${date}`;
}

// Định dạng thời gian theo pattern YYYY-MM-DD HH:mm:ss
function formatDateTime(dt) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  const pad = n => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MyActivitiesScreen = () => {
  const todayStr = getVNDateString(new Date());
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekRange, setWeekRange] = useState(getWeekRange(todayStr));

  useEffect(() => {
    const fetchMyActivities = async () => {
      try {
        const res = await httpApiClient.get("activities/my");
        const json = await res.json();
        if (json.success !== false && Array.isArray(json.data || json)) {
          setActivities(json.data || json);
        } else {
          setActivities([]);
        }
      } catch {
        setActivities([]);
      }
      setLoading(false);
    };
    fetchMyActivities();
  }, []);

  // Khi đổi ngày chọn, cập nhật lại tuần
  useEffect(() => {
    setWeekRange(getWeekRange(selectedDate));
  }, [selectedDate]);

  // Lọc activity trong tuần đang chọn
  const weekActivities = activities.filter(act => {
    const actDate = act.startTime?.slice(0, 10);
    return actDate >= weekRange.start && actDate <= weekRange.end;
  });

  // Đánh dấu ngày có activity trên calendar
  const markedDates = {};
  activities.forEach(act => {
    const day = act.startTime?.slice(0, 10);
    if (day) markedDates[day] = { marked: true, dotColor: "#007AFF" };
  });
  markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: "#007AFF" };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.title}>Hoạt động của tôi (theo tuần)</Text>
        <Calendar
          current={selectedDate}
          onDayPress={d => setSelectedDate(d.dateString)}
          markedDates={markedDates}
          markingType="dot"
          firstDay={1}
          style={{ marginBottom: 10 }}
          theme={{
            selectedDayBackgroundColor: "#007AFF",
            todayTextColor: "#007AFF",
            dotColor: "#007AFF",
            selectedDotColor: "#fff",
          }}
        />
        <Text style={styles.weekRangeText}>
          Tuần: {weekRange.start} - {weekRange.end}
        </Text>
        <FlatList
          data={weekActivities}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.activityItem}>
              <Text style={styles.activityName}>{item.name}</Text>
              <Text style={styles.strongText}>Địa điểm: {item.location}</Text>
              <Text style={styles.strongText}>
                Bắt đầu: <Text style={styles.timeText}>{formatDateTime(item.startTime)}</Text>
              </Text>
              <Text style={styles.strongText}>
                Kết thúc: <Text style={styles.timeText}>{formatDateTime(item.endTime)}</Text>
              </Text>
              <Text>Ghi chú: {item.notes}</Text>
              <Text style={{ fontWeight: "600", marginTop: 4 }}>Người tham gia:</Text>
              {item.participants?.map((p, idx) => (
                <Text key={idx} style={{ marginLeft: 8 }}>
                  - [{p.participantType}] {p.participantName}
                </Text>
              ))}
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 20 }}>Không có hoạt động nào trong tuần này</Text>}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F2FE", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#007AFF", textAlign: "center", marginBottom: 10 },
  weekRangeText: { textAlign: "center", color: "#007AFF", fontWeight: "600", marginBottom: 10 },
  activityItem: { backgroundColor: "#fff", borderRadius: 10, padding: 15, marginBottom: 12, elevation: 2 },
  activityName: { fontWeight: "bold", fontSize: 17, color: "#007AFF", marginBottom: 4 },
  strongText: { fontWeight: "600", color: "#333" },
  timeText: { color: "#007AFF", fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default MyActivitiesScreen;