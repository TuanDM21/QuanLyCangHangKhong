import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import httpApiClient from "../../services";
import { Calendar } from "react-native-calendars";
import Layout from "../Common/Layout";
import DateTimePickerModal from "react-native-modal-datetime-picker";

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

// Lấy ngày YYYY-MM-DD theo local Việt Nam (không bị lệch timezone)
function getVNDateString(input) {
  if (typeof input === "string" && input.length >= 10) {
    return input.slice(0, 10);
  }
  const d = new Date(input);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const date = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${date}`;
}

// Định dạng ngày kiểu Việt Nam DD/MM/YYYY
function formatVNDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Định dạng thời gian theo pattern DD/MM/YYYY HH:mm
function formatDateTime(dt) {
  if (!dt) return "";
  const date = getVNDateString(dt);
  const [y, m, d] = date.split("-");
  const time = typeof dt === "string" && dt.length >= 16 ? dt.slice(11, 16) : "";
  return `${d}/${m}/${y} ${time}`;
}

const MyActivitiesScreen = () => {
  const todayStr = getVNDateString(new Date());
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekRange, setWeekRange] = useState(getWeekRange(todayStr));
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

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

  // Lọc activity trong tuần đang chọn (dùng getVNDateString để không bị lệch ngày)
  const weekActivities = activities.filter(act => {
    const actDate = getVNDateString(act.startTime);
    return actDate >= weekRange.start && actDate <= weekRange.end;
  });

  // Đánh dấu ngày có activity trên calendar (dùng getVNDateString)
  const markedDates = {};
  activities.forEach(act => {
    const day = getVNDateString(act.startTime);
    if (day) markedDates[day] = { marked: true, dotColor: "#007AFF" };
  });
  markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: "#007AFF" };

  // Hàm xử lý khi chọn ngày trên date picker
  const handleDatePicked = (date) => {
    const iso = getVNDateString(date);
    setSelectedDate(iso);
    setDatePickerVisible(false);
  };

  if (loading) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center',marginTop:30}}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{color:'#007AFF',fontWeight:'600',fontSize:16,marginTop:16}}>Đang lấy dữ liệu hoạt động...</Text>
      </View>
    );
  }

  // WeekStrip giống SearchActivityScreen
  const WeekStrip = ({ weekRange, selectedDate, onPressDay }) => {
    const start = new Date(weekRange.start);
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
            style={[styles.weekDayBox, day.iso === selectedDate && styles.weekDayBoxSelected]}
            onPress={() => onPressDay(day.iso)}
          >
            <Text style={[styles.weekday, day.iso === selectedDate && styles.weekdaySelected]}>{day.label}</Text>
            <Text style={[styles.daynum, day.iso === selectedDate && styles.daynumSelected]}>{day.date}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Layout>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDatePicked}
        onCancel={() => setDatePickerVisible(false)}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Lịch hoạt động của tôi</Text>
        <View style={styles.weekDatePickerRow}>
          <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.weekDateText}>{formatVNDate(weekRange.start)} - {formatVNDate(weekRange.end)}</Text>
        </View>
        <WeekStrip weekRange={weekRange} selectedDate={selectedDate} onPressDay={setSelectedDate} />
        <Text style={styles.countText}>
          {weekActivities.length > 0 ? `Có ${weekActivities.length} hoạt động` : 'Không có hoạt động nào'}
        </Text>
        <FlatList
          data={weekActivities}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => {
            const isToday = getVNDateString(item.startTime) === todayStr;
            return (
              <View style={[styles.activityItem, isToday && styles.activityToday]}>
                <View style={styles.activityHeader}>
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{marginRight:6}} />
                  <Text style={[styles.activityName, isToday && styles.activityNameToday]}>{item.name}</Text>
                </View>
                <Text style={styles.activityInfo}><Ionicons name="location-outline" size={16} color="#888" /> {item.location}</Text>
                <Text style={styles.activityInfo}><Ionicons name="time-outline" size={16} color="#888" /> {item.startTime ? `${formatVNDate(getVNDateString(item.startTime))} ${item.startTime.slice(11, 16)}` : ""}</Text>
                {!!item.notes && <Text style={styles.activityInfo}>Ghi chú: {item.notes}</Text>}
                {Array.isArray(item.participants) && item.participants.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontWeight: "600", color: "#007AFF" }}>Người tham gia:</Text>
                    {item.participants.map((p, i) => (
                      <Text key={i} style={{ color: "#333", marginLeft: 8 }}>- {p.participantName}</Text>
                    ))}
                  </View>
                )}
                {isToday && (
                  <Text style={styles.todayLabel}>Hôm nay</Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Không có hoạt động nào trong tuần này</Text>}
          style={{ flex: 1 }}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F2FE", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: "#007AFF", textAlign: "center", marginBottom: 20 },
  weekDatePickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  weekDateText: { marginLeft: 8, fontSize: 16, color: "#007AFF", fontWeight: "600" },
  weekRow: { 
    flexDirection: "row", 
    backgroundColor: "#fff", 
    borderRadius: 8, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e3e8ef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  weekDayBox: { flex: 1, paddingVertical: 8, alignItems: "center" },
  weekDayBoxSelected: { backgroundColor: "#007AFF", borderRadius: 8 },
  weekday: { fontSize: 12, color: "#555" },
  weekdaySelected: { color: "#fff" },
  daynum: { fontSize: 16, color: "#333", marginTop: 4 },
  daynumSelected: { color: "#fff", fontWeight: "bold" },
  countText: { textAlign: 'center', color: '#333', fontWeight: '600', marginBottom: 10, fontSize: 15 },
  activityItem: { 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: "#e3e8ef", 
    shadowColor: "#007AFF", 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  activityToday: {
    borderColor: '#FF9500',
    borderWidth: 2,
    backgroundColor: '#FFF7E6',
    shadowColor: '#FF9500',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  activityNameToday: {
    color: '#FF9500',
  },
  todayLabel: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FF9500',
    color: '#fff',
    fontWeight: 'bold',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 13,
    overflow: 'hidden',
  },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  activityName: { fontWeight: "bold", fontSize: 17, color: "#007AFF", marginBottom: 2 },
  activityInfo: { color: "#333", fontSize: 14, marginBottom: 2, marginLeft: 2 },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
});

export default MyActivitiesScreen;