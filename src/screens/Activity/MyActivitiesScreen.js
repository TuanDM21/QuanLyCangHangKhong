import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  Platform, 
  SafeAreaView,
  Alert,
  Dimensions,
  Modal,
  ScrollView
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import httpApiClient from "../../services";
import Layout from "../Common/Layout";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import WeekStripComponent from "./WeekStripComponent";
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
      screen: 'MyActivitiesScreen',
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
      screen: 'MyActivitiesScreen',
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
    
    console.log(`📈 [API SUMMARY] MyActivitiesScreen Session`, {
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

// Utility functions
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

function formatVNDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(dt) {
  if (!dt) return "";
  const date = getVNDateString(dt);
  const [y, m, d] = date.split("-");
  const time = typeof dt === "string" && dt.length >= 16 ? dt.slice(11, 16) : "";
  return `${d}/${m}/${y} ${time}`;
}

// Participant Component với thiết kế mới
const ParticipantChip = React.memo(({ participant, index, screenName }) => {
  const displayName = participant?.participantName || `Participant ${index + 1}`;
  
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

  return (
    <View style={[styles.participantChip, { borderColor: getParticipantColor(participant?.participantType) }]}>
      <View style={[styles.participantIcon, { backgroundColor: getParticipantColor(participant?.participantType) }]}>
        <Ionicons 
          name={getParticipantIcon(participant?.participantType)} 
          size={12} 
          color="white" 
        />
      </View>
      <Text style={styles.participantName} numberOfLines={1}>
        {displayName}
      </Text>
    </View>
  );
});

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
            size={16} 
            color={participants.length > 1 ? "#D97706" : "#3B82F6"} 
          />
        </View>
        <Text style={[
          styles.participantsSummaryTitle,
          participants.length > 1 && styles.multiParticipantsTitle
        ]}>
          {participants.length} người tham gia
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#6B7280" />
      </View>

      {/* Hiển thị theo loại */}
      <View style={styles.participantsTypesList}>
        {Object.entries(typeCounts).map(([type, count]) => (
          <View key={type} style={[styles.participantTypeChip, { borderColor: getTypeColor(type) }]}>
            <View style={[styles.participantTypeIcon, { backgroundColor: getTypeColor(type) }]}>
              <Ionicons name={getTypeIcon(type)} size={12} color="white" />
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

// Activity Item Component với thiết kế card hiện đại
const ActivityItem = React.memo(({ item, todayStr, selectedDate, index, onOpenParticipantsModal }) => {
  const itemDate = getVNDateString(item.startTime);
  const isToday = itemDate === todayStr;
  const isSelectedDate = itemDate === selectedDate;
  const startTime = item.startTime ? formatDateTime(item.startTime) : "";
  
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
        {/* Activity Header với icon gradient */}
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
              name="calendar-clock" 
              size={24} 
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
                <MaterialCommunityIcons name="star" size={12} color="white" />
                <Text style={styles.todayBadgeText}>Hôm nay</Text>
              </LinearGradient>
            )}
            {isSelectedDate && !isToday && (
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.selectedDateBadge}
              >
                <MaterialCommunityIcons name="calendar-check" size={12} color="white" />
                <Text style={styles.selectedDateBadgeText}>Ngày được chọn</Text>
              </LinearGradient>
            )}
          </View>
        </View>
        
        {/* Activity Details với icons đẹp */}
        <View style={styles.activityBody}>
          <View style={styles.activityInfoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="location" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.activityInfo} numberOfLines={1}>{item.location}</Text>
          </View>
          
          <View style={styles.activityInfoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="time" size={16} color="#8B5CF6" />
            </View>
            <Text style={styles.activityInfo}>{startTime}</Text>
          </View>
          
          {!!item.notes && (
            <View style={styles.activityInfoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="document-text" size={16} color="#10B981" />
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
              <MaterialCommunityIcons name="account-off" size={20} color="#DC2626" />
              <Text style={styles.noParticipantsText}>
                Chưa có người tham gia
              </Text>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </View>
  );
});

const MyActivitiesScreen = () => {
  const todayStr = useMemo(() => getVNDateString(new Date()), []);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekRange, setWeekRange] = useState(() => getWeekRange(todayStr));
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal state
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [selectedActivityParticipants, setSelectedActivityParticipants] = useState([]);
  const [selectedActivityName, setSelectedActivityName] = useState('');
  
  // API Performance tracking
  const [apiCallsHistory, setApiCallsHistory] = useState([]);

  // Enhanced API fetch
  const fetchMyActivities = useCallback(async (isRefreshing = false) => {
    // Start API timing
    const timer = APIPerformanceTracker.startTimer("activities/my", {
      isRefreshing,
      requestType: "GET",
      endpoint: "activities/my",
      description: "Fetch user's activities for MyActivitiesScreen"
    });
    
    let response = null;
    
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout after 15 seconds")), 15000)
      );
      
      const fetchPromise = httpApiClient.get("activities/my");
      response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      let activitiesData = [];
      
      if (Array.isArray(rawData)) {
        activitiesData = rawData;
      } else if (rawData && typeof rawData === 'object') {
        if (rawData.success && Array.isArray(rawData.data)) {
          activitiesData = rawData.data;
        } else if (Array.isArray(rawData.data)) {
          activitiesData = rawData.data;
        } else {
          throw new Error("Invalid response format: expected array or {success: true, data: array}");
        }
      } else {
        throw new Error("Invalid response: not an object or array");
      }
      
      setActivities(activitiesData);
      
      // Log success timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
      // Log additional data info
      console.log(`📋 [API DATA] activities/my`, {
        totalActivities: activitiesData.length,
        hasParticipants: activitiesData.filter(act => act.participants && act.participants.length > 0).length,
        avgParticipantsPerActivity: activitiesData.length > 0 ? 
          (activitiesData.reduce((sum, act) => sum + (act.participants?.length || 0), 0) / activitiesData.length).toFixed(1) : 0,
        dataStructure: activitiesData.length > 0 ? Object.keys(activitiesData[0]) : [],
        isRefreshing
      });
      
    } catch (err) {
      console.error("❌ API Error:", err);
      setActivities([]);
      setError(err.message || "Unknown error occurred");
      
      // Log error timing
      const apiLog = APIPerformanceTracker.endTimer(timer, response, err);
      setApiCallsHistory(prev => [...prev, apiLog]);
      
      // Add to global performance helper
      APIPerformanceHelper.addPerformanceData(apiLog);
      
      Alert.alert(
        "Lỗi tải dữ liệu",
        `Không thể tải hoạt động: ${err.message}`,
        [{ text: "Thử lại", onPress: () => fetchMyActivities(isRefreshing) }, { text: "Đóng" }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchMyActivities();
  }, [fetchMyActivities]);

  // Log API performance summary when component unmounts
  useEffect(() => {
    return () => {
      if (apiCallsHistory.length > 0) {
        APIPerformanceTracker.logSummary(apiCallsHistory);
      }
    };
  }, [apiCallsHistory]);

  // Update week range when selected date changes
  useEffect(() => {
    setWeekRange(getWeekRange(selectedDate));
  }, [selectedDate]);

  // Filter and sort activities for the current week with selected date priority
  const weekActivities = useMemo(() => {
    const filtered = activities.filter(act => {
      const actDate = getVNDateString(act.startTime);
      const isInRange = actDate >= weekRange.start && actDate <= weekRange.end;
      return isInRange;
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
    
    return sorted;
  }, [activities, weekRange, selectedDate]);

  // Event handlers
  const handleDatePicked = useCallback((date) => {
    const iso = getVNDateString(date);
    setSelectedDate(iso);
    setDatePickerVisible(false);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyActivities(true);
  }, [fetchMyActivities]);

  const onPressDay = useCallback((day) => {
    setSelectedDate(day);
  }, []);

  const showDatePicker = useCallback(() => {
    setDatePickerVisible(true);
  }, []);

  const hideDatePicker = useCallback(() => {
    setDatePickerVisible(false);
  }, []);

  // Modal handlers
  const openParticipantsModal = useCallback((participants, activityName) => {
    setSelectedActivityParticipants(participants);
    setSelectedActivityName(activityName);
    setParticipantsModalVisible(true);
  }, []);

  const closeParticipantsModal = useCallback(() => {
    setParticipantsModalVisible(false);
    setSelectedActivityParticipants([]);
    setSelectedActivityName('');
  }, []);

  // Render functions
  const renderItem = useCallback(({ item, index }) => (
    <ActivityItem 
      item={item} 
      todayStr={todayStr} 
      selectedDate={selectedDate} 
      index={index} 
      onOpenParticipantsModal={openParticipantsModal}
    />
  ), [todayStr, selectedDate, openParticipantsModal]);

  const ListEmptyComponent = useMemo(() => (
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
        {error ? (
          <>
            <Text style={styles.emptyTitle}>Có lỗi xảy ra</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchMyActivities()}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.retryGradient}
              >
                <MaterialCommunityIcons name="refresh" size={20} color="white" />
                <Text style={styles.retryText}>Thử lại</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.emptyTitle}>Không có hoạt động</Text>
            <Text style={styles.emptySubtitle}>Chưa có hoạt động nào trong tuần này</Text>
            <Text style={styles.emptyHint}>Kéo xuống để làm mới danh sách</Text>
          </>
        )}
      </LinearGradient>
    </View>
  ), [error, todayStr, selectedDate, fetchMyActivities]);

  if (loading) {
    return (
      <Layout>
        <SafeAreaView style={styles.safeArea}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.loadingGradient}
          >
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
          </LinearGradient>
        </SafeAreaView>
      </Layout>
    );
  }

  return (
    <Layout>
      <SafeAreaView style={styles.safeArea}>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDatePicked}
          onCancel={hideDatePicker}
        />
        
        <ParticipantsModal
          visible={participantsModalVisible}
          participants={selectedActivityParticipants}
          activityName={selectedActivityName}
          onClose={closeParticipantsModal}
        />
        
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
                <MaterialCommunityIcons name="calendar-heart" size={24} color="white" />
              </View>
              <Text style={styles.title}>Lịch của tôi</Text>
            </View>
          </LinearGradient>

          {/* Week Date Picker với thiết kế mới */}
          <View style={styles.weekDateContainer}>
            <TouchableOpacity style={styles.datePickerButton} onPress={showDatePicker}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.datePickerGradient}
              >
                <MaterialCommunityIcons name="calendar-range" size={20} color="#3B82F6" />
                <Text style={styles.weekDateText}>
                  {formatVNDate(weekRange.start)} - {formatVNDate(weekRange.end)}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Week Strip với container mới */}
          <View style={styles.weekStripContainer}>
            <WeekStripComponent 
              weekRange={weekRange} 
              selectedDate={selectedDate} 
              onPressDay={onPressDay} 
            />
          </View>
          
          {/* Activities Count với gradient */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={weekActivities.length > 0 ? ['#10B981', '#059669'] : ['#F3F4F6', '#E5E7EB']}
              style={styles.statsGradient}
            >
              <MaterialCommunityIcons 
                name="format-list-bulleted" 
                size={20} 
                color={weekActivities.length > 0 ? "white" : "#6B7280"} 
              />
              <Text style={[
                styles.statsText,
                { color: weekActivities.length > 0 ? "white" : "#6B7280" }
              ]}>
                {weekActivities.length > 0 ? `${weekActivities.length} hoạt động` : 'Không có hoạt động'}
              </Text>
            </LinearGradient>
          </View>
          
          {/* Activities List */}
          <FlatList
            data={weekActivities}
            keyExtractor={(item, index) => `activity-${item.id}-${index}`}
            renderItem={renderItem}
            ListEmptyComponent={ListEmptyComponent}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
                title="Đang làm mới..."
                titleColor="#3B82F6"
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={15}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        </View>
      </SafeAreaView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
  },
  
  // Header styles với gradient
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
  
  // Week date picker
  weekDateContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  datePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  weekStripContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  // Stats
  statsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
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
  
  // Loading
  loadingGradient: {
    flex: 1,
  },
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
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    minWidth: width * 0.8,
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
  
  // Activity items
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
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
    fontWeight: '800', 
    fontSize: 18, 
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
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Activity body
  activityBody: {
    gap: 8,
    marginBottom: 12,
  },
  activityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityInfo: { 
    color: '#374151', 
    fontSize: 15, 
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // Participants
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  participantIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    maxWidth: 100,
  },
  
  // No participants
  noParticipantsContainer: {
    marginTop: 8,
  },
  noParticipantsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noParticipantsText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Error & retry
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  // New styles for Participants Summary
  participantsSummaryContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  participantsSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  participantsIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  multiParticipantsTitle: {
    color: '#92400E',
  },
  participantsTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  participantTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  participantTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantTypeText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  participantsNamesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalCloseButton: {
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
  modalHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  typeParticipantsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  participantDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  participantDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantDetailInfo: {
    flex: 1,
  },
  participantDetailName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  participantDetailId: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default memo(MyActivitiesScreen);


