import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Layout from "../Common/Layout";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import httpApiClient from "../../services";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MyScheduleScreen = () => {
  const [userShifts, setUserShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigation = useNavigation();

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (user) {
      loadMyShifts();
    }
  }, [currentWeek, user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadMyShifts();
      }
    }, [user])
  );

  const loadUserInfo = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }
    } catch (error) {
      console.error("Lỗi load user info:", error);
    }
  };

  const loadMyShifts = async () => {
    try {
      setLoading(true);
      
      console.log("Loading my shifts...");
      
      // Gọi API mới để lấy ca trực của user hiện tại
      const response = await httpApiClient.get("user-shifts/my-shifts");
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("API Response:", result);
      
      // Xử lý response theo format mới
      let shiftsData = [];
      
      if (result.success && result.statusCode === 200 && Array.isArray(result.data)) {
        shiftsData = result.data;
      } else {
        console.error("Unexpected response format:", result);
        Alert.alert("Lỗi", result.message || "Dữ liệu không hợp lệ");
        setUserShifts([]);
        return;
      }
      
      // Sắp xếp theo ngày mới nhất
      const sortedShifts = shiftsData.sort((a, b) => {
        const dateA = new Date(a.shiftDate);
        const dateB = new Date(b.shiftDate);
        return dateB - dateA;
      });
      
      setUserShifts(sortedShifts);
      console.log("Loaded", sortedShifts.length, "shifts successfully");
      
    } catch (error) {
      console.error("Error loading shifts:", error);
      Alert.alert("Lỗi", `Không thể tải danh sách ca trực: ${error.message}`);
      setUserShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    // Nếu là 00:00:00 thì hiển thị là 24:00
    if (timeString === "00:00:00") return "24:00";
    return timeString.substring(0, 5); // Cắt bỏ giây, chỉ lấy HH:mm
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    const date = new Date(dateTimeString);
    return date.toLocaleString("vi-VN", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getShiftTypeColor = (startTime, endTime) => {
    const start = parseInt(startTime?.split(":")[0] || "0");
    if (start >= 6 && start < 14) return "#10b981"; // Ca sáng - emerald
    if (start >= 14 && start < 22) return "#f59e0b"; // Ca chiều - amber  
    return "#3b82f6"; // Ca đêm - blue
  };

  const getWeekDays = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Bắt đầu từ thứ 2
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getShiftsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return userShifts.filter(shift => {
      const shiftDate = new Date(shift.shiftDate).toISOString().split('T')[0];
      return shiftDate === dateStr;
    });
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    setSelectedDate(today);
  };

  const selectDate = (date) => {
    // Kiểm tra nếu ngày được chọn nằm ngoài tuần hiện tại
    const weekDays = getWeekDays(currentWeek);
    const isDateInCurrentWeek = weekDays.some(
      weekDay => weekDay.toDateString() === date.toDateString()
    );
    
    // Nếu ngày không nằm trong tuần hiện tại, điều hướng đến tuần chứa ngày đó
    if (!isDateInCurrentWeek) {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      setCurrentWeek(startOfWeek);
    }
    
    setSelectedDate(date);
  };

  const getShiftTypeName = (startTime, endTime) => {
    const start = parseInt(startTime?.split(":")[0] || "0");
    if (start >= 6 && start < 14) return "Ca sáng";
    if (start >= 14 && start < 22) return "Ca chiều";
    return "Ca đêm";
  };

  const renderWeekHeader = () => {
    const weekDays = getWeekDays(currentWeek);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    
    return (
      <View style={styles.weekHeaderCompact}>
        <View style={styles.weekNavRow}>
          <TouchableOpacity style={styles.weekNavButtonCompact} onPress={goToPreviousWeek}>
            <Ionicons name="chevron-back" size={18} color="#6366f1" />
          </TouchableOpacity>
          
          <View style={styles.weekInfoCompact}>
            <Text style={styles.weekTitleCompact}>
              {weekStart.getDate()}/{weekStart.getMonth() + 1} - {weekEnd.getDate()}/{weekEnd.getMonth() + 1}
            </Text>
            <Text style={styles.weekSubtitleCompact}>
              Tháng {weekStart.getMonth() + 1}/{weekStart.getFullYear()}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.weekNavButtonCompact} onPress={goToNextWeek}>
            <Ionicons name="chevron-forward" size={18} color="#6366f1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.todayButtonCompact} onPress={goToToday}>
            <Ionicons name="today-outline" size={14} color="#fff" />
            <Text style={styles.todayButtonTextCompact}>Hôm nay</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDayCard = (date, index) => {
    const shifts = getShiftsForDate(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const isSelected = selectedDate?.toDateString() === date.toDateString();
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const shortDayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    return (
      <TouchableOpacity 
        key={index} 
        style={[
          styles.dayCard, 
          isToday && styles.todayCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => selectDate(date)}
      >
        <View style={[
          styles.dayCardHeader, 
          isToday && styles.todayCardHeader,
          isSelected && styles.selectedCardHeader
        ]}>
          <Text style={[
            styles.dayNameText, 
            isToday && styles.todayDayText,
            isSelected && styles.selectedDayText
          ]}>
            {shortDayNames[date.getDay()]}
          </Text>
          <Text style={[
            styles.dayDateText, 
            isToday && styles.todayDateText,
            isSelected && styles.selectedDateText
          ]}>
            {date.getDate()}/{date.getMonth() + 1}
          </Text>
        </View>
        
        <View style={styles.dayShiftsContainer}>
          {shifts.length === 0 ? (
            <View style={styles.noShiftCard}>
              <Text style={styles.noShiftCardText}>Không có ca</Text>
            </View>
          ) : (
            shifts.map((shift) => (
              <View 
                key={shift.id} 
                style={[
                  styles.compactShiftCard, 
                  { borderLeftColor: getShiftTypeColor(shift.startTime, shift.endTime) }
                ]}
              >
                <View style={styles.shiftCardContent}>
                  <Text style={styles.compactShiftCode}>{shift.shiftCode}</Text>
                  <Text style={styles.compactShiftType}>
                    {getShiftTypeName(shift.startTime, shift.endTime)}
                  </Text>
                  <Text style={styles.compactShiftTime}>
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </Text>
                </View>
                <View 
                  style={[
                    styles.shiftTypeIndicator,
                    { backgroundColor: getShiftTypeColor(shift.startTime, shift.endTime) }
                  ]} 
                />
              </View>
            ))
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailShifts = () => {
    const shifts = getShiftsForDate(selectedDate);
    
    if (shifts.length === 0) {
      return (
        <View style={styles.detailEmptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
          <Text style={styles.detailEmptyText}>Không có ca trực</Text>
          <Text style={styles.detailEmptySubtext}>
            Bạn không có ca trực nào trong ngày này
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.detailShiftsList}>
        {shifts.map((shift, index) => (
          <View key={shift.id} style={styles.detailShiftCard}>
            <View style={styles.detailShiftHeader}>
              <View style={styles.detailShiftMainInfo}>
                <Text style={styles.detailShiftCode}>{shift.shiftCode}</Text>
                <View style={[
                  styles.detailShiftTypeBadge,
                  { backgroundColor: getShiftTypeColor(shift.startTime, shift.endTime) }
                ]}>
                  <Text style={styles.detailShiftTypeBadgeText}>
                    {getShiftTypeName(shift.startTime, shift.endTime)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailShiftTimeContainer}>
                <Text style={styles.detailShiftTime}>
                  {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailShiftBody}>
              <View style={styles.detailShiftInfoRow}>
                <Ionicons name="person-outline" size={16} color="#6b7280" />
                <Text style={styles.detailShiftInfoLabel}>Người trực:</Text>
                <Text style={styles.detailShiftInfoValue}>
                  {shift.user?.name || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.detailShiftInfoRow}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.detailShiftInfoLabel}>Vị trí:</Text>
                <Text style={styles.detailShiftInfoValue}>
                  {shift.location || 'Chưa xác định'}
                </Text>
              </View>

              <View style={styles.detailShiftInfoRow}>
                <Ionicons name="log-in-outline" size={16} color="#10b981" />
                <Text style={styles.detailShiftInfoLabel}>Giờ vào ca:</Text>
                <Text style={styles.detailShiftInfoValue}>
                  {formatTime(shift.startTime)}
                </Text>
              </View>

              <View style={styles.detailShiftInfoRow}>
                <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                <Text style={styles.detailShiftInfoLabel}>Giờ ra ca:</Text>
                <Text style={styles.detailShiftInfoValue}>
                  {formatTime(shift.endTime)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderUserSummary = () => {
    // Lấy thông tin user từ shift đầu tiên (vì tất cả shift đều có cùng user)
    const userInfo = userShifts.length > 0 ? userShifts[0].user : null;
    
    if (!userInfo) return null;

    // Tính số ca trực trong tuần hiện tại
    const weekDays = getWeekDays(currentWeek);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    
    const shiftsInCurrentWeek = userShifts.filter(shift => {
      const shiftDate = new Date(shift.shiftDate);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });

    // Tính số ca sắp tới trong tuần hiện tại
    const today = new Date();
    const upcomingShiftsInWeek = shiftsInCurrentWeek.filter(shift => {
      const shiftDate = new Date(shift.shiftDate);
      return shiftDate >= today;
    });

    return (
      <View style={styles.userSummaryCard}>
        <View style={styles.userSummaryHeader}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={24} color="#6366f1" />
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{userInfo.name}</Text>
            <Text style={styles.userRole}>{userInfo.roleName} - {userInfo.teamName}</Text>
            <Text style={styles.userUnit}>{userInfo.unitName}</Text>
          </View>
        </View>
        
        <View style={styles.userStatsContainer}>
          <View style={styles.userStatItem}>
            <Text style={styles.userStatNumber}>{shiftsInCurrentWeek.length}</Text>
            <Text style={styles.userStatLabel}>Ca tuần này</Text>
          </View>
          <View style={styles.userStatDivider} />
          <View style={styles.userStatItem}>
            <Text style={styles.userStatNumber}>{upcomingShiftsInWeek.length}</Text>
            <Text style={styles.userStatLabel}>Sắp tới</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && userShifts.length === 0) {
    return (
      <Layout>
        <View style={styles.container}>
          <Text style={styles.title}>Ca trực của tôi</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Ca trực của tôi</Text>
          <View style={styles.placeholder} />
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}

        {userShifts.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Bạn chưa có ca trực nào</Text>
            <Text style={styles.emptySubtext}>
              Liên hệ với quản lý để được phân công ca trực
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadMyShifts} />
            }
          >
            {renderUserSummary()}
            {renderWeekHeader()}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekScrollContainer}
              style={styles.weekScrollView}
            >
              {getWeekDays(currentWeek).map((date, index) => renderDayCard(date, index))}
            </ScrollView>
            
            {selectedDate && (
              <View style={styles.detailPanel}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>
                    Chi tiết ca trực - {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
                  </Text>
                  <Text style={styles.detailSubtitle}>
                    {['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][selectedDate.getDay()]}
                  </Text>
                </View>
                
                {renderDetailShifts()}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e3e8ef",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f4f8",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a202c",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },
  loadingOverlay: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#f8f9fa",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4a5568",
    marginTop: 20,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  // Week View Styles
  scrollView: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e3e8ef",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  weekHeaderCompact: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekNavButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  weekNavButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  weekTitleContainer: {
    alignItems: "center",
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2d3748",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  weekTitleCompact: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: 0.2,
  },
  weekSubtitleCompact: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 1,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  todayButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    elevation: 1,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  todayButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  todayButtonTextCompact: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
  },
  weekContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    minHeight: 500,
    marginTop: 1,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#e5e7eb",
  },
  todayColumn: {
    backgroundColor: "#f0f9ff",
  },
  dayHeader: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: "#fafbfc",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 70,
  },
  todayHeader: {
    backgroundColor: "#3b82f6",
    borderBottomColor: "#2563eb",
  },
  dayName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
  },
  todayText: {
    color: "#fff",
  },
  shiftsContainer: {
    padding: 12,
    minHeight: 150,
    backgroundColor: "#fdfdfd",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  noShiftContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    backgroundColor: "transparent",
  },
  noShiftText: {
    color: "#d1d5db",
    fontSize: 18,
    fontWeight: "300",
  },
  // Weekly timeline styles
  weekScrollView: {
    flexGrow: 0,
    marginVertical: 16,
  },
  weekScrollContainer: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  dayCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e8ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  todayCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.15,
  },
  dayCardHeader: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  todayCardHeader: {
    backgroundColor: '#007AFF',
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  todayDayText: {
    color: '#fff',
  },
  dayDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212529',
  },
  todayDateText: {
    color: '#fff',
  },
  dayShiftsContainer: {
    padding: 8,
    minHeight: 100,
  },
  noShiftCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  noShiftCardText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  compactShiftCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  shiftCardContent: {
    flex: 1,
  },
  compactShiftCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 2,
  },
  compactShiftType: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 2,
  },
  compactShiftTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  shiftTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  detailPanel: {
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  detailHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  detailEmptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  detailEmptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 12,
    marginBottom: 4,
  },
  detailEmptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  detailShiftsList: {
    padding: 16,
  },
  detailShiftCard: {
    backgroundColor: "#fafbfc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#6366f1",
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  detailShiftHeader: {
    marginBottom: 16,
  },
  detailShiftMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailShiftCode: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  detailShiftTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailShiftTypeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  detailShiftTimeContainer: {
    alignItems: "flex-start",
  },
  detailShiftTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4f46e5",
  },
  detailShiftBody: {
    gap: 12,
  },
  detailShiftInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailShiftInfoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    minWidth: 80,
  },
  detailShiftInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  detailInfoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailInfoNoteText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    flex: 1,
  },
  
  // Selected Day Styles
  selectedCard: {
    backgroundColor: "#e0e7ff",
    borderColor: "#6366f1",
    borderWidth: 2,
  },
  selectedCardHeader: {
    backgroundColor: "#6366f1",
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "700",
  },
  selectedDateText: {
    color: "#fff",
    fontWeight: "700",
  },
  userSummaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4a5568",
  },
  userUnit: {
    fontSize: 12,
    color: "#9ca3af",
  },
  userStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  userStatItem: {
    alignItems: "center",
    flex: 1,
  },
  userStatNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  userStatLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  userStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
  },
});

export default MyScheduleScreen;
