import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Modal,
} from "react-native";
import Layout from "../Common/Layout";
import httpApiClient from "../../services";
import { Calendar, CalendarProvider } from "react-native-calendars";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import APIPerformanceHelper from "../../utils/apiPerformanceHelper";

const { width } = Dimensions.get('window');

// API Performance Tracking Utility
class APIPerformanceTracker {
  static startTimer(apiName, params = {}) {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    
    console.log(`📊 [API START] ${apiName}`, {
      timestamp,
      screen: 'SearchActivityScreen',
      params,
      startTime: startTime
    });
    
    return {
      apiName,
      startTime,
      timestamp,
      params
    };
  }
  
  static endTimer(timerData, response = null, error = null) {
    const endTime = performance.now();
    const duration = endTime - timerData.startTime;
    const endTimestamp = new Date().toISOString();
    
    const logData = {
      apiName: timerData.apiName,
      screen: 'SearchActivityScreen',
      startTime: timerData.timestamp,
      endTime: endTimestamp,
      duration: `${duration.toFixed(2)}ms`,
      durationMs: Math.round(duration),
      params: timerData.params,
      success: !error,
      ...(response && {
        status: response.status,
        statusText: response.statusText,
        responseSize: response.headers?.get('content-length') || 'unknown'
      }),
      ...(error && {
        error: error.message,
        errorType: error.constructor.name
      })
    };
    
    if (error) {
      console.error(`❌ [API ERROR] ${timerData.apiName}`, logData);
    } else if (duration > 3000) {
      console.warn(`⚠️ [API SLOW] ${timerData.apiName}`, logData);
    } else if (duration > 1000) {
      console.log(`🐌 [API MEDIUM] ${timerData.apiName}`, logData);
    } else {
      console.log(`✅ [API FAST] ${timerData.apiName}`, logData);
    }
    
    // Alert for very slow APIs (over 5 seconds)
    if (duration > 5000 && !error) {
      console.warn(`🚨 CRITICAL: API ${timerData.apiName} took ${duration.toFixed(0)}ms - Backend optimization needed!`);
    }
    
    return logData;
  }
  
  static logSummary(apiCalls) {
    if (apiCalls.length === 0) return;
    
    const totalTime = apiCalls.reduce((sum, call) => sum + call.durationMs, 0);
    const avgTime = totalTime / apiCalls.length;
    const slowCalls = apiCalls.filter(call => call.durationMs > 1000);
    
    console.log(`📈 [API SUMMARY] SearchActivityScreen Session`, {
      totalCalls: apiCalls.length,
      totalTimeMs: totalTime,
      averageTimeMs: Math.round(avgTime),
      slowCalls: slowCalls.length,
      slowCallDetails: slowCalls.map(call => ({
        api: call.apiName,
        duration: call.duration,
        params: call.params
      }))
    });
  }
}

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
    <View style={styles.weekContainer}>
      <LinearGradient
        colors={['#F8FAFC', '#E5E7EB']}
        style={styles.weekGradient}
      >
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
              <LinearGradient
                colors={day.iso === selectedDate ? ['#3B82F6', '#1D4ED8'] : ['transparent', 'transparent']}
                style={styles.weekDayGradient}
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
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
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

// Lấy tên thứ trong tuần
function getWeekdayName(dateStr) {
  const date = parseLocalDate(dateStr);
  const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return weekdays[date.getDay()];
}

// Nhóm hoạt động theo ngày và sắp xếp theo thứ tự tuần với ưu tiên ngày được chọn
function groupActivitiesByDay(activities, selectedDate) {
  const grouped = {};
  
  activities.forEach(activity => {
    const dateStr = getVNDateString(activity.startTime);
    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }
    grouped[dateStr].push(activity);
  });
  
  // Sắp xếp các ngày với ưu tiên ngày được chọn
  const sortedDays = Object.keys(grouped).sort((a, b) => {
    // Priority 1: Selected date comes first
    if (a === selectedDate && b !== selectedDate) return -1;
    if (a !== selectedDate && b === selectedDate) return 1;
    
    // Priority 2: Sort by weekday order (Monday to Sunday)
    const dayA = parseLocalDate(a).getDay();
    const dayB = parseLocalDate(b).getDay();
    
    // Chuyển đổi để Thứ 2 = 0, Thứ 3 = 1, ..., Chủ nhật = 6
    const orderA = dayA === 0 ? 6 : dayA - 1;
    const orderB = dayB === 0 ? 6 : dayB - 1;
    
    return orderA - orderB;
  });
  
  return sortedDays.map(date => ({
    date,
    weekday: getWeekdayName(date),
    isSelectedDate: date === selectedDate,
    activities: grouped[date].sort((a, b) => {
      // Sắp xếp hoạt động trong ngày theo thời gian
      const timeA = a.startTime ? a.startTime.slice(11, 16) : "00:00";
      const timeB = b.startTime ? b.startTime.slice(11, 16) : "00:00";
      return timeA.localeCompare(timeB);
    })
  }));
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

