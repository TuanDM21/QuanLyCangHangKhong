import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import Layout from "../Layout";
import httpApiClient from "../../services";
import { Calendar, CalendarProvider } from "react-native-calendars";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";

// Parse YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ss thành Date local
function parseLocalDate(str) {
  if (!str) return new Date();
  const [date, time] = str.split("T");
  const [y, m, d] = date.split("-").map(Number);
  if (time) {
    const [h, min, s] = time.split(":").map(Number);
    return new Date(y, m - 1, d, h || 0, min || 0, s || 0);
  }
  return new Date(y, m - 1, d);
}

// WeekStrip component hiển thị tuần (Thứ 2 -> Chủ nhật)
function WeekStrip({ weekRange, selectedDate, onPressDay }) {
  // KHÔNG dùng +07:00, chỉ parse local
  const start = parseLocalDate(weekRange.start);
  const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    return {
      iso,
      label: weekdayLabels[i],
      date: d.getDate(),
    };
  });

  return (
    <View style={styles.weekRow}>
      {days.map(day => (
        <TouchableOpacity
          key={day.iso}
          style={[
            styles.weekDayBox,
            day.iso === selectedDate && styles.weekDayBoxSelected,
          ]}
          onPress={() => onPressDay(day.iso)}
        >
          <Text
            style={[
              styles.weekday,
              day.iso === selectedDate && styles.weekdaySelected,
            ]}
          >
            {day.label}
          </Text>
          <Text
            style={[
              styles.daynum,
              day.iso === selectedDate && styles.daynumSelected,
            ]}
          >
            {day.date}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Lấy ngày YYYY-MM-DD local (không lệch timezone)
function getVNDateString(input) {
  let d = typeof input === "string" ? parseLocalDate(input) : new Date(input);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const date = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${date}`;
}

// Tuần bắt đầu từ Thứ 2 (Monday) đến Chủ nhật (Sunday)
function getWeekRange(dateStr) {
  const d = parseLocalDate(dateStr);
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

export default function SearchActivityScreen({ navigation }) {
  const todayStr = getVNDateString(new Date());
  const [searchType, setSearchType] = useState("date");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [allActivities, setAllActivities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [weekRange, setWeekRange] = useState(getWeekRange(todayStr));

  // Format ngày hiển thị
  const formatDate = d => {
    const arr = d.split("-");
    return new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2])).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Fetch activities trong tháng
  const fetchMonth = async (m, y) => {
    try {
      const res = await httpApiClient.get(`activities/search?month=${m}&year=${y}`);
      const json = await res.json();
      setAllActivities(Array.isArray(json.data) ? json.data : []);
    } catch {
      setAllActivities([]);
    }
  };

  // Khi mount, lấy tháng hiện tại
  useEffect(() => {
    const now = new Date();
    fetchMonth(now.getMonth() + 1, now.getFullYear());
  }, []);

  // Khi dữ liệu hoặc ngày chọn thay đổi: rebuild markedDates + filter activities
  useEffect(() => {
    const m = {};
    allActivities.forEach(a => {
      const day = a.startTime ? getVNDateString(a.startTime) : null;
      if (day) m[day] = m[day] || { dots: [{ color: "#007AFF" }] };
    });
    m[selectedDate] = {
      ...(m[selectedDate] || {}),
      selected: true,
      selectedColor: "#007AFF",
      dots: m[selectedDate]?.dots || [{ color: "#007AFF" }],
    };
    setMarkedDates(m);
  
    if (searchType === "week") {
      // Lọc các activity trong tuần
      const start = weekRange.start;
      const end = weekRange.end;
      setActivities(
        allActivities.filter(a => {
          const d = getVNDateString(a.startTime);
          return d >= start && d <= end;
        })
      );
    } else {
      // Lọc theo ngày
      setActivities(allActivities.filter(a => getVNDateString(a.startTime) === selectedDate));
    }
  }, [allActivities, selectedDate, searchType, weekRange]);

  // Khi đổi sang tuần mới (chọn ngày mới bằng date picker)
  const handleWeekDateChange = date => {
    const vnDate = getVNDateString(date);
    setSelectedDate(vnDate);
    setWeekRange(getWeekRange(vnDate));
    setDatePickerVisible(false);
  };

  // Khi chọn ngày trên calendar ở chế độ tuần
  const handleCalendarDayPress = d => {
    setSelectedDate(d.dateString);
    setWeekRange(getWeekRange(d.dateString));
  };

  // Tháng thay đổi trong calendar
  const onMonthChange = ({ month, year }) => fetchMonth(month, year);

  // Xóa
  const handleDelete = id => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa hoạt động này?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await httpApiClient.delete(`activities/${id}`);
            if (res.ok) setAllActivities(prev => prev.filter(a => a.id !== id));
          } catch {
            Alert.alert("Lỗi", "Không thể kết nối server");
          }
        },
      },
    ]);
  };

  // Sửa
  const handleEdit = act => navigation.navigate("EditActivityScreen", { activity: act });

  return (
    <Layout>
      <CalendarProvider date={selectedDate}>
        <View style={styles.container}>
          <Text style={styles.title}>Lịch hoạt động</Text>
          <View style={styles.row}>
            {["date", "week"].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, searchType === type && styles.typeBtnActive]}
                onPress={() => setSearchType(type)}
              >
                <Text style={{ color: searchType === type ? "#fff" : "#007AFF", fontWeight: "bold" }}>
                  {type === "date" ? "Theo ngày" : "Theo tuần"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {searchType === "date" ? (
            <Calendar
              current={selectedDate}
              onDayPress={d => setSelectedDate(d.dateString)}
              onMonthChange={onMonthChange}
              markedDates={markedDates}
              markingType="multi-dot"
              theme={{
                selectedDayBackgroundColor: "#007AFF",
                todayTextColor: "#007AFF",
                dotColor: "#007AFF",
                selectedDotColor: "#fff",
              }}
              style={{ marginBottom: 10 }}
              firstDay={1}
            />
          ) : (
            <>
              <View style={styles.weekDatePickerRow}>
                <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.weekDateText}>
                  {formatDate(weekRange.start)} - {formatDate(weekRange.end)}
                </Text>
              </View>
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleWeekDateChange}
                onCancel={() => setDatePickerVisible(false)}
              />
              {/* Không hiển thị Calendar ở chế độ tuần */}
              <WeekStrip weekRange={weekRange} selectedDate={selectedDate} onPressDay={setSelectedDate} />
            </>
          )}

          <FlatList
            data={activities}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <View style={styles.activityItem}>
                <Text style={styles.activityName}>{item.name}</Text>
                <Text style={styles.activityInfo}>
                  Địa điểm: {item.location} | {formatDate(getVNDateString(item.startTime))} {item.startTime.slice(11, 16)}
                </Text>
                <Text style={styles.activityInfo}>Ghi chú: {item.notes}</Text>
                {Array.isArray(item.participants) && item.participants.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontWeight: "600", color: "#007AFF" }}>Người tham gia:</Text>
                    {item.participants.map((p, i) => (
                      <Text key={i} style={{ color: "#333", marginLeft: 8 }}>
                        - {p.participantName}
                      </Text>
                    ))}
                  </View>
                )}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                    <Ionicons name="create-outline" size={22} color="#007AFF" />
                    <Text style={styles.actionText}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                    <Text style={[styles.actionText, { color: "#FF3B30" }]}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Không có hoạt động nào trong ngày này</Text>}
          />
        </View>
      </CalendarProvider>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F2FE", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: "#007AFF", textAlign: "center", marginBottom: 20 },
  row: { flexDirection: "row", marginBottom: 15 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: "#007AFF", borderRadius: 8, padding: 10, marginHorizontal: 2, alignItems: "center", backgroundColor: "#fff" },
  typeBtnActive: { backgroundColor: "#007AFF" },
  weekDatePickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  weekDateText: { marginLeft: 8, fontSize: 16, color: "#007AFF", fontWeight: "600" },
  weekRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 8, marginBottom: 10 },
  weekDayBox: { flex: 1, paddingVertical: 8, alignItems: "center" },
  weekDayBoxSelected: { backgroundColor: "#007AFF", borderRadius: 8 },
  weekday: { fontSize: 12, color: "#555" },
  weekdaySelected: { color: "#fff" },
  daynum: { fontSize: 16, color: "#333", marginTop: 4 },
  daynumSelected: { color: "#fff", fontWeight: "bold" },
  activityItem: { backgroundColor: "#fff", borderRadius: 10, padding: 15, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  activityName: { fontWeight: "bold", fontSize: 17, color: "#007AFF", marginBottom: 4 },
  activityInfo: { color: "#333", fontSize: 14, marginBottom: 2 },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", marginLeft: 18 },
  actionText: { marginLeft: 4, color: "#007AFF", fontWeight: "bold", fontSize: 15 },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
});