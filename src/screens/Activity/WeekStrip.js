// src/components/WeekStrip.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// weekRange = { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
// selectedDate = 'YYYY-MM-DD'
// onPressDay = dateString => void
export default function WeekStrip({ weekRange, selectedDate, onPressDay }) {
  // build mảng 7 ngày
  const start = new Date(weekRange.start + 'T00:00:00');  
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0,10);  
    return {
      iso,
      label: d.toLocaleDateString('en-US',{weekday:'short'}), // Mon, Tue...
      date: d.getDate()
    };
  });

  return (
    <View style={styles.row}>
      {days.map(day => (
        <TouchableOpacity
          key={day.iso}
          style={[
            styles.dayBox,
            day.iso === selectedDate && styles.dayBoxSelected
          ]}
          onPress={() => onPressDay(day.iso)}
        >
          <Text style={[
            styles.weekday,
            day.iso === selectedDate && styles.weekdaySelected
          ]}>
            {day.label}
          </Text>
          <Text style={[
            styles.daynum,
            day.iso === selectedDate && styles.daynumSelected
          ]}>
            {day.date}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection:'row', backgroundColor:'#fff', borderRadius:8, marginBottom:10 },
  dayBox: { flex:1, paddingVertical:8, alignItems:'center' },
  dayBoxSelected: { backgroundColor:'#007AFF', borderRadius:8 },
  weekday: { fontSize:12, color:'#555' },
  weekdaySelected: { color:'#fff' },
  daynum: { fontSize:16, color:'#333', marginTop:4 },
  daynumSelected: { color:'#fff', fontWeight:'bold' },
});
