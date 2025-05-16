import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import httpApiClient from "../services";

// Helper: lấy ngày đầu tuần (thứ 2) và cuối tuần (chủ nhật) từ 1 ngày
function getWeekRange(date) {
  const d = new Date(date);
  let day = d.getDay();
  if (day === 0) day = 7; // Chủ nhật là 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

// Helper: format yyyy-MM-dd
function formatDate(d) {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const date = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${date}`;
}

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function MyShiftScreen() {
  const [userId, setUserId] = useState("");
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return getWeekRange(today).start;
  });
  const [weekEnd, setWeekEnd] = useState(() => {
    const today = new Date();
    return getWeekRange(today).end;
  });
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]); // [{type, ...data}]

  // Lấy userId từ AsyncStorage
  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserId(user.id);
      }
    })();
  }, []);

  // Fetch lịch trực (cả ca trực và chuyến bay) trong tuần
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const start = formatDate(weekStart);
    const end = formatDate(weekEnd);
    httpApiClient
      .get(`user-shifts/filter-by-user-and-range?userId=${userId}&startDate=${start}&endDate=${end}`)
      .json()
      .then((data) => {
        console.log("DATA FROM API:", data); // Log dữ liệu trả về từ API
        const arr = Array.isArray(data.data)
          ? data.data.map((s) => {
              if (s.shiftCode) return { ...s, type: "ca" };
              if (s.location && s.description && s.description.startsWith("Phục vụ chuyến bay"))
                return { ...s, type: "flight" };
              return s;
            })
          : [];
        setShifts(arr);
      })
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, [userId, weekStart, weekEnd]);

  // Tạo mảng ngày trong tuần
  const daysOfWeek = [];
  for (let i = 0; i < 7; ++i) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    daysOfWeek.push({
      label: weekdayLabels[i],
      date: formatDate(d),
      dateObj: d,
    });
  }

  // Gộp lịch theo ngày
  const shiftsByDay = daysOfWeek.map((day) => {
    const ca = shifts.filter((s) => s.type === "ca" && s.shiftDate === day.date);
    const flight = shifts.filter(
      (s) =>
        s.type === "flight" &&
        (s.shiftDate === day.date || s.flightDate === day.date)
    );
    return { ...day, ca, flight };
  });

  // Chuyển tuần
  const changeWeek = (offset) => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + offset * 7);
    const range = getWeekRange(newStart);
    setWeekStart(range.start);
    setWeekEnd(range.end);
  };

  return (
    <Layout>
      <View style={stylesModern.bgWrapper}>
        <Text style={stylesModern.title}>Lịch trực của tôi (theo tuần)</Text>
        <View style={stylesModern.weekNav}>
          <TouchableOpacity style={stylesModern.navBtn} onPress={() => changeWeek(-1)}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={stylesModern.weekLabel}>
            {formatDate(weekStart)} - {formatDate(weekEnd)}
          </Text>
          <TouchableOpacity style={stylesModern.navBtn} onPress={() => changeWeek(1)}>
            <Ionicons name="chevron-forward" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color="#007AFF" size="large" style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            data={shiftsByDay}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                style={stylesModern.dayCard}
              >
                <View style={stylesModern.dayHeader}>
                  <Text style={stylesModern.dayLabel}>{item.label}</Text>
                  <Text style={stylesModern.dayDate}>{item.date}</Text>
                </View>
                {item.ca.length === 0 && item.flight.length === 0 ? (
                  <Text style={stylesModern.noShift}>Không có lịch trực</Text>
                ) : (
                  <>
                    {item.ca.map((s, idx) => (
                      <View key={"ca" + idx} style={[stylesModern.shiftBox, { backgroundColor: '#e0f7fa' }]}> 
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color="#007AFF"
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={stylesModern.shiftTitle}>Ca trực: <Text style={{color:'#007AFF'}}>{s.shiftCode}</Text></Text>
                          <Text style={stylesModern.shiftText}>{s.startTime} - {s.endTime} | {s.location}</Text>
                        </View>
                      </View>
                    ))}
                    {item.flight.map((f, idx) => (
                      <View key={"flight" + idx} style={[stylesModern.shiftBox, { backgroundColor: '#fff7e6' }]}> 
                        <Ionicons
                          name="airplane"
                          size={20}
                          color="#FF9500"
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={stylesModern.shiftTitle}>Chuyến bay</Text>
                          <Text style={stylesModern.shiftText}>{f.description} | {f.location}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 30 }}
          />
        )}
      </View>
    </Layout>
  );
}

const stylesModern = StyleSheet.create({
  bgWrapper: {
    flex: 1,
    backgroundColor: 'linear-gradient(180deg, #e0f2fe 0%, #f8fafc 100%)',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  navBtn: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 4,
    shadowColor: '#007AFF',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginHorizontal: 18,
    letterSpacing: 0.5,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#007AFF',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#e0e7ef',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayLabel: {
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 18,
    letterSpacing: 1,
  },
  dayDate: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  noShift: {
    color: '#bbb',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 15,
  },
  shiftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  shiftTitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
    color: '#222',
  },
  shiftText: {
    color: '#444',
    fontSize: 14,
  },
});