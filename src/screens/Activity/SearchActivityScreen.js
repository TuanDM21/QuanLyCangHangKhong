import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import Layout from "../Common/Layout";
import httpApiClient from "../../services";
import { Calendar, CalendarProvider } from "react-native-calendars";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canPin, setCanPin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const perms = user.permissions || [];
          setCanEdit(perms.includes("CAN_EDIT_ACTIVITY"));
          setCanDelete(perms.includes("CAN_DELETE_ACTIVITY"));
          setCanPin(perms.includes("CAN_GHIM_ACTIVITY"));
        }
      } catch (e) {
        setCanEdit(false);
        setCanDelete(false);
        setCanPin(false);
      }
    })();
  }, []);

  // Format ngày hiển thị
  const formatDate = d => {
    const arr = d.split("-");
    return new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2])).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Fetch activities theo ngày
  const fetchByDate = async (dateStr) => {
    setLoading(true);
    try {
      const res = await httpApiClient.get(`activities/search-by-date?date=${dateStr}`);
      const json = await res.json();
      setAllActivities(Array.isArray(json) ? json : (json.data || []));
    } catch {
      setAllActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch activities theo tuần
  const fetchByWeek = async (start, end) => {
    setLoading(true);
    try {
      const res = await httpApiClient.get(`activities/search-by-range?startDate=${start}&endDate=${end}`);
      const json = await res.json();
      setAllActivities(Array.isArray(json) ? json : (json.data || []));
    } catch {
      setAllActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Khi mount, lấy ngày hiện tại
  useEffect(() => {
    fetchByDate(todayStr);
  }, []);

  // Khi đổi searchType hoặc selectedDate, fetch lại dữ liệu phù hợp
  useEffect(() => {
    if (searchType === "week") {
      const { start, end } = getWeekRange(selectedDate);
      fetchByWeek(start, end);
      setWeekRange(getWeekRange(selectedDate));
    } else {
      fetchByDate(selectedDate);
    }
  }, [searchType, selectedDate]);

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

  // Modal xác nhận ghim/bỏ ghim
  const confirmPin = (act) => {
    const isPinned = act.pinned === true;
    const newPinned = !isPinned;
    Alert.alert(
      newPinned ? "Xác nhận ghim hoạt động" : "Xác nhận bỏ ghim hoạt động",
      `${newPinned ? "Bạn muốn ghim hoạt động này?" : "Bạn muốn bỏ ghim hoạt động này?"}\n\nTên: ${act.name}\nChi tiết: ${act.notes || act.description || "Không có"}`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: newPinned ? "Ghim" : "Bỏ ghim",
          style: "destructive",
          onPress: () => handlePin(act),
        },
      ]
    );
  };

  // Ghim hoặc bỏ ghim activity
  const handlePin = (act) => {
    const isPinned = act.pinned === true;
    const newPinned = !isPinned;
    httpApiClient.put(`activities/${act.id}/pin?pinned=${newPinned}`)
      .then(() => {
        Alert.alert(
          newPinned ? "Đã ghim hoạt động" : "Đã bỏ ghim hoạt động",
          `Tên: ${act.name}\nChi tiết: ${act.notes || act.description || "Không có"}`
        );
        act.pinned = newPinned;
        setAllActivities(prev => prev.map(a => a.id === act.id ? { ...a, pinned: newPinned } : a));
      })
      .catch(() => {
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái ghim");
      });
  };

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

          {loading ? (
            <View style={{flex:1,justifyContent:'center',alignItems:'center',marginTop:30}}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{color:'#007AFF',fontWeight:'600',fontSize:16,marginTop:16}}>Đang lấy dữ liệu hoạt động...</Text>
            </View>
          ) : (
            <>
              {searchType === "date" ? (
                <Calendar
                  current={selectedDate}
                  onDayPress={d => setSelectedDate(d.dateString)}
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
                  <WeekStrip weekRange={weekRange} selectedDate={selectedDate} onPressDay={setSelectedDate} />
                </>
              )}

              <Text style={styles.countText}>
                {activities.length > 0
                  ? `Có ${activities.length} hoạt động`
                  : 'Không có hoạt động nào'}
              </Text>
              <FlatList
                data={activities}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => {
                  const isToday = getVNDateString(item.startTime) === todayStr;
                  return (
                    <View style={[styles.activityItem, isToday && styles.activityToday]}>
                      <View style={styles.activityHeader}>
                        <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{marginRight:6}} />
                        <Text style={[styles.activityName, isToday && styles.activityNameToday]}>{item.name}</Text>
                      </View>
                      <Text style={styles.activityInfo}>
                        <Ionicons name="location-outline" size={16} color="#888" /> {item.location}
                      </Text>
                      <Text style={styles.activityInfo}>
                        <Ionicons name="time-outline" size={16} color="#888" /> {item.startTime ? `${formatDate(getVNDateString(item.startTime))} ${item.startTime.slice(11, 16)}` : ""}
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
                        {canEdit && (
                          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEdit(item)}>
                            <Ionicons name="create-outline" size={20} color="#007AFF" />
                            <Text className="actionText">Sửa</Text>
                          </TouchableOpacity>
                        )}
                        {canDelete && (
                          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            <Text style={[styles.actionText, { color: "#FF3B30" }]}>Xóa</Text>
                          </TouchableOpacity>
                        )}
                        {canPin && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.pinned ? '#fffde7' : '#fffbe6', borderColor: item.pinned ? '#ffe082' : '#ffe58f' }]} onPress={() => confirmPin(item)}>
                            <Ionicons name={item.pinned ? "star" : "star-outline"} size={20} color="#FFB300" />
                            <Text style={[styles.actionText, { color: "#FFB300" }]}>{item.pinned ? "Bỏ ghim" : "Ghim"}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {isToday && (
                        <Text style={styles.todayLabel}>Hôm nay</Text>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={styles.empty}>Không có hoạt động nào trong ngày này</Text>}
                style={{ flex: 1 }}
              />
            </>
          )}
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
  countText: {
    textAlign: 'center',
    color: '#333',
    fontWeight: '600',
    marginBottom: 10,
    fontSize: 15,
  },
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
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: { fontWeight: "bold", fontSize: 17, color: "#007AFF", marginBottom: 2 },
  activityInfo: { color: "#333", fontSize: 14, marginBottom: 2, marginLeft: 2 },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, marginLeft: 10, backgroundColor: '#f7fafd', borderWidth: 1, borderColor: '#e0e7ef' },
  editBtn: { backgroundColor: '#e6f7ff', borderColor: '#b3d4fc' },
  deleteBtn: { backgroundColor: '#fff0f0', borderColor: '#ffd6d6' },
  actionText: { marginLeft: 4, color: "#007AFF", fontWeight: "bold", fontSize: 15 },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
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
});