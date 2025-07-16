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
  SafeAreaView,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Layout from "../Common/Layout";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import httpApiClient from "../../services";
import SelectModal from "../../components/SelectModal";

const PARTICIPANT_TYPES = [
  { label: "User", value: "USER" },
  { label: "Team", value: "TEAM" },
  { label: "Unit", value: "UNIT" },
];

// Hàm format local datetime string (không bị lệch múi giờ)
const pad = n => n < 10 ? '0' + n : n;
const toLocalString = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

export default function EditActivityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { activity } = route.params || {};

  // Activity basic fields
  const [name, setName] = useState(activity?.name || "");
  const [location, setLocation] = useState(activity?.location || "");
  const [notes, setNotes] = useState(activity?.notes || "");
  const [startTime, setStartTime] = useState(activity?.startTime ? new Date(activity.startTime) : new Date());
  const [endTime, setEndTime] = useState(activity?.endTime ? new Date(activity.endTime) : new Date());

  // Participants list to send
  const [participants, setParticipants] = useState(activity?.participants || []);
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

  // Hiển thị ngày giờ dạng dd/MM/yyyy HH:mm
  const formatDateTime = (d) => {
    if (!d) return "";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const updateActivity = (payload) =>
    httpApiClient.put(`activities/${activity.id}`, { json: payload });

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
      startTime: toLocalString(startTime),
      endTime: toLocalString(endTime),
      notes,
      participants,
    };
    try {
      const res = await updateActivity(payload);
      if (res.ok) {
        const { data } = await res.json();
        Alert.alert("Thành công", `Đã cập nhật activity`, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert("Lỗi", err.message || "Cập nhật thất bại");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể kết nối server");
    }
  };

  return (
    <Layout>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView 
            contentContainerStyle={styles.container} 
            keyboardShouldPersistTaps="handled" 
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Chỉnh sửa hoạt động</Text>
              <Text style={styles.subtitle}>Cập nhật thông tin hoạt động của bạn</Text>
            </View>

            {/* Main Form */}
            <View style={styles.formContainer}>
              {/* Basic Information Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tên hoạt động</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nhập tên hoạt động" 
                    value={name} 
                    onChangeText={setName}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Địa điểm</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nhập địa điểm" 
                    value={location} 
                    onChangeText={setLocation}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ghi chú</Text>
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

              {/* Time Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thời gian</Text>
                
                <View style={styles.timeRow}>
                  <View style={styles.timeItem}>
                    <Text style={styles.label}>Bắt đầu</Text>
                    <TouchableOpacity style={styles.timePicker} onPress={() => setIsStartPickerVisible(true)}>
                      <Text style={styles.timeText}>{formatDateTime(startTime)}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.timeItem}>
                    <Text style={styles.label}>Kết thúc</Text>
                    <TouchableOpacity style={styles.timePicker} onPress={() => setIsEndPickerVisible(true)}>
                      <Text style={styles.timeText}>{formatDateTime(endTime)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Participants Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Người tham gia</Text>
                
                <View style={styles.participantTypeContainer}>
                  <Text style={styles.label}>Loại người tham gia</Text>
                  <View style={styles.typeButtonRow}>
                    {PARTICIPANT_TYPES.map((opt) => (
                      <TouchableOpacity 
                        key={opt.value} 
                        style={[styles.typeBtn, participantType === opt.value && styles.typeBtnActive]} 
                        onPress={() => setParticipantType(opt.value)}
                      >
                        <Text style={[
                          styles.typeBtnText,
                          participantType === opt.value && styles.typeBtnTextActive
                        ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {participantType === "USER" && (
                  <View style={styles.inputGroup}>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Tìm kiếm người dùng..." 
                      value={userSearch} 
                      onChangeText={setUserSearch}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}

                {participantType === "TEAM" && (
                  <View style={styles.inputGroup}>
                    <SelectModal
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
                      data={units.map(u => ({ label: u.unitName, value: u.id }))}
                      value={selectedUnit?.id || ""}
                      onChange={id => setSelectedUnit(units.find(u => u.id === id) || null)}
                      placeholder="Chọn đơn vị"
                      title="Chọn đơn vị"
                    />
                  </View>
                )}

                <TouchableOpacity style={styles.addButton} onPress={handleAddParticipant}>
                  <Text style={styles.addButtonText}>+ Thêm người tham gia</Text>
                </TouchableOpacity>

                {participantType === "USER" && userResults.length > 0 && (
                  <View style={styles.userSearchResults}>
                    <FlatList 
                      data={userResults} 
                      keyExtractor={i => i.id.toString()} 
                      scrollEnabled={false} 
                      nestedScrollEnabled={false}
                      style={{ maxHeight: 200 }}
                      renderItem={({ item }) => {
                        const sel = selectedUsers.some(u => u.id === item.id);
                        return (
                          <TouchableOpacity 
                            style={[styles.resultItem, sel && styles.resultItemSelected]} 
                            onPress={() => toggleSelectUser(item)}
                          >
                            <View style={styles.resultRow}>
                              <Text style={[styles.resultText, sel && styles.resultTextSelected]}>
                                {item.name}
                              </Text>
                              {sel && <Text style={styles.checkMark}>✓</Text>}
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}

                {/* Participants List */}
                <View style={styles.participantsList}>
                  <Text style={styles.participantsTitle}>Danh sách người tham gia</Text>
                  {participants.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Chưa có người tham gia nào</Text>
                    </View>
                  ) : (
                    participants.map((p, idx) => (
                      <View key={idx} style={styles.participantItem}>
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>{p.participantName}</Text>
                          <Text style={styles.participantType}>{
                            p.participantType === 'USER' ? 'Người dùng' : 
                            p.participantType === 'TEAM' ? 'Nhóm' : 'Đơn vị'
                          }</Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveParticipant(idx)} 
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>

              {/* Submit Button */}
              <View style={styles.submitContainer}>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>Cập nhật hoạt động</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Date Time Pickers */}
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
          if (d > startTime) {
            setEndTime(d); 
          } else {
            Alert.alert("Lỗi", "Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
          }
          setIsEndPickerVisible(false); 
        }}
        onCancel={() => setIsEndPickerVisible(false)} 
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeItem: {
    flex: 1,
  },
  timePicker: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  timeText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  participantTypeContainer: {
    marginBottom: 16,
  },
  typeButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  typeBtnActive: {
    backgroundColor: '#3B82F6',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userSearchResults: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultItemSelected: {
    backgroundColor: '#EBF8FF',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  resultTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  checkMark: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
  },
  participantsList: {
    marginTop: 16,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  participantType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});