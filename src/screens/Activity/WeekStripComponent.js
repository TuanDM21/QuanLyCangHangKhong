import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * WeekStripComponent - Component hiển thị dải ngày trong tuần từ Thứ 2 - Chủ Nhật
 * 
 * @param {Object} props
 * @param {Object} props.weekRange - Đối tượng chứa ngày đầu tuần (start) và cuối tuần (end)
 * @param {string} props.selectedDate - Ngày đang được chọn (dạng YYYY-MM-DD)
 * @param {Function} props.onPressDay - Hàm callback khi người dùng nhấn vào một ngày
 */
const WeekStripComponent = ({ weekRange, selectedDate, onPressDay }) => {
  // Lấy ngày hiện tại để đánh dấu
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const date = d.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${date}`;
  }, []);
  
  // Tạo mảng các ngày trong tuần (từ thứ 2 đến chủ nhật)
  const days = useMemo(() => {
    if (!weekRange || !weekRange.start) return [];
    
    const start = new Date(weekRange.start + 'T00:00:00');
    const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      return {
        iso,
        label: weekdayLabels[i],
        date: d.getDate(),
        isToday: iso === todayStr
      };
    });
  }, [weekRange, todayStr]);

  return (
    <View style={styles.weekRow}>
      {days.map(day => (
        <TouchableOpacity
          key={day.iso}
          style={[
            styles.weekDayBox, 
            day.iso === selectedDate && styles.weekDayBoxSelected,
            day.isToday && day.iso !== selectedDate && styles.weekDayBoxToday
          ]}
          onPress={() => onPressDay(day.iso)}
        >
          <Text style={[
            styles.weekday, 
            day.iso === selectedDate && styles.weekdaySelected,
            day.isToday && day.iso !== selectedDate && styles.weekdayToday
          ]}>
            {day.label}
          </Text>
          <Text style={[
            styles.daynum, 
            day.iso === selectedDate && styles.daynumSelected,
            day.isToday && day.iso !== selectedDate && styles.daynumToday
          ]}>
            {day.date}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
  weekDayBox: { 
    flex: 1, 
    paddingVertical: 8, 
    alignItems: "center" 
  },
  weekDayBoxSelected: { 
    backgroundColor: "#007AFF", 
    borderRadius: 8 
  },
  weekDayBoxToday: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF"
  },
  weekday: { 
    fontSize: 12, 
    color: "#555" 
  },
  weekdaySelected: { 
    color: "#fff" 
  },
  weekdayToday: {
    fontWeight: "600",
    color: "#007AFF"
  },
  daynum: { 
    fontSize: 16, 
    color: "#333", 
    marginTop: 4 
  },
  daynumSelected: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  daynumToday: {
    fontWeight: "bold",
    color: "#007AFF"
  }
});

export default React.memo(WeekStripComponent);