// Participants Detail Modal Component
const ParticipantsModal = React.memo(({ visible, participants, onClose, activityName }) => {
  const getParticipantIcon = (type) => {
    switch (type) {
      case 'TEAM': return 'people';
      case 'UNIT': return 'business';
      case 'USER': return 'person';
      default: return 'people-outline';
    }
  };

  const getParticipantColor = (type) => {
    switch (type) {
      case 'TEAM': return '#F59E0B';
      case 'UNIT': return '#8B5CF6';
      case 'USER': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getParticipantTypeLabel = (type) => {
    switch (type) {
      case 'TEAM': return 'Đội';
      case 'UNIT': return 'Tổ';
      case 'USER': return 'Cá nhân';
      default: return 'Khác';
    }
  };

  // Group participants by type
  const groupedParticipants = participants.reduce((acc, participant) => {
    const type = participant?.participantType || 'USER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(participant);
    return acc;
  }, {});

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          style={styles.modalHeader}
        >
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.modalHeaderContent}>
            <MaterialCommunityIcons name="account-group" size={32} color="white" />
            <Text style={styles.modalTitle}>Danh sách tham gia</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>{activityName}</Text>
          </View>
        </LinearGradient>

        {/* Participants List */}
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalStats}>
            <Text style={styles.modalStatsText}>
              Tổng cộng: {participants.length} người tham gia
            </Text>
          </View>

          {Object.entries(groupedParticipants).map(([type, typeParticipants]) => (
            <View key={type} style={styles.participantTypeSection}>
              {/* Type Header */}
              <View style={styles.typeHeader}>
                <LinearGradient
                  colors={[getParticipantColor(type), getParticipantColor(type) + '80']}
                  style={styles.typeHeaderGradient}
                >
                  <View style={styles.typeIconContainer}>
                    <Ionicons 
                      name={getParticipantIcon(type)} 
                      size={20} 
                      color="white" 
                    />
                  </View>
                  <Text style={styles.typeHeaderText}>
                    {getParticipantTypeLabel(type)} ({typeParticipants.length})
                  </Text>
                </LinearGradient>
              </View>

              {/* Participants in this type */}
              <View style={styles.typeParticipantsList}>
                {typeParticipants.map((participant, index) => (
                  <View key={`${type}-${index}`} style={styles.participantDetailItem}>
                    <View style={[styles.participantDetailIcon, { backgroundColor: getParticipantColor(type) }]}>
                      <Ionicons 
                        name={getParticipantIcon(type)} 
                        size={16} 
                        color="white" 
                      />
                    </View>
                    <View style={styles.participantDetailInfo}>
                      <Text style={styles.participantDetailName}>
                        {participant?.participantName || `${getParticipantTypeLabel(type)} ${index + 1}`}
                      </Text>
                      <Text style={styles.participantDetailId}>
                        ID: {participant?.participantId || 'N/A'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

// Participants Summary Component - hiển thị tóm tắt thông minh
const ParticipantsSummary = React.memo(({ participants, onPress }) => {
  const maxVisible = 3; // Hiển thị tối đa 3 participants
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;
  
  // Đếm theo loại participant
  const typeCounts = participants.reduce((acc, p) => {
    const type = p?.participantType || 'USER';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const getTypeIcon = (type) => {
    switch (type) {
      case 'TEAM': return 'people';
      case 'UNIT': return 'business';
      case 'USER': return 'person';
      default: return 'people-outline';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'TEAM': return '#F59E0B';
      case 'UNIT': return '#8B5CF6';
      case 'USER': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'TEAM': return 'Đội';
      case 'UNIT': return 'Tổ';
      case 'USER': return 'Cá nhân';
      default: return 'Khác';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.participantsSummaryContainer} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header với tổng số */}
      <View style={styles.participantsSummaryHeader}>
        <View style={styles.participantsIconContainer}>
          <MaterialCommunityIcons 
            name="account-group" 
            size={14} 
            color={participants.length > 1 ? "#D97706" : "#3B82F6"} 
          />
        </View>
        <Text style={[
          styles.participantsSummaryTitle,
          participants.length > 1 && styles.multiParticipantsTitle
        ]}>
          {participants.length} người tham gia
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#6B7280" />
      </View>

      {/* Hiển thị theo loại */}
      <View style={styles.participantsTypesList}>
        {Object.entries(typeCounts).map(([type, count]) => (
          <View key={type} style={[styles.participantTypeChip, { borderColor: getTypeColor(type) }]}>
            <View style={[styles.participantTypeIcon, { backgroundColor: getTypeColor(type) }]}>
              <Ionicons name={getTypeIcon(type)} size={10} color="white" />
            </View>
            <Text style={styles.participantTypeText}>
              {count} {getTypeLabel(type)}
            </Text>
          </View>
        ))}
      </View>

      {/* Hiển thị tên của một vài participants đầu */}
      {participants.length <= 4 ? (
        <View style={styles.participantsNamesList}>
          {participants.map((participant, index) => (
            <Text key={index} style={styles.participantNameText} numberOfLines={1}>
              • {participant?.participantName || `Participant ${index + 1}`}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.participantsNamesList}>
          {visibleParticipants.map((participant, index) => (
            <Text key={index} style={styles.participantNameText} numberOfLines={1}>
              • {participant?.participantName || `Participant ${index + 1}`}
            </Text>
          ))}
          {remainingCount > 0 && (
            <Text style={styles.remainingParticipantsText}>
              và {remainingCount} người khác... (bấm để xem)
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

// Participant Chip Component với thiết kế mới
const ParticipantChip = React.memo(({ participant, index }) => {
  const displayName = participant.participantName || `Participant ${index + 1}`;
  
  const getParticipantIcon = (type) => {
    switch (type) {
      case 'TEAM': return 'people';
      case 'UNIT': return 'business';
      case 'USER': return 'person';
      default: return 'people-outline';
    }
  };

  const getParticipantColor = (type) => {
    switch (type) {
      case 'TEAM': return ['#F59E0B', '#D97706'];
      case 'UNIT': return ['#8B5CF6', '#7C3AED'];
      case 'USER': return ['#10B981', '#059669'];
      default: return ['#6B7280', '#4B5563'];
    }
  };

  return (
    <View style={styles.participantChip}>
      <LinearGradient
        colors={getParticipantColor(participant?.participantType)}
        style={styles.participantGradient}
      >
        <View style={styles.participantIcon}>
          <Ionicons 
            name={getParticipantIcon(participant?.participantType)} 
            size={12} 
            color="white" 
          />
        </View>
        <Text style={styles.participantName} numberOfLines={1}>
          {displayName}
        </Text>
      </LinearGradient>
    </View>
  );
});

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

  // Modal state
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [selectedActivityParticipants, setSelectedActivityParticipants] = useState([]);
  const [selectedActivityName, setSelectedActivityName] = useState('');
  
  // API Performance tracking
  const [apiCallsHistory, setApiCallsHistory] = useState([]);

  // Modal handlers
  const openParticipantsModal = (participants, activityName) => {
    setSelectedActivityParticipants(participants);
    setSelectedActivityName(activityName);
    setParticipantsModalVisible(true);
  };

  const closeParticipantsModal = () => {
    setParticipantsModalVisible(false);
    setSelectedActivityParticipants([]);
    setSelectedActivityName('');
  };

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
    // Start API timing
    const timer = APIPerformanceTracker.startTimer("activities/search-by-date", {
      date: dateStr,
      requestType: "GET",
      endpoint: `activities/search-by-date?date=${dateStr}`,
      description: "Fetch activities by specific date"
    });
    
    setLoading(true);
    let response = null;
    
    try {
      response = await httpApiClient.get(`activities/search-by-date?date=${dateStr}`);
      const json = await response.json();
      const activities = Array.isArray(json) ? json : (json.data || []);
      
      setAllActivities(activities);
      
      // Log success timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
      // Log additional data info
      console.log(`📋 [API DATA] search-by-date`, {
        date: dateStr,
        totalActivities: activities.length,
        hasParticipants: activities.filter(act => act.participants && act.participants.length > 0).length,
        avgParticipantsPerActivity: activities.length > 0 ? 
          (activities.reduce((sum, act) => sum + (act.participants?.length || 0), 0) / activities.length).toFixed(1) : 0,
        dataStructure: activities.length > 0 ? Object.keys(activities[0]) : []
      });
      
    } catch (error) {
      console.error('SearchActivityScreen - Error fetching activities by date:', error);
      setAllActivities([]);
      
      // Log error timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response, error);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
      Alert.alert("Lỗi", "Không thể tải dữ liệu hoạt động");
    } finally {
      setLoading(false);
    }
  };

  // Fetch activities theo tuần
  const fetchByWeek = async (start, end) => {
    // Start API timing
    const timer = APIPerformanceTracker.startTimer("activities/search-by-range", {
      startDate: start,
      endDate: end,
      requestType: "GET",
      endpoint: `activities/search-by-range?startDate=${start}&endDate=${end}`,
      description: "Fetch activities by date range (week view)"
    });
    
    setLoading(true);
    let response = null;
    
    try {
      response = await httpApiClient.get(`activities/search-by-range?startDate=${start}&endDate=${end}`);
      const json = await response.json();
      const activities = Array.isArray(json) ? json : (json.data || []);
      
      setAllActivities(activities);
      
      // Log success timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
      // Log additional data info
      console.log(`📋 [API DATA] search-by-range`, {
        startDate: start,
        endDate: end,
        dayRange: Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1,
        totalActivities: activities.length,
        hasParticipants: activities.filter(act => act.participants && act.participants.length > 0).length,
        avgParticipantsPerActivity: activities.length > 0 ? 
          (activities.reduce((sum, act) => sum + (act.participants?.length || 0), 0) / activities.length).toFixed(1) : 0,
        dataStructure: activities.length > 0 ? Object.keys(activities[0]) : [],
        activitiesByDay: activities.reduce((acc, act) => {
          const day = getVNDateString(act.startTime);
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {})
      });
      
    } catch (error) {
      console.error('SearchActivityScreen - Error fetching activities by week:', error);
      setAllActivities([]);
      
      // Log error timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response, error);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
      Alert.alert("Lỗi", "Không thể tải dữ liệu hoạt động");
    } finally {
      setLoading(false);
    }
  };

  // Khi mount, lấy ngày hiện tại
  useEffect(() => {
    fetchByDate(todayStr);
  }, []);

  // Log API performance summary when component unmounts
  useEffect(() => {
    return () => {
      if (apiCallsHistory.length > 0) {
        APIPerformanceTracker.logSummary(apiCallsHistory);
      }
    };
  }, [apiCallsHistory]);

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
      if (day) m[day] = m[day] || { dots: [{ color: "#3B82F6" }] };
    });
    m[selectedDate] = {
      ...(m[selectedDate] || {}),
      selected: true,
      selectedColor: "#3B82F6",
      dots: m[selectedDate]?.dots || [{ color: "#3B82F6" }],
    };
    setMarkedDates(m);

    // Khi searchType = "date", lọc ra hoạt động của selectedDate
    if (searchType === "date") {
      const filtered = allActivities.filter(act => 
        getVNDateString(act.startTime) === selectedDate
      );
      
      // Sort activities by time (earlier times first)
      const sorted = filtered.sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return timeA - timeB;
      });
      
      setActivities(sorted);
    } else {
      // Week view - group by day and sort with selected date priority
      const filtered = allActivities.filter(act => {
        const actDate = getVNDateString(act.startTime);
        return actDate >= weekRange.start && actDate <= weekRange.end;
      });
      
      // Sort activities with selected date priority
      const sorted = filtered.sort((a, b) => {
        const dateA = getVNDateString(a.startTime);
        const dateB = getVNDateString(b.startTime);
        
        // Priority 1: Selected date activities come first
        const isASelectedDate = dateA === selectedDate;
        const isBSelectedDate = dateB === selectedDate;
        
        if (isASelectedDate && !isBSelectedDate) return -1;
        if (!isASelectedDate && isBSelectedDate) return 1;
        
        // Priority 2: Sort by date (earlier dates first)
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        
        // Priority 3: Sort by time within the same date (earlier times first)
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        
        return timeA - timeB;
      });
      
      setActivities(sorted);
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
    Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa hoạt động này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          // Start API timing
          const timer = APIPerformanceTracker.startTimer("activities/delete", {
            activityId: id,
            requestType: "DELETE",
            endpoint: `activities/${id}`,
            description: "Delete specific activity"
          });
          
          let response = null;
          
          try {
            response = await httpApiClient.delete(`activities/${id}`);
            if (response.ok) {
              setAllActivities(prev => prev.filter(a => a.id !== id));
              Alert.alert("Thành công", "Đã xóa hoạt động");
              
              // Log success timing
              const apiLog = APIPerformanceTracker.endTimer(timer, response);
              setApiCallsHistory(prev => [...prev, apiLog]);
              
              // Add to global performance helper
              APIPerformanceHelper.addPerformanceData(apiLog);
            }
          } catch (error) {
            Alert.alert("Lỗi", "Không thể kết nối server");
            
            // Log error timing
            const apiLog = APIPerformanceTracker.endTimer(timer, response, error);
            setApiCallsHistory(prev => [...prev, apiLog]);
            
            // Add to global performance helper
            APIPerformanceHelper.addPerformanceData(apiLog);
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
      newPinned ? "Ghim hoạt động" : "Bỏ ghim hoạt động",
      `${newPinned ? "Bạn muốn ghim hoạt động này?" : "Bạn muốn bỏ ghim hoạt động này?"}\n\n${act.name}`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: newPinned ? "Ghim" : "Bỏ ghim",
          style: "default",
          onPress: () => handlePin(act),
        },
      ]
    );
  };

  // Ghim hoặc bỏ ghim activity
  const handlePin = async (act) => {
    const isPinned = act.pinned === true;
    const newPinned = !isPinned;
    
    // Start API timing
    const timer = APIPerformanceTracker.startTimer("activities/pin", {
      activityId: act.id,
      activityName: act.name,
      currentPinned: isPinned,
      newPinned: newPinned,
      requestType: "PUT",
      endpoint: `activities/${act.id}/pin?pinned=${newPinned}`,
      description: `${newPinned ? "Pin" : "Unpin"} activity`
    });
    
    try {
      const response = await httpApiClient.put(`activities/${act.id}/pin?pinned=${newPinned}`);
      
      Alert.alert(
        "Thành công",
        `${newPinned ? "Đã ghim" : "Đã bỏ ghim"} hoạt động: ${act.name}`
      );
      act.pinned = newPinned;
      setAllActivities(prev => prev.map(a => a.id === act.id ? { ...a, pinned: newPinned } : a));
      
      // Log success timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái ghim");
      
      // Log error timing
      const apiLog = APIPerformanceTracker.endTimer(timer, null, error);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
    }
  };

  // Activity Item Component với thiết kế mới
  const ActivityItem = React.memo(({ item, index, isGrouped = false, onOpenParticipantsModal }) => {
    const itemDate = getVNDateString(item.startTime);
    const isToday = itemDate === todayStr;
    const isSelectedDate = itemDate === selectedDate;
    const startTime = item.startTime ? item.startTime.slice(11, 16) : "";
    
    return (
      <View style={styles.activityItemContainer}>
        <LinearGradient
          colors={
            isToday 
              ? ['#FEF3C7', '#FFFFFF'] 
              : isSelectedDate 
              ? ['#EBF8FF', '#FFFFFF']
              : ['#FFFFFF', '#F8FAFC']
          }
          style={[
            styles.activityCard, 
            isToday && styles.activityToday,
            isSelectedDate && !isToday && styles.activitySelectedDate
          ]}
        >
          {/* Activity Header */}
          <View style={styles.activityHeader}>
            <LinearGradient
              colors={
                isToday 
                  ? ['#F59E0B', '#D97706'] 
                  : isSelectedDate 
                  ? ['#3B82F6', '#1D4ED8']
                  : ['#6B7280', '#4B5563']
              }
              style={styles.activityIconContainer}
            >
              <MaterialCommunityIcons 
                name="calendar-star" 
                size={20} 
                color="white" 
              />
            </LinearGradient>
            
            <View style={styles.activityTitleContainer}>
              <Text style={[
                styles.activityName, 
                isToday && styles.activityNameToday,
                isSelectedDate && !isToday && styles.activityNameSelected
              ]} numberOfLines={2}>
                {item.name}
              </Text>
              {isToday && (
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.todayBadge}
                >
                  <MaterialCommunityIcons name="star" size={10} color="white" />
                  <Text style={styles.todayBadgeText}>Hôm nay</Text>
                </LinearGradient>
              )}
              {isSelectedDate && !isToday && (
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.selectedDateBadge}
                >
                  <MaterialCommunityIcons name="calendar-check" size={10} color="white" />
                  <Text style={styles.selectedDateBadgeText}>Ngày được chọn</Text>
                </LinearGradient>
              )}
              {item.pinned && (
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.pinnedBadge}
                >
                  <MaterialCommunityIcons name="pin" size={10} color="white" />
                  <Text style={styles.pinnedBadgeText}>Đã ghim</Text>
                </LinearGradient>
              )}
            </View>
          </View>
          
          {/* Activity Details */}
          <View style={styles.activityBody}>
            <View style={styles.activityInfoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location" size={14} color="#F59E0B" />
              </View>
              <Text style={styles.activityInfo} numberOfLines={1}>{item.location}</Text>
            </View>
            
            <View style={styles.activityInfoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time" size={14} color="#8B5CF6" />
              </View>
              <Text style={styles.activityInfo}>
                {isGrouped ? startTime : `${formatDate(getVNDateString(item.startTime))} ${startTime}`}
              </Text>
            </View>
            
            {item.notes && (
              <View style={styles.activityInfoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="document-text" size={14} color="#10B981" />
                </View>
                <Text style={styles.activityInfo} numberOfLines={2}>{item.notes}</Text>
              </View>
            )}
          </View>
          
          {/* Participants Section với thiết kế mới */}
          {Array.isArray(item.participants) && item.participants.length > 0 ? (
            <ParticipantsSummary 
              participants={item.participants} 
              onPress={() => onOpenParticipantsModal(item.participants, item.name)}
            />
          ) : (
            <View style={styles.noParticipantsContainer}>
              <LinearGradient
                colors={['#FEF2F2', '#FECACA']}
                style={styles.noParticipantsGradient}
              >
                <MaterialCommunityIcons name="account-off" size={18} color="#DC2626" />
                <Text style={styles.noParticipantsText}>
                  Chưa có người tham gia
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Action Buttons */}
          {(canEdit || canDelete || canPin) && (
            <View style={styles.actionRow}>
              {canEdit && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="create" size={14} color="white" />
                    <Text style={styles.actionBtnText}>Sửa</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.actionGradient}
                  >
                    <Ionicons name="trash" size={14} color="white" />
                    <Text style={styles.actionBtnText}>Xóa</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {canPin && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => confirmPin(item)}>
                  <LinearGradient
                    colors={item.pinned ? ['#8B5CF6', '#7C3AED'] : ['#F59E0B', '#D97706']}
                    style={styles.actionGradient}
                  >
                    <Ionicons 
                      name={item.pinned ? "star" : "star-outline"} 
                      size={14} 
                      color="white" 
                    />
                    <Text style={styles.actionBtnText}>
                      {item.pinned ? "Bỏ ghim" : "Ghim"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  });

  return (
    <Layout>
      <SafeAreaView style={styles.safeArea}>
        <CalendarProvider date={selectedDate}>
          <View style={styles.container}>
            {/* Header với gradient */}
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={styles.headerGradient}
            >
                          <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={styles.performanceButton}
                onPress={() => APIPerformanceHelper.generateDetailedReport()}
              >
                <MaterialCommunityIcons name="chart-line" size={20} color="white" />
              </TouchableOpacity>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons name="calendar-search" size={24} color="white" />
              </View>
              <Text style={styles.title}>Lịch hoạt động</Text>
            </View>
            </LinearGradient>

            {/* Search Type Selector với gradient */}
            <View style={styles.searchTypeContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.searchTypeGradient}
              >
                <View style={styles.searchTypeRow}>
                  {[
                    { key: "date", label: "Theo ngày", icon: "calendar" },
                    { key: "week", label: "Theo tuần", icon: "calendar-outline" }
                  ].map(type => (
                    <TouchableOpacity
                      key={type.key}
                      style={styles.typeBtn}
                      onPress={() => setSearchType(type.key)}
                    >
                      <LinearGradient
                        colors={searchType === type.key ? ['#3B82F6', '#1D4ED8'] : ['#F3F4F6', '#E5E7EB']}
                        style={styles.typeBtnGradient}
                      >
                        <Ionicons 
                          name={type.icon} 
                          size={18} 
                          color={searchType === type.key ? "#FFFFFF" : "#6B7280"} 
                        />
                        <Text style={[
                          styles.typeBtnText,
                          searchType === type.key && styles.typeBtnTextActive
                        ]}>
                          {type.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFC']}
                  style={styles.loadingCard}
                >
                  <View style={styles.loadingIconContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                  <Text style={styles.loadingText}>Đang tải hoạt động...</Text>
                  <Text style={styles.loadingSubText}>Vui lòng chờ trong giây lát</Text>
                </LinearGradient>
              </View>
            ) : (
              <ScrollView 
                style={styles.contentScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Calendar or Week View */}
                {searchType === "date" ? (
                  <View style={styles.calendarContainer}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F8FAFC']}
                      style={styles.calendarGradient}
                    >
                      <Calendar
                        current={selectedDate}
                        onDayPress={d => setSelectedDate(d.dateString)}
                        markedDates={markedDates}
                        markingType="multi-dot"
                        theme={{
                          selectedDayBackgroundColor: "#3B82F6",
                          todayTextColor: "#3B82F6",
                          dotColor: "#3B82F6",
                          selectedDotColor: "#FFFFFF",
                          textDayFontWeight: "600",
                          textMonthFontWeight: "700",
                          textDayHeaderFontWeight: "600",
                          monthTextColor: "#1F2937",
                          textDayFontSize: 16,
                          textMonthFontSize: 18,
                          calendarBackground: "transparent",
                          arrowColor: "#3B82F6",
                        }}
                        style={styles.calendar}
                        firstDay={1}
                      />
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.weekViewContainer}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F8FAFC']}
                      style={styles.weekViewGradient}
                    >
                      <View style={styles.weekDatePickerContainer}>
                        <TouchableOpacity 
                          style={styles.datePickerButton} 
                          onPress={() => setDatePickerVisible(true)}
                        >
                          <LinearGradient
                            colors={['#F3F4F6', '#E5E7EB']}
                            style={styles.datePickerGradient}
                          >
                            <MaterialCommunityIcons name="calendar-range" size={20} color="#3B82F6" />
                            <Text style={styles.weekDateText}>
                              {formatDate(weekRange.start)} - {formatDate(weekRange.end)}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#6B7280" />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                      <WeekStrip 
                        weekRange={weekRange} 
                        selectedDate={selectedDate} 
                        onPressDay={setSelectedDate} 
                      />
                    </LinearGradient>
                  </View>
                )}

                {/* Activities Stats */}
                <View style={styles.statsContainer}>
                  <LinearGradient
                    colors={activities.length > 0 ? ['#10B981', '#059669'] : ['#F3F4F6', '#E5E7EB']}
                    style={styles.statsGradient}
                  >
                    <MaterialCommunityIcons 
                      name="format-list-bulleted" 
                      size={20} 
                      color={activities.length > 0 ? "white" : "#6B7280"} 
                    />
                    <Text style={[
                      styles.statsText,
                      { color: activities.length > 0 ? "white" : "#6B7280" }
                    ]}>
                      {activities.length > 0
                        ? `${activities.length} hoạt động`
                        : 'Không có hoạt động'}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Activities List */}
                {activities.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F8FAFC']}
                      style={styles.emptyCard}
                    >
                      <View style={styles.emptyIconContainer}>
                        <LinearGradient
                          colors={['#E5E7EB', '#D1D5DB']}
                          style={styles.emptyIconGradient}
                        >
                          <MaterialCommunityIcons name="calendar-remove" size={48} color="#9CA3AF" />
                        </LinearGradient>
                      </View>
                      <Text style={styles.emptyTitle}>Không có hoạt động</Text>
                      <Text style={styles.emptySubtitle}>
                        {searchType === "date" ? "Chưa có hoạt động nào trong ngày này" : "Chưa có hoạt động nào trong tuần này"}
                      </Text>
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.activitiesContainer}>
                    {searchType === "week" ? (
                      // Hiển thị theo tuần - nhóm theo ngày
                      groupActivitiesByDay(activities, selectedDate).map((dayGroup, dayIndex) => (
                        <View key={dayGroup.date} style={styles.daySection}>
                          <LinearGradient
                            colors={dayGroup.isSelectedDate ? ['#F59E0B', '#D97706'] : ['#3B82F6', '#1D4ED8']}
                            style={[
                              styles.dayHeaderGradient,
                              dayGroup.isSelectedDate && styles.selectedDayHeader
                            ]}
                          >
                            <View style={styles.dayHeaderContent}>
                              <View style={styles.dayHeaderLeft}>
                                <View style={styles.dayTitleRow}>
                                  <Text style={styles.dayTitle}>{dayGroup.weekday}</Text>
                                  {dayGroup.isSelectedDate && (
                                    <View style={styles.selectedDayBadge}>
                                      <MaterialCommunityIcons name="star" size={12} color="white" />
                                      <Text style={styles.selectedDayBadgeText}>Đang chọn</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.dayDate}>{formatDate(dayGroup.date)}</Text>
                              </View>
                              <View style={[
                                styles.dayCount,
                                dayGroup.isSelectedDate && styles.selectedDayCount
                              ]}>
                                <Text style={styles.dayCountText}>{dayGroup.activities.length}</Text>
                              </View>
                            </View>
                          </LinearGradient>
                          
                          {dayGroup.activities.map((item, index) => (
                            <ActivityItem
                              key={item.id?.toString() || index}
                              item={item}
                              index={index}
                              isGrouped={true}
                              onOpenParticipantsModal={openParticipantsModal}
                            />
                          ))}
                        </View>
                      ))
                    ) : (
                      // Hiển thị theo ngày - danh sách thông thường
                      activities.map((item, index) => (
                        <ActivityItem
                          key={item.id?.toString() || index}
                          item={item}
                          index={index}
                          isGrouped={false}
                          onOpenParticipantsModal={openParticipantsModal}
                        />
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </CalendarProvider>

        {/* Date Picker Modal */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleWeekDateChange}
          onCancel={() => setDatePickerVisible(false)}
        />

        {/* Participants Detail Modal */}
        <ParticipantsModal
          visible={participantsModalVisible}
          participants={selectedActivityParticipants}
          onClose={closeParticipantsModal}
          activityName={selectedActivityName}
        />
      </SafeAreaView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
  },
  
  // Header styles
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
  },
  performanceButton: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: 'white', 
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  subtitle: {
    display: 'none', // Ẩn subtitle để tiết kiệm không gian
  },
  
  // Search Type
  searchTypeContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchTypeGradient: {
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeBtnGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  typeBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: width * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingIconContainer: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Content
  contentScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Calendar
  calendarContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  calendarGradient: {
    padding: 16,
  },
  calendar: {
    borderRadius: 12,
  },
  
  // Week view
  weekViewContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  weekViewGradient: {
    // No additional styling needed
  },
  weekDatePickerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  weekDateText: { 
    fontSize: 16, 
    color: '#1F2937', 
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  
  // Week strip
  weekContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  weekGradient: {
    borderRadius: 12,
    padding: 4,
  },
  weekRow: { 
    flexDirection: 'row',
    gap: 4,
  },
  weekDayBox: { 
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  weekDayBoxSelected: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  weekDayGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  weekday: { 
    fontSize: 12, 
    color: '#6B7280',
    fontWeight: '600',
  },
  weekdaySelected: { 
    color: '#FFFFFF',
  },
  daynum: { 
    fontSize: 16, 
    color: '#1F2937', 
    marginTop: 4,
    fontWeight: '700',
  },
  daynumSelected: { 
    color: '#FFFFFF', 
    fontWeight: '800',
  },
  
  // Stats
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: { 
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Activities
  activitiesContainer: {
    paddingHorizontal: 16,
  },
  
  // Day section (cho week view)
  daySection: {
    marginBottom: 24,
  },
  dayHeaderGradient: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  dayHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  dayDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  dayCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dayCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Activity items
  activityItemContainer: { 
    marginBottom: 12,
  },
  activityCard: {
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  activityToday: {
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    borderColor: '#FEF3C7',
    borderWidth: 2,
  },
  activitySelectedDate: {
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    borderColor: '#EBF8FF',
    borderWidth: 2,
  },
  
  // Activity header
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  activityIconContainer: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activityTitleContainer: {
    flex: 1,
  },
  activityName: { 
    fontWeight: '700', 
    fontSize: 17, 
    color: '#1F2937', 
    lineHeight: 22,
    marginBottom: 6,
  },
  activityNameToday: {
    color: '#D97706',
  },
  activityNameSelected: {
    color: '#3B82F6',
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  selectedDateBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  pinnedBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Activity body
  activityBody: {
    gap: 8,
    marginBottom: 12,
  },
  activityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityInfo: { 
    color: '#374151', 
    fontSize: 14, 
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  
  // Participants
  participantsContainer: {
    marginBottom: 12,
  },
  participantsContentGradient: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  participantsIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  multiParticipantsTitle: {
    color: '#92400E',
    fontWeight: '700',
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  participantChip: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  participantGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  participantIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    maxWidth: 80,
  },
  
  // Action buttons
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionGradient: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 6, 
    paddingHorizontal: 10,
    gap: 4,
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  noParticipantsContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  noParticipantsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  noParticipantsText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  modalHeaderContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalStats: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalStatsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  participantTypeSection: {
    marginBottom: 16,
  },
  typeHeader: {
    marginBottom: 12,
  },
  typeHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  typeParticipantsList: {
    gap: 8,
  },
  participantDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantDetailIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantDetailInfo: {
    marginLeft: 12,
  },
  participantDetailName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  participantDetailId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  participantsSummaryContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  participantsSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  participantsIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  participantsTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  participantTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantTypeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  participantsNamesList: {
    flexDirection: 'column',
    gap: 4,
  },
  participantNameText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  remainingParticipantsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  // New styles for selected day header
  selectedDayHeader: {
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    borderColor: '#FEF3C7',
    borderWidth: 2,
  },
  selectedDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  selectedDayBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedDayCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});