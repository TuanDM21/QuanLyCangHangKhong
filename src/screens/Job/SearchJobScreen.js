import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Layout from '../Common/Layout';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';

const SearchJobScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState({
    jobType: 'all',
    area: 'all',
    priority: 'all',
    status: 'all',
    assigneeType: 'all',
    assigneeValue: '',
    dateFrom: null,
    dateTo: null,
  });

  const [datePickerConfig, setDatePickerConfig] = useState({
    isVisible: false,
    mode: 'date',
    field: '',
  });

  const [modalConfig, setModalConfig] = useState({
    isVisible: false,
    title: '',
    field: '',
    options: [],
  });

  // Mock data for teams, groups, and individuals
  const teams = [
    { label: 'Tất cả đội', value: 'all' },
    { label: 'Đội Bảo trì Hạ tầng', value: 'team_infrastructure' },
    { label: 'Đội An ninh Sân bay', value: 'team_security' },
    { label: 'Đội Vệ sinh Môi trường', value: 'team_cleaning' },
    { label: 'Đội Kỹ thuật Máy bay', value: 'team_technical' },
    { label: 'Đội Hỗ trợ Khách hàng', value: 'team_customer' },
    { label: 'Đội Logistics', value: 'team_logistics' },
  ];

  const groups = [
    { label: 'Tất cả tổ', value: 'all' },
    { label: 'Tổ Bảo trì Terminal A', value: 'group_maintenance_ta' },
    { label: 'Tổ Bảo trì Terminal B', value: 'group_maintenance_tb' },
    { label: 'Tổ An ninh Gate', value: 'group_security_gate' },
    { label: 'Tổ An ninh Cargo', value: 'group_security_cargo' },
    { label: 'Tổ Vệ sinh Khu vực 1', value: 'group_cleaning_1' },
    { label: 'Tổ Vệ sinh Khu vực 2', value: 'group_cleaning_2' },
    { label: 'Tổ Kỹ thuật Đường băng', value: 'group_tech_runway' },
    { label: 'Tổ Kỹ thuật Thiết bị', value: 'group_tech_equipment' },
    { label: 'Tổ Hành lý', value: 'group_baggage' },
    { label: 'Tổ Phục vụ mặt đất', value: 'group_ground_service' },
  ];

  const individuals = [
    { label: 'Tất cả cá nhân', value: 'all' },
    { label: 'Nguyễn Văn A', value: 'nguyen_van_a' },
    { label: 'Trần Thị B', value: 'tran_thi_b' },
    { label: 'Lê Văn C', value: 'le_van_c' },
    { label: 'Phạm Thị D', value: 'pham_thi_d' },
    { label: 'Hoàng Văn E', value: 'hoang_van_e' },
    { label: 'Ngô Thị F', value: 'ngo_thi_f' },
    { label: 'Đặng Văn G', value: 'dang_van_g' },
    { label: 'Vũ Thị H', value: 'vu_thi_h' },
    { label: 'Bùi Văn I', value: 'bui_van_i' },
    { label: 'Mai Thị K', value: 'mai_thi_k' },
    { label: 'Lý Văn L', value: 'ly_van_l' },
    { label: 'Tôn Thị M', value: 'ton_thi_m' },
    { label: 'Đinh Văn N', value: 'dinh_van_n' },
    { label: 'Dương Thị O', value: 'duong_thi_o' },
    { label: 'Trịnh Văn P', value: 'trinh_van_p' },
  ];

  const assigneeTypes = [
    { label: 'Tất cả loại', value: 'all' },
    { label: 'Đội', value: 'team' },
    { label: 'Tổ', value: 'group' },
    { label: 'Cá nhân', value: 'individual' },
  ];

  // Mock data
  const [allJobs, setAllJobs] = useState([
    {
      id: '1',
      title: 'Kiểm tra hệ thống âm thanh Terminal A',
      description: 'Kiểm tra và bảo trì hệ thống âm thanh tại khu vực Terminal A',
      type: 'technical',
      area: 'Terminal A',
      priority: 'high',
      status: 'in_progress',
      assigneeType: 'individual',
      assignee: 'Nguyễn Văn A',
      deadline: '2024-01-20T14:00:00Z',
      createdAt: '2024-01-15T08:00:00Z',
    },
    {
      id: '2',
      title: 'Vệ sinh khu vực chờ Gate 5',
      description: 'Vệ sinh tổng thể khu vực chờ tại Gate 5',
      type: 'cleaning',
      area: 'Gate 5',
      priority: 'normal',
      status: 'todo',
      assigneeType: 'group',
      assignee: 'Tổ Vệ sinh Khu vực 1',
      deadline: '2024-01-19T16:00:00Z',
      createdAt: '2024-01-15T09:30:00Z',
    },
    {
      id: '3',
      title: 'Bảo trì thang máy Terminal B',
      description: 'Kiểm tra và bảo trì định kỳ thang máy tại Terminal B',
      type: 'maintenance',
      area: 'Terminal B',
      priority: 'urgent',
      status: 'review',
      assigneeType: 'team',
      assignee: 'Đội Bảo trì Hạ tầng',
      deadline: '2024-01-18T12:00:00Z',
      createdAt: '2024-01-14T07:00:00Z',
    },
    {
      id: '4',
      title: 'Cập nhật thông tin chuyến bay',
      description: 'Cập nhật thông tin chuyến bay trên bảng điện tử',
      type: 'customer_service',
      area: 'Terminal A',
      priority: 'normal',
      status: 'completed',
      assigneeType: 'individual',
      assignee: 'Phạm Thị D',
      deadline: '2024-01-17T10:00:00Z',
      createdAt: '2024-01-16T08:00:00Z',
    },
    {
      id: '5',
      title: 'Kiểm tra an ninh khu vực Cargo',
      description: 'Tuần tra và kiểm tra an ninh tại khu vực hàng hóa',
      type: 'security',
      area: 'Cargo',
      priority: 'high',
      status: 'in_progress',
      assigneeType: 'team',
      assignee: 'Đội An ninh Sân bay',
      deadline: '2024-01-21T18:00:00Z',
      createdAt: '2024-01-15T14:00:00Z',
    },
    {
      id: '6',
      title: 'Sửa chữa đường băng số 1',
      description: 'Sửa chữa và bảo trì mặt đường băng số 1',
      type: 'maintenance',
      area: 'Runway',
      priority: 'urgent',
      status: 'in_progress',
      assigneeType: 'group',
      assignee: 'Tổ Kỹ thuật Đường băng',
      deadline: '2024-01-22T06:00:00Z',
      createdAt: '2024-01-18T15:00:00Z',
    },
    {
      id: '7',
      title: 'Vệ sinh khu vực hành lý',
      description: 'Vệ sinh và khử trùng khu vực nhận hành lý',
      type: 'cleaning',
      area: 'Baggage',
      priority: 'normal',
      status: 'todo',
      assigneeType: 'group',
      assignee: 'Tổ Vệ sinh Khu vực 2',
      deadline: '2024-01-20T08:00:00Z',
      createdAt: '2024-01-18T10:00:00Z',
    },
    {
      id: '8',
      title: 'Kiểm tra hệ thống báo cháy',
      description: 'Kiểm tra định kỳ hệ thống báo cháy và chữa cháy',
      type: 'technical',
      area: 'Terminal B',
      priority: 'high',
      status: 'review',
      assigneeType: 'individual',
      assignee: 'Lê Văn C',
      deadline: '2024-01-19T11:00:00Z',
      createdAt: '2024-01-17T09:00:00Z',
    },
    {
      id: '9',
      title: 'Hỗ trợ khách hàng VIP',
      description: 'Hỗ trợ và phục vụ khách hàng VIP tại phòng chờ',
      type: 'customer_service',
      area: 'Terminal A',
      priority: 'high',
      status: 'in_progress',
      assigneeType: 'individual',
      assignee: 'Mai Thị K',
      deadline: '2024-01-20T20:00:00Z',
      createdAt: '2024-01-19T07:00:00Z',
    },
    {
      id: '10',
      title: 'Vận chuyển hàng hóa đặc biệt',
      description: 'Vận chuyển và xử lý hàng hóa đặc biệt tại khu Cargo',
      type: 'logistics',
      area: 'Cargo',
      priority: 'urgent',
      status: 'todo',
      assigneeType: 'team',
      assignee: 'Đội Logistics',
      deadline: '2024-01-21T12:00:00Z',
      createdAt: '2024-01-19T13:00:00Z',
    },
    {
      id: '11',
      title: 'Bảo trì hệ thống điều hòa Gate 10',
      description: 'Kiểm tra và bảo trì hệ thống điều hòa không khí',
      type: 'maintenance',
      area: 'Gate 10',
      priority: 'normal',
      status: 'completed',
      assigneeType: 'group',
      assignee: 'Tổ Bảo trì Terminal A',
      deadline: '2024-01-18T14:00:00Z',
      createdAt: '2024-01-16T11:00:00Z',
    },
    {
      id: '12',
      title: 'An ninh kiểm soát tại Parking',
      description: 'Kiểm soát an ninh và trật tự tại bãi đỗ xe',
      type: 'security',
      area: 'Parking',
      priority: 'normal',
      status: 'in_progress',
      assigneeType: 'individual',
      assignee: 'Hoàng Văn E',
      deadline: '2024-01-20T18:00:00Z',
      createdAt: '2024-01-18T16:00:00Z',
    },
    {
      id: '13',
      title: 'Kiểm tra thiết bị an ninh',
      description: 'Kiểm tra và bảo trì thiết bị an ninh tại các cửa ra vào',
      type: 'technical',
      area: 'Terminal A',
      priority: 'high',
      status: 'todo',
      assigneeType: 'group',
      assignee: 'Tổ Kỹ thuật Thiết bị',
      deadline: '2024-01-22T09:00:00Z',
      createdAt: '2024-01-19T14:00:00Z',
    },
    {
      id: '14',
      title: 'Phục vụ mặt đất chuyến bay VN123',
      description: 'Cung cấp dịch vụ mặt đất cho chuyến bay VN123',
      type: 'logistics',
      area: 'Gate 3',
      priority: 'urgent',
      status: 'in_progress',
      assigneeType: 'group',
      assignee: 'Tổ Phục vụ mặt đất',
      deadline: '2024-01-20T15:30:00Z',
      createdAt: '2024-01-20T12:00:00Z',
    },
    {
      id: '15',
      title: 'Vệ sinh phòng chờ VIP',
      description: 'Vệ sinh và chuẩn bị phòng chờ VIP cho khách hàng',
      type: 'cleaning',
      area: 'Terminal B',
      priority: 'high',
      status: 'completed',
      assigneeType: 'individual',
      assignee: 'Vũ Thị H',
      deadline: '2024-01-19T07:00:00Z',
      createdAt: '2024-01-18T20:00:00Z',
    },
  ]);

  const jobTypes = [
    { label: 'Tất cả loại', value: 'all' },
    { label: 'Bảo trì', value: 'maintenance' },
    { label: 'An ninh', value: 'security' },
    { label: 'Vệ sinh', value: 'cleaning' },
    { label: 'Kỹ thuật', value: 'technical' },
    { label: 'Hậu cần', value: 'logistics' },
    { label: 'Khách hàng', value: 'customer_service' },
  ];

  const areas = [
    { label: 'Tất cả khu vực', value: 'all' },
    { label: 'Terminal A', value: 'Terminal A' },
    { label: 'Terminal B', value: 'Terminal B' },
    { label: 'Đường băng', value: 'Runway' },
    { label: 'Cổng khởi hành', value: 'Gate' },
    { label: 'Bãi đỗ xe', value: 'Parking' },
    { label: 'Khu hành lý', value: 'Baggage' },
    { label: 'Khu vận tải', value: 'Cargo' },
  ];

  const priorities = [
    { label: 'Tất cả mức độ', value: 'all' },
    { label: 'Khẩn cấp 🔴', value: 'urgent' },
    { label: 'Cao 🟡', value: 'high' },
    { label: 'Bình thường 🟢', value: 'normal' },
    { label: 'Thấp 🔵', value: 'low' },
  ];

  const statuses = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Đang thực hiện', value: 'in_progress' },
    { label: 'Chờ xử lý', value: 'todo' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Cần kiểm tra', value: 'review' },
  ];

  const statusConfig = {
    in_progress: { label: 'Đang thực hiện', color: '#2196F3', icon: 'play-circle' },
    todo: { label: 'Chờ xử lý', color: '#FF9800', icon: 'clock' },
    completed: { label: 'Hoàn thành', color: '#4CAF50', icon: 'check-circle' },
    review: { label: 'Cần kiểm tra', color: '#9C27B0', icon: 'eye' },
  };

  const priorityConfig = {
    urgent: { label: 'Khẩn cấp', color: '#F44336', emoji: '🔴' },
    high: { label: 'Cao', color: '#FF9800', emoji: '🟡' },
    normal: { label: 'Bình thường', color: '#4CAF50', emoji: '🟢' },
    low: { label: 'Thấp', color: '#2196F3', emoji: '🔵' },
  };

  const typeConfig = {
    maintenance: { label: 'Bảo trì', icon: 'wrench' },
    security: { label: 'An ninh', icon: 'shield' },
    cleaning: { label: 'Vệ sinh', icon: 'broom' },
    technical: { label: 'Kỹ thuật', icon: 'cog' },
    logistics: { label: 'Hậu cần', icon: 'truck' },
    customer_service: { label: 'Khách hàng', icon: 'account-group' },
  };

  const performSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    let results = [...allJobs];

    // Filter by search query
    if (searchQuery.trim()) {
      results = results.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.assignee.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (filters.jobType !== 'all') {
      results = results.filter(job => job.type === filters.jobType);
    }

    if (filters.area !== 'all') {
      results = results.filter(job => job.area === filters.area);
    }

    if (filters.priority !== 'all') {
      results = results.filter(job => job.priority === filters.priority);
    }

    if (filters.status !== 'all') {
      results = results.filter(job => job.status === filters.status);
    }

    if (filters.assigneeType !== 'all') {
      results = results.filter(job => job.assigneeType === filters.assigneeType);
    }

    if (filters.assigneeValue !== 'all' && filters.assigneeValue !== '') {
      results = results.filter(job => 
        job.assignee.toLowerCase().includes(filters.assigneeValue.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      results = results.filter(job => 
        moment(job.deadline).isSameOrAfter(moment(filters.dateFrom), 'day')
      );
    }

    if (filters.dateTo) {
      results = results.filter(job => 
        moment(job.deadline).isSameOrBefore(moment(filters.dateTo), 'day')
      );
    }

    setSearchResults(results);
    setIsSearching(false);
  };

  const resetFilters = () => {
    setFilters({
      jobType: 'all',
      area: 'all',
      priority: 'all',
      status: 'all',
      assigneeType: 'all',
      assigneeValue: '',
      dateFrom: null,
      dateTo: null,
    });
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const showDatePicker = (field) => {
    setDatePickerConfig({
      isVisible: true,
      mode: 'date',
      field: field,
    });
  };

  const showModal = (field, title, options) => {
    setModalConfig({
      isVisible: true,
      title: title,
      field: field,
      options: options,
    });
  };

  const handleModalSelect = (value) => {
    if (modalConfig.field === 'assigneeType') {
      handleAssigneeTypeChange(value);
    } else {
      setFilters(prev => ({ ...prev, [modalConfig.field]: value }));
    }
    setModalConfig({ isVisible: false, title: '', field: '', options: [] });
  };

  const closeModal = () => {
    setModalConfig({ isVisible: false, title: '', field: '', options: [] });
  };

  const getAssigneeOptions = () => {
    switch (filters.assigneeType) {
      case 'team':
        return teams;
      case 'group':
        return groups;
      case 'individual':
        return individuals;
      default:
        return [{ label: 'Chọn loại trước', value: 'all' }];
    }
  };

  const handleAssigneeTypeChange = (value) => {
    setFilters(prev => ({ 
      ...prev, 
      assigneeType: value,
      assigneeValue: 'all' // Reset assigneeValue when type changes
    }));
  };

  const handleDateConfirm = (date) => {
    setFilters(prev => ({ ...prev, [datePickerConfig.field]: date }));
    setDatePickerConfig({ isVisible: false, mode: 'date', field: '' });
  };

  const renderJobCard = ({ item }) => {
    const priority = priorityConfig[item.priority];
    const type = typeConfig[item.type];
    const status = statusConfig[item.status];
    const isOverdue = moment(item.deadline).isBefore(moment()) && item.status !== 'completed';

    return (
      <TouchableOpacity style={[styles.jobCard, isOverdue && styles.overdueCard]} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <MaterialCommunityIcons name={type.icon} size={16} color="#757575" />
            <Text style={styles.typeText}>{type.label}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
            <Text style={styles.priorityText}>{priority.emoji}</Text>
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color="#757575" />
            <Text style={styles.metaText}>{item.area}</Text>
          </View>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="account" size={14} color="#757575" />
            <Text style={styles.metaText}>{item.assignee}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <MaterialCommunityIcons name={status.icon} size={14} color="white" />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
          
          <View style={styles.deadlineContainer}>
            <MaterialCommunityIcons 
              name="calendar" 
              size={14} 
              color={isOverdue ? '#F44336' : '#757575'} 
            />
            <Text style={[styles.deadlineText, isOverdue && styles.overdueText]}>
              {moment(item.deadline).format('DD/MM HH:mm')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Layout>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#F57C00', '#FFB74D']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="magnify" size={32} color="white" />
          <Text style={styles.headerTitle}>Tìm kiếm công việc</Text>
          <Text style={styles.headerSubtitle}>Tìm kiếm và lọc công việc theo yêu cầu</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#757575" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên, mô tả, người được giao..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9E9E9E"
              onSubmitEditing={performSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#757575" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Toggle & Search Button */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.filterToggleButton, showFilters && styles.filterToggleButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialCommunityIcons 
                name="filter-variant" 
                size={20} 
                color={showFilters ? 'white' : '#F57C00'} 
              />
              <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
                Bộ lọc
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.searchButton}
              onPress={performSearch}
              disabled={isSearching}
            >
              <LinearGradient
                colors={['#F57C00', '#FFB74D']}
                style={styles.searchButtonGradient}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="magnify" size={20} color="white" />
                    <Text style={styles.searchButtonText}>Tìm kiếm</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <LinearGradient
              colors={['#F8FAFC', '#FFFFFF']}
              style={styles.filtersGradient}
            >
              <View style={styles.filtersHeader}>
                <View style={styles.filterHeaderContent}>
                  <MaterialCommunityIcons name="filter-variant" size={24} color="#F57C00" />
                  <Text style={styles.filtersTitle}>Bộ lọc nâng cao</Text>
                </View>
                <TouchableOpacity onPress={resetFilters} style={styles.resetButtonContainer}>
                  <MaterialCommunityIcons name="refresh" size={16} color="#F57C00" />
                  <Text style={styles.resetButton}>Đặt lại</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Filter Tags */}
              <View style={styles.quickFiltersSection}>
                <Text style={styles.quickFiltersLabel}>Bộ lọc nhanh</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFiltersScroll}>
                  <TouchableOpacity 
                    style={[styles.quickFilterTag, filters.status === 'in_progress' && styles.quickFilterTagActive]}
                    onPress={() => setFilters(prev => ({ ...prev, status: prev.status === 'in_progress' ? 'all' : 'in_progress' }))}
                  >
                    <MaterialCommunityIcons name="play-circle" size={16} color={filters.status === 'in_progress' ? 'white' : '#2196F3'} />
                    <Text style={[styles.quickFilterText, filters.status === 'in_progress' && styles.quickFilterTextActive]}>
                      Đang thực hiện
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.quickFilterTag, filters.priority === 'urgent' && styles.quickFilterTagActive]}
                    onPress={() => setFilters(prev => ({ ...prev, priority: prev.priority === 'urgent' ? 'all' : 'urgent' }))}
                  >
                    <MaterialCommunityIcons name="alert" size={16} color={filters.priority === 'urgent' ? 'white' : '#F44336'} />
                    <Text style={[styles.quickFilterText, filters.priority === 'urgent' && styles.quickFilterTextActive]}>
                      Khẩn cấp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.quickFilterTag, filters.area === 'Terminal A' && styles.quickFilterTagActive]}
                    onPress={() => setFilters(prev => ({ ...prev, area: prev.area === 'Terminal A' ? 'all' : 'Terminal A' }))}
                  >
                    <MaterialCommunityIcons name="airport" size={16} color={filters.area === 'Terminal A' ? 'white' : '#9C27B0'} />
                    <Text style={[styles.quickFilterText, filters.area === 'Terminal A' && styles.quickFilterTextActive]}>
                      Terminal A
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.quickFilterTag, filters.jobType === 'maintenance' && styles.quickFilterTagActive]}
                    onPress={() => setFilters(prev => ({ ...prev, jobType: prev.jobType === 'maintenance' ? 'all' : 'maintenance' }))}
                  >
                    <MaterialCommunityIcons name="wrench" size={16} color={filters.jobType === 'maintenance' ? 'white' : '#FF9800'} />
                    <Text style={[styles.quickFilterText, filters.jobType === 'maintenance' && styles.quickFilterTextActive]}>
                      Bảo trì
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Main Filters */}
              <View style={styles.mainFiltersSection}>
                {/* Row 1: Job Type & Area */}
                <View style={styles.filterRow}>
                  <View style={styles.halfFilter}>
                    <Text style={styles.filterLabel}>
                      <MaterialCommunityIcons name="briefcase" size={16} color="#F57C00" /> Loại công việc
                    </Text>
                    <TouchableOpacity 
                      style={styles.modalPickerButton} 
                      onPress={() => showModal('jobType', 'Chọn loại công việc', jobTypes)}
                    >
                      <Text style={[styles.modalPickerText, filters.jobType !== 'all' && styles.modalPickerTextSelected]}>
                        {jobTypes.find(type => type.value === filters.jobType)?.label || 'Tất cả loại'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.halfFilter}>
                    <Text style={styles.filterLabel}>
                      <MaterialCommunityIcons name="map-marker" size={16} color="#F57C00" /> Khu vực
                    </Text>
                    <TouchableOpacity 
                      style={styles.modalPickerButton} 
                      onPress={() => showModal('area', 'Chọn khu vực', areas)}
                    >
                      <Text style={[styles.modalPickerText, filters.area !== 'all' && styles.modalPickerTextSelected]}>
                        {areas.find(area => area.value === filters.area)?.label || 'Tất cả khu vực'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Row 2: Priority & Status */}
                <View style={styles.filterRow}>
                  <View style={styles.halfFilter}>
                    <Text style={styles.filterLabel}>
                      <MaterialCommunityIcons name="flag" size={16} color="#F57C00" /> Mức độ ưu tiên
                    </Text>
                    <TouchableOpacity 
                      style={styles.modalPickerButton} 
                      onPress={() => showModal('priority', 'Chọn mức độ ưu tiên', priorities)}
                    >
                      <Text style={[styles.modalPickerText, filters.priority !== 'all' && styles.modalPickerTextSelected]}>
                        {priorities.find(priority => priority.value === filters.priority)?.label || 'Tất cả mức độ'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.halfFilter}>
                    <Text style={styles.filterLabel}>
                      <MaterialCommunityIcons name="progress-check" size={16} color="#F57C00" /> Trạng thái
                    </Text>
                    <TouchableOpacity 
                      style={styles.modalPickerButton} 
                      onPress={() => showModal('status', 'Chọn trạng thái', statuses)}
                    >
                      <Text style={[styles.modalPickerText, filters.status !== 'all' && styles.modalPickerTextSelected]}>
                        {statuses.find(status => status.value === filters.status)?.label || 'Tất cả trạng thái'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Assignee */}
                <View style={styles.filterGroup}>
                  <Text style={styles.sectionTitle}>
                    <MaterialCommunityIcons name="account-multiple" size={16} color="#F57C00" /> Người được giao
                  </Text>
                  
                  {/* Assignee Type Row */}
                  <View style={styles.filterRow}>
                    <View style={styles.halfFilter}>
                      <Text style={styles.filterLabel}>Loại</Text>
                      <TouchableOpacity 
                        style={styles.modalPickerButton} 
                        onPress={() => {
                          setModalConfig({
                            isVisible: true,
                            title: 'Chọn loại người được giao',
                            field: 'assigneeType',
                            options: assigneeTypes,
                          });
                        }}
                      >
                        <Text style={[styles.modalPickerText, filters.assigneeType !== 'all' && styles.modalPickerTextSelected]}>
                          {assigneeTypes.find(type => type.value === filters.assigneeType)?.label || 'Tất cả loại'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.halfFilter}>
                      <Text style={styles.filterLabel}>Đối tượng</Text>
                      <TouchableOpacity 
                        style={[styles.modalPickerButton, filters.assigneeType === 'all' && styles.disabledPickerButton]} 
                        onPress={() => {
                          if (filters.assigneeType !== 'all') {
                            showModal('assigneeValue', `Chọn ${assigneeTypes.find(type => type.value === filters.assigneeType)?.label}`, getAssigneeOptions());
                          }
                        }}
                        disabled={filters.assigneeType === 'all'}
                      >
                        <Text style={[
                          styles.modalPickerText, 
                          filters.assigneeValue !== 'all' && filters.assigneeValue !== '' && styles.modalPickerTextSelected,
                          filters.assigneeType === 'all' && styles.disabledPickerText
                        ]}>
                          {filters.assigneeType === 'all' 
                            ? 'Chọn loại trước' 
                            : getAssigneeOptions().find(option => option.value === filters.assigneeValue)?.label || 'Chọn đối tượng'
                          }
                        </Text>
                        <MaterialCommunityIcons 
                          name="chevron-down" 
                          size={20} 
                          color={filters.assigneeType === 'all' ? '#BDBDBD' : '#757575'} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Date Range */}
                <View style={styles.dateRangeSection}>
                  <Text style={styles.sectionTitle}>
                    <MaterialCommunityIcons name="calendar-range" size={16} color="#F57C00" /> Khoảng thời gian
                  </Text>
                  <View style={styles.filterRow}>
                    <View style={styles.halfFilter}>
                      <Text style={styles.filterLabel}>Từ ngày</Text>
                      <TouchableOpacity style={styles.dateButton} onPress={() => showDatePicker('dateFrom')}>
                        <MaterialCommunityIcons name="calendar" size={20} color="#F57C00" style={styles.inputIcon} />
                        <Text style={[styles.dateText, filters.dateFrom && styles.dateTextSelected]}>
                          {filters.dateFrom ? moment(filters.dateFrom).format('DD/MM/YYYY') : 'Chọn ngày'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#757575" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.halfFilter}>
                      <Text style={styles.filterLabel}>Đến ngày</Text>
                      <TouchableOpacity style={styles.dateButton} onPress={() => showDatePicker('dateTo')}>
                        <MaterialCommunityIcons name="calendar" size={20} color="#F57C00" style={styles.inputIcon} />
                        <Text style={[styles.dateText, filters.dateTo && styles.dateTextSelected]}>
                          {filters.dateTo ? moment(filters.dateTo).format('DD/MM/YYYY') : 'Chọn ngày'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#757575" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Apply Filters Button */}
                <TouchableOpacity style={styles.applyFiltersButton} onPress={performSearch}>
                  <LinearGradient
                    colors={['#F57C00', '#FFB74D']}
                    style={styles.applyFiltersGradient}
                  >
                    <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                    <Text style={styles.applyFiltersText}>Áp dụng bộ lọc</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Search Results */}
        {hasSearched && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Kết quả tìm kiếm</Text>
              <Text style={styles.resultsCount}>{searchResults.length} công việc</Text>
            </View>

            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderJobCard}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="search-web" size={64} color="#BDBDBD" />
                <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
                <Text style={styles.emptyDescription}>
                  Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={datePickerConfig.isVisible}
        mode={datePickerConfig.mode}
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerConfig({ isVisible: false, mode: 'date', field: '' })}
      />

      {/* Custom Picker Modal */}
      <Modal
        visible={modalConfig.isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {modalConfig.options.map((option) => {
                const isSelected = modalConfig.field === 'assigneeType' 
                  ? filters.assigneeType === option.value
                  : modalConfig.field === 'assigneeValue'
                  ? filters.assigneeValue === option.value
                  : filters[modalConfig.field] === option.value;
                  
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected
                    ]}
                    onPress={() => handleModalSelect(option.value)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color="#F57C00" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2E2E2E',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F57C00',
    backgroundColor: 'white',
  },
  filterToggleButtonActive: {
    backgroundColor: '#F57C00',
  },
  filterToggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  filterToggleTextActive: {
    color: 'white',
  },
  searchButton: {
    flex: 1,
    borderRadius: 8,
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersGradient: {
    padding: 16,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E2E2E',
    marginLeft: 8,
  },
  resetButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F57C00',
  },
  resetButton: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
    marginLeft: 4,
  },
  quickFiltersSection: {
    marginBottom: 20,
  },
  quickFiltersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 12,
  },
  quickFiltersScroll: {
    flexDirection: 'row',
  },
  quickFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickFilterTagActive: {
    backgroundColor: '#F57C00',
    borderColor: '#F57C00',
  },
  quickFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  quickFilterTextActive: {
    color: 'white',
  },
  mainFiltersSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 16,
  },
  dateRangeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfFilter: {
    flex: 1,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalPickerText: {
    fontSize: 14,
    color: '#9E9E9E',
    flex: 1,
  },
  modalPickerTextSelected: {
    color: '#2E2E2E',
    fontWeight: '500',
  },
  disabledPickerButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  disabledPickerText: {
    color: '#BDBDBD',
  },
  customPickerButton: {
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerContainer: {
    backgroundColor: 'transparent',
  },
  picker: {
    height: 50,
    color: '#2E2E2E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#2E2E2E',
    paddingVertical: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: '#9E9E9E',
    marginLeft: 8,
  },
  dateTextSelected: {
    color: '#2E2E2E',
    fontWeight: '500',
  },
  applyFiltersButton: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  applyFiltersGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  resultsContainer: {
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E2E2E',
  },
  resultsCount: {
    fontSize: 14,
    color: '#757575',
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
    fontWeight: '500',
  },
  priorityBadge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 6,
    lineHeight: 20,
  },
  jobDescription: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  overdueText: {
    color: '#F44336',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  bottomPadding: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E2E2E',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  modalOptionSelected: {
    backgroundColor: '#FFF3E0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#2E2E2E',
    flex: 1,
  },
  modalOptionTextSelected: {
    color: '#F57C00',
    fontWeight: '600',
  },
});

export default SearchJobScreen; 