import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import httpApiClient from "../../services";
import SelectModal from "../../components/SelectModal";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";

const PARTICIPANT_TYPES = [
  { label: "User", value: "USER" },
  { label: "Team", value: "TEAM" },
  { label: "Unit", value: "UNIT" },
];

// Hàm định dạng local time thành "YYYY-MM-DDTHH:mm:ss"
function toLocalISOString(date) {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// Hàm hiển thị local time "YYYY-MM-DD HH:mm"
function formatDateTime(d) {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

export default function CreateActivityScreen() {
  const navigation = useNavigation();

  // Activity basic fields
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  // Participants list to send
  const [participants, setParticipants] = useState([]);
  const [participantType, setParticipantType] = useState("USER");

  // User search/multi-select
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Team/Unit selection
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Date picker visibility
  const [isStartPickerVisible, setIsStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setIsEndPickerVisible] = useState(false);

  // Fetch teams or units when participantType changes
  useEffect(() => {
    const fetchList = async (endpoint, setter) => {
      try {
        const res = await httpApiClient.get(endpoint);
        const json = await res.json();
        setter(Array.isArray(json.data) ? json.data : []);
      } catch {
        setter([]);
      }
    };
    if (participantType === "TEAM") fetchList("teams", setTeams);
    if (participantType === "UNIT") fetchList("units", setUnits);
  }, [participantType]);

  // Search users as typing
  useEffect(() => {
    const fetchUsers = async () => {
      if (participantType === "USER" && userSearch.length > 1) {
        try {
          const res = await httpApiClient.get(
            `users/filter?searchText=${encodeURIComponent(userSearch)}`
          );
          const json = await res.json();
          setUserResults(Array.isArray(json.data) ? json.data : []);
        } catch {
          setUserResults([]);
        }
      } else {
        setUserResults([]);
      }
    };
    fetchUsers();
  }, [userSearch, participantType]);

  const createActivity = (payload) =>
    httpApiClient.post("activities", { json: payload });

  // Toggle selection of a user
  const toggleSelectUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  // Add selected participants, avoid duplicates
  const handleAddParticipant = () => {
    const newParts = [];
    if (participantType === "USER") {
      selectedUsers.forEach((u) =>
        newParts.push({ participantType: "USER", participantId: u.id, participantName: u.name })
      );
      setSelectedUsers([]);
      setUserSearch("");
    }
    if (participantType === "TEAM" && selectedTeam) {
      newParts.push({ participantType: "TEAM", participantId: selectedTeam.id, participantName: selectedTeam.teamName });
      setSelectedTeam(null);
    }
    if (participantType === "UNIT" && selectedUnit) {
      newParts.push({ participantType: "UNIT", participantId: selectedUnit.id, participantName: selectedUnit.unitName });
      setSelectedUnit(null);
    }
    const filtered = newParts.filter(
      (np) =>
        !participants.some(
          (p) => p.participantType === np.participantType && p.participantId === np.participantId
        )
    );
    if (filtered.length < newParts.length) {
      Alert.alert("Thông báo", "Một số mục đã tồn tại và bị bỏ qua.");
    }
    if (filtered.length) {
      setParticipants((prev) => [...prev, ...filtered]);
    }
  };

  // Remove participant by index
  const handleRemoveParticipant = (idx) => {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit form with endTime > startTime validation
  const handleSubmit = async () => {
    if (!name.trim() || !location.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập tên và địa điểm!");
    }
    if (endTime <= startTime) {
      return Alert.alert("Lỗi", "Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
    }
    const payload = {
      name,
      location,
      // Gửi local time thay vì UTC để không bị trừ giờ
      startTime: toLocalISOString(startTime),
      endTime: toLocalISOString(endTime),
      notes,
      participants,
    };
    try {
      const res = await createActivity(payload);
      if (res.ok) {
        const { data } = await res.json();
        Alert.alert("Thành công", `Activity ID = ${data.id}`, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert("Lỗi", err.message || "Tạo thất bại");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể kết nối server");
    }
  };

  return (
    <Layout>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {/* Header với gradient */}
          <LinearGradient
            colors={['rgba(25,118,210,0.95)', 'rgba(13,71,161,0.98)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContainer}>
              <View style={styles.iconHeader}>
                <MaterialCommunityIcons name="calendar-plus" size={28} color="white" />
              </View>
              <Text style={styles.title}>Tạo Hoạt Động Mới</Text>
              <Text style={styles.subtitle}>Tạo và quản lý các hoạt động sân bay</Text>
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            {/* Thông tin cơ bản */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#007AFF" />
                {" "}Thông tin cơ bản
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên hoạt động *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="text-outline" size={20} color="#007AFF" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nhập tên hoạt động" 
                    value={name} 
                    onChangeText={setName}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Địa điểm *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color="#007AFF" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nhập địa điểm" 
                    value={location} 
                    onChangeText={setLocation}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ghi chú</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Ionicons name="document-text-outline" size={20} color="#007AFF" style={[styles.inputIcon, styles.textAreaIcon]} />
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Nhập ghi chú (tùy chọn)" 
                    value={notes} 
                    onChangeText={setNotes} 
                    multiline
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Thời gian */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="time-outline" size={18} color="#007AFF" />
                {" "}Thời gian
              </Text>
              
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.label}>Bắt đầu *</Text>
                  <TouchableOpacity style={styles.timePicker} onPress={() => setIsStartPickerVisible(true)}>
                    <Ionicons name="calendar" size={20} color="#007AFF" style={styles.timeIcon} />
                    <Text style={styles.timeText}>{formatDateTime(startTime)}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.timeItem}>
                  <Text style={styles.label}>Kết thúc *</Text>
                  <TouchableOpacity style={styles.timePicker} onPress={() => setIsEndPickerVisible(true)}>
                    <Ionicons name="calendar" size={20} color="#007AFF" style={styles.timeIcon} />
                    <Text style={styles.timeText}>{formatDateTime(endTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <DateTimePickerModal 
              isVisible={isStartPickerVisible} 
              mode="datetime" 
              is24Hour
              onConfirm={(d) => { setStartTime(d); setIsStartPickerVisible(false); }}
              onCancel={() => setIsStartPickerVisible(false)} 
            />

            <DateTimePickerModal 
              isVisible={isEndPickerVisible} 
              mode="datetime" 
              is24Hour
              onConfirm={(d) => { 
                if (d > startTime) setEndTime(d); 
                else Alert.alert("Lỗi","Thời gian kết thúc phải lớn hơn thời gian bắt đầu!"); 
                setIsEndPickerVisible(false); 
              }}
              onCancel={() => setIsEndPickerVisible(false)} 
            />

            {/* Người tham gia */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="account-group" size={18} color="#007AFF" />
                {" "}Người tham gia
              </Text>

              <Text style={styles.label}>Loại thành phần</Text>
              <View style={styles.participantTypeRow}>
                {PARTICIPANT_TYPES.map((opt) => (
                  <TouchableOpacity 
                    key={opt.value} 
                    style={[styles.typeBtn, participantType === opt.value && styles.typeBtnActive]} 
                    onPress={() => setParticipantType(opt.value)}
                  >
                    <Text style={[styles.typeBtnText, participantType === opt.value && styles.typeBtnActiveText]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {participantType === "USER" && (
                <View style={styles.userSection}>
                  <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                      <Ionicons name="search-outline" size={20} color="#007AFF" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Tìm kiếm người dùng..." 
                        value={userSearch} 
                        onChangeText={setUserSearch}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                  
                  {/* Danh sách user đã chọn */}
                  {selectedUsers.length > 0 && (
                    <View style={styles.selectedUsersContainer}>
                      <Text style={styles.selectedUsersTitle}>
                        <MaterialCommunityIcons name="account-check" size={16} color="#10B981" />
                        {" "}Đã chọn ({selectedUsers.length})
                      </Text>
                      {selectedUsers.map(u => (
                        <View key={u.id} style={styles.selectedUserCard}>
                          <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                              {u.name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                          </View>
                          <Text style={styles.selectedUserName} numberOfLines={1}>
                            {u.name}
                          </Text>
                          <TouchableOpacity 
                            onPress={() => toggleSelectUser(u)} 
                            style={styles.removeUserBtn}
                          >
                            <Ionicons name="close-circle" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {participantType === "TEAM" && (
                <View style={styles.inputGroup}>
                  <SelectModal
                    label="Chọn nhóm"
                    data={teams.map(t => ({ label: t.teamName, value: t.id }))}
                    value={selectedTeam?.id || ""}
                    onChange={id => setSelectedTeam(teams.find(t => t.id === id) || null)}
                    placeholder="Chọn nhóm"
                    title="Chọn nhóm"
                  />
                </View>
              )}

              {participantType === "UNIT" && (
                <View style={styles.inputGroup}>
                  <SelectModal
                    label="Chọn đơn vị"
                    data={units.map(u => ({ label: u.unitName, value: u.id }))}
                    value={selectedUnit?.id || ""}
                    onChange={id => setSelectedUnit(units.find(u => u.id === id) || null)}
                    placeholder="Chọn đơn vị"
                    title="Chọn đơn vị"
                  />
                </View>
              )}

              <TouchableOpacity style={styles.addParticipantBtn} onPress={handleAddParticipant}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.addParticipantGradient}
                >
                  <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                  <Text style={styles.addParticipantText}>Thêm người tham gia</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Danh sách kết quả tìm kiếm user */}
              {participantType === "USER" && userResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <Text style={styles.searchResultsTitle}>Kết quả tìm kiếm</Text>
                  <FlatList 
                    data={userResults} 
                    keyExtractor={i => i.id.toString()} 
                    scrollEnabled={false} 
                    nestedScrollEnabled={false}
                    style={styles.searchResultsList}
                    renderItem={({ item }) => {
                      const isSelected = selectedUsers.some(u => u.id === item.id);
                      return (
                        <TouchableOpacity 
                          style={[styles.searchResultItem, isSelected && styles.searchResultItemSelected]} 
                          onPress={() => toggleSelectUser(item)}
                        >
                          <View style={styles.searchResultContent}>
                            <View style={[styles.userAvatar, styles.searchUserAvatar]}>
                              <Text style={styles.userAvatarText}>
                                {item.name?.charAt(0).toUpperCase() || "U"}
                              </Text>
                            </View>
                            <Text style={styles.searchResultText}>{item.name}</Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              {/* Danh sách người tham gia đã thêm */}
              {participants.length > 0 && (
                <View style={styles.participantsContainer}>
                  <Text style={styles.participantsTitle}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#007AFF" />
                    {" "}Danh sách tham gia ({participants.length})
                  </Text>
                  {participants.map((p, idx) => (
                    <View style={styles.participantCard} key={idx}>
                      <View style={styles.participantInfo}>
                        <MaterialCommunityIcons 
                          name={p.participantType === "USER" ? "account" : p.participantType === "TEAM" ? "account-group" : "domain"} 
                          size={20} 
                          color="#007AFF" 
                        />
                        <Text style={styles.participantName}>{p.participantName}</Text>
                        <View style={styles.participantTypeBadge}>
                          <Text style={styles.participantTypeText}>{p.participantType}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleRemoveParticipant(idx)} 
                        style={styles.removeParticipantBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Nút tạo hoạt động */}
            <View style={styles.submitContainer}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <LinearGradient
                  colors={['#007AFF', '#0056CC']}
                  style={styles.submitGradient}
                >
                  <MaterialCommunityIcons name="check-circle" size={24} color="white" />
                  <Text style={styles.submitText}>Tạo Hoạt Động</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Header styles
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  headerContainer: {
    alignItems: "center",
  },
  iconHeader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    maxWidth: '80%',
  },
  
  // Form container
  formContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  
  // Section styles
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  
  // Input styles
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    paddingVertical: 0,
  },
  
  // Text area
  textAreaContainer: {
    alignItems: "flex-start",
    minHeight: 120,
    paddingVertical: 16,
  },
  textAreaIcon: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  
  // Time picker
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeItem: {
    flex: 1,
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  timeIcon: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  
  // Participant type selection
  participantTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  typeBtnActive: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F9FF",
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeBtnActiveText: {
    color: "#007AFF",
  },
  
  // User section
  userSection: {
    marginTop: 8,
  },
  
  // Selected users
  selectedUsersContainer: {
    marginTop: 16,
  },
  selectedUsersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedUserCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  selectedUserName: {
    flex: 1,
    fontWeight: "600",
    fontSize: 15,
    color: "#374151",
  },
  removeUserBtn: {
    marginLeft: 8,
  },
  
  // Add participant button
  addParticipantBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addParticipantGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addParticipantText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  
  // Search results
  searchResultsContainer: {
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchResultItemSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  searchResultContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  searchUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  
  // Participants list
  participantsContainer: {
    marginTop: 20,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 12,
  },
  participantTypeBadge: {
    backgroundColor: "#EBF8FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  participantTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
  },
  removeParticipantBtn: {
    padding: 8,
  },
  
  // Submit button
  submitContainer: {
    marginTop: 20,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  submitText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    marginLeft: 12,
    letterSpacing: 0.5,
  },
});