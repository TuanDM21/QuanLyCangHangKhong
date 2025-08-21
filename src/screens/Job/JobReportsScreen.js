import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Layout from '../Common/Layout';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';

const { width } = Dimensions.get('window');

const JobReportsScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [animationProgress] = useState(new Animated.Value(0));
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: moment().subtract(7, 'days').toDate(),
    dateTo: new Date(),
    assigneeType: 'all', // all, team, group, individual
    assigneeValue: 'all',
  });

  const [datePickerConfig, setDatePickerConfig] = useState({
    isVisible: false,
    field: '',
  });

  const [modalConfig, setModalConfig] = useState({
    isVisible: false,
    title: '',
    field: '',
    options: [],
  });

  // Extended mock data with team/group/individual categorization
  const mockTeams = [
    { id: 'team1', name: 'Đội An Ninh Hàng Không', code: 'ASLV', manager: 'Nguyễn Văn Nam', location: 'Terminal A' },
    { id: 'team2', name: 'Đội Khai Thác Mặt Đất', code: 'KTMD', manager: 'Trần Thị Lan', location: 'Terminal B' },
    { id: 'team3', name: 'Đội Bảo Dưỡng Sửa Chữa', code: 'BDSC', manager: 'Lê Văn Tuấn', location: 'Hangar 1' },
    { id: 'team4', name: 'Đội Vận Hành Bay', code: 'VHB', manager: 'Phạm Thị Hoa', location: 'Tower Control' },
    { id: 'team5', name: 'Đội Quản Lý Hàng Hóa', code: 'QLHH', manager: 'Hoàng Văn Minh', location: 'Cargo Area' },
    { id: 'team6', name: 'Đội Dịch Vụ Khách Hàng', code: 'DVKH', manager: 'Vũ Thị Thu', location: 'Terminal A&B' },
    { id: 'team7', name: 'Đội Kiểm Soát An Toàn', code: 'KSAT', manager: 'Đặng Văn Hùng', location: 'All Areas' },
    { id: 'team8', name: 'Đội Cứu Hỏa Hàng Không', code: 'CHAK', manager: 'Bùi Văn Cường', location: 'Fire Station' },
    { id: 'team9', name: 'Đội Logistics Sân Bay', code: 'LGSB', manager: 'Ngô Thị Linh', location: 'Logistics Center' },
    { id: 'team10', name: 'Đội Quản Lý Năng Lượng', code: 'QLNL', manager: 'Lý Văn Đức', location: 'Power Station' },
  ];

  const mockGroups = [
    { id: 'group1', name: 'Tổ Kiểm Tra Hành Lý', teamId: 'team1', leader: 'Nguyễn Văn An', shift: 'Ca A' },
    { id: 'group2', name: 'Tổ Kiểm Soát Ra Vào', teamId: 'team1', leader: 'Trần Thị Bình', shift: 'Ca B' },
    { id: 'group3', name: 'Tổ Phục Vụ Mặt Đất', teamId: 'team2', leader: 'Lê Văn Cường', shift: 'Ca C' },
    { id: 'group4', name: 'Tổ Vận Chuyển Hành Lý', teamId: 'team2', leader: 'Phạm Thị Dung', shift: 'Ca A' },
    { id: 'group5', name: 'Tổ Bảo Dưỡng Định Kỳ', teamId: 'team3', leader: 'Hoàng Văn Em', shift: 'Ca B' },
    { id: 'group6', name: 'Tổ Sửa Chữa Khẩn Cấp', teamId: 'team3', leader: 'Vũ Thị Phương', shift: '24/7' },
    { id: 'group7', name: 'Tổ Điều Hành Chuyến Bay', teamId: 'team4', leader: 'Đặng Văn Giang', shift: 'Ca A' },
    { id: 'group8', name: 'Tổ Quản Lý Không Lưu', teamId: 'team4', leader: 'Bùi Thị Hoa', shift: 'Ca B' },
    { id: 'group9', name: 'Tổ Xử Lý Hàng Hóa', teamId: 'team5', leader: 'Ngô Văn Inh', shift: 'Ca C' },
    { id: 'group10', name: 'Tổ Kiểm Tra Hàng Hóa', teamId: 'team5', leader: 'Lý Thị Kim', shift: 'Ca A' },
    { id: 'group11', name: 'Tổ Hỗ Trợ Khách Hàng', teamId: 'team6', leader: 'Cao Văn Long', shift: 'Ca B' },
    { id: 'group12', name: 'Tổ Thông Tin Khách Hàng', teamId: 'team6', leader: 'Mai Thị Nga', shift: 'Ca C' },
    { id: 'group13', name: 'Tổ Tuần Tra An Ninh', teamId: 'team7', leader: 'Đỗ Văn Oanh', shift: '24/7' },
    { id: 'group14', name: 'Tổ Giám Sát Camera', teamId: 'team7', leader: 'Chu Thị Phúc', shift: '24/7' },
    { id: 'group15', name: 'Tổ Cứu Hỏa Khẩn Cấp', teamId: 'team8', leader: 'Tô Văn Quang', shift: '24/7' },
    { id: 'group16', name: 'Tổ Bảo Trì Thiết Bị PCCC', teamId: 'team8', leader: 'Hồ Thị Thanh', shift: 'Ca A' },
    { id: 'group17', name: 'Tổ Vận Chuyển Logistics', teamId: 'team9', leader: 'Đinh Văn Sơn', shift: 'Ca B' },
    { id: 'group18', name: 'Tổ Quản Lý Kho Bãi', teamId: 'team9', leader: 'Võ Thị Hạnh', shift: 'Ca C' },
    { id: 'group19', name: 'Tổ Điện Lực Chính', teamId: 'team10', leader: 'Phan Văn Tài', shift: 'Ca A' },
    { id: 'group20', name: 'Tổ Điện Lực Dự Phòng', teamId: 'team10', leader: 'Dương Thị Loan', shift: 'Ca B' },
  ];

  const mockIndividuals = [
    { id: 'user1', name: 'Nguyễn Văn An', groupId: 'group1', position: 'Trưởng ca', phone: '0901234567', email: 'an.nv@airport.vn' },
    { id: 'user2', name: 'Trần Thị Bình', groupId: 'group1', position: 'Nhân viên', phone: '0901234568', email: 'binh.tt@airport.vn' },
    { id: 'user3', name: 'Lê Văn Cường', groupId: 'group2', position: 'Nhân viên', phone: '0901234569', email: 'cuong.lv@airport.vn' },
    { id: 'user4', name: 'Phạm Thị Dung', groupId: 'group3', position: 'Tổ trưởng', phone: '0901234570', email: 'dung.pt@airport.vn' },
    { id: 'user5', name: 'Hoàng Văn Em', groupId: 'group3', position: 'Nhân viên', phone: '0901234571', email: 'em.hv@airport.vn' },
    { id: 'user6', name: 'Vũ Thị Phương', groupId: 'group4', position: 'Nhân viên', phone: '0901234572', email: 'phuong.vt@airport.vn' },
    { id: 'user7', name: 'Đặng Văn Giang', groupId: 'group5', position: 'Kỹ thuật viên', phone: '0901234573', email: 'giang.dv@airport.vn' },
    { id: 'user8', name: 'Bùi Thị Hoa', groupId: 'group6', position: 'Kỹ thuật viên', phone: '0901234574', email: 'hoa.bt@airport.vn' },
    { id: 'user9', name: 'Ngô Văn Inh', groupId: 'group7', position: 'Điều phối viên', phone: '0901234575', email: 'inh.nv@airport.vn' },
    { id: 'user10', name: 'Lý Thị Kim', groupId: 'group8', position: 'Nhân viên không lưu', phone: '0901234576', email: 'kim.lt@airport.vn' },
    { id: 'user11', name: 'Cao Văn Long', groupId: 'group9', position: 'Nhân viên xử lý', phone: '0901234577', email: 'long.cv@airport.vn' },
    { id: 'user12', name: 'Mai Thị Nga', groupId: 'group10', position: 'Kiểm tra viên', phone: '0901234578', email: 'nga.mt@airport.vn' },
    { id: 'user13', name: 'Đỗ Văn Oanh', groupId: 'group11', position: 'Tư vấn viên', phone: '0901234579', email: 'oanh.dv@airport.vn' },
    { id: 'user14', name: 'Chu Thị Phúc', groupId: 'group1', position: 'Nhân viên', phone: '0901234580', email: 'phuc.ct@airport.vn' },
    { id: 'user15', name: 'Tô Văn Quang', groupId: 'group2', position: 'Trưởng ca', phone: '0901234581', email: 'quang.tv@airport.vn' },
    { id: 'user16', name: 'Hồ Thị Thanh', groupId: 'group7', position: 'Nhân viên', phone: '0901234582', email: 'thanh.ht@airport.vn' },
    { id: 'user17', name: 'Đinh Văn Sơn', groupId: 'group12', position: 'Chuyên viên', phone: '0901234583', email: 'son.dv@airport.vn' },
    { id: 'user18', name: 'Võ Thị Hạnh', groupId: 'group13', position: 'Bảo vệ', phone: '0901234584', email: 'hanh.vt@airport.vn' },
    { id: 'user19', name: 'Phan Văn Tài', groupId: 'group14', position: 'Giám sát viên', phone: '0901234585', email: 'tai.pv@airport.vn' },
    { id: 'user20', name: 'Dương Thị Loan', groupId: 'group15', position: 'Lính cứu hỏa', phone: '0901234586', email: 'loan.dt@airport.vn' },
    { id: 'user21', name: 'Trương Văn Hải', groupId: 'group16', position: 'Kỹ thuật viên', phone: '0901234587', email: 'hai.tv@airport.vn' },
    { id: 'user22', name: 'Lưu Thị Mai', groupId: 'group17', position: 'Nhân viên vận chuyển', phone: '0901234588', email: 'mai.lt@airport.vn' },
    { id: 'user23', name: 'Huỳnh Văn Nam', groupId: 'group18', position: 'Thủ kho', phone: '0901234589', email: 'nam.hv@airport.vn' },
    { id: 'user24', name: 'Châu Thị Oanh', groupId: 'group19', position: 'Kỹ sư điện', phone: '0901234590', email: 'oanh.ct@airport.vn' },
    { id: 'user25', name: 'Lê Văn Phúc', groupId: 'group20', position: 'Kỹ thuật viên điện', phone: '0901234591', email: 'phuc.lv@airport.vn' },
    { id: 'user26', name: 'Nguyễn Thị Quỳnh', groupId: 'group3', position: 'Nhân viên', phone: '0901234592', email: 'quynh.nt@airport.vn' },
    { id: 'user27', name: 'Trần Văn Sáng', groupId: 'group4', position: 'Nhân viên', phone: '0901234593', email: 'sang.tv@airport.vn' },
    { id: 'user28', name: 'Lê Thị Tuyết', groupId: 'group5', position: 'Nhân viên', phone: '0901234594', email: 'tuyet.lt@airport.vn' },
    { id: 'user29', name: 'Phạm Văn Uy', groupId: 'group6', position: 'Nhân viên', phone: '0901234595', email: 'uy.pv@airport.vn' },
    { id: 'user30', name: 'Hoàng Thị Vân', groupId: 'group8', position: 'Nhân viên', phone: '0901234596', email: 'van.ht@airport.vn' },
  ];

  // Generate extended mock jobs data
  const generateMockJobs = (filters) => {
    const jobTypes = ['Bảo trì', 'An ninh', 'Vệ sinh', 'Kỹ thuật', 'Khách hàng', 'Hậu cần', 'Cứu hỏa', 'Điện lực'];
    const priorities = ['Thấp', 'Bình thường', 'Cao', 'Khẩn cấp'];
    const statuses = ['Hoàn thành đúng hạn', 'Hoàn thành trễ hạn', 'Đang thực hiện', 'Chờ xử lý'];
    const locations = ['Terminal A', 'Terminal B', 'Runway', 'Gate 1-10', 'Gate 11-20', 'Cargo Area', 'Hangar', 'Control Tower'];
    
    const jobs = [];
    for (let i = 1; i <= 250; i++) {
      const createdDate = moment().subtract(Math.floor(Math.random() * 30), 'days');
      const dueDate = moment(createdDate).add(Math.floor(Math.random() * 7) + 1, 'days');
      const completedDate = Math.random() > 0.15 ? moment(dueDate).subtract(Math.floor(Math.random() * 2), 'days') : null;
      const isOverdue = completedDate && completedDate.isAfter(dueDate);
      const assigneeType = ['team', 'group', 'individual'][Math.floor(Math.random() * 3)];
      
      let assignee = '';
      if (assigneeType === 'team') {
        assignee = mockTeams[Math.floor(Math.random() * mockTeams.length)].name;
      } else if (assigneeType === 'group') {
        assignee = mockGroups[Math.floor(Math.random() * mockGroups.length)].name;
      } else {
        assignee = mockIndividuals[Math.floor(Math.random() * mockIndividuals.length)].name;
      }

      jobs.push({
        id: `job_${i}`,
        title: `Công việc ${jobTypes[Math.floor(Math.random() * jobTypes.length)]} #${i}`,
        description: `Mô tả chi tiết công việc số ${i}`,
        type: jobTypes[Math.floor(Math.random() * jobTypes.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: completedDate ? (isOverdue ? 'Hoàn thành trễ hạn' : 'Hoàn thành đúng hạn') : statuses[Math.floor(Math.random() * 2) + 2],
        assignee,
        assigneeType,
        location: locations[Math.floor(Math.random() * locations.length)],
        createdDate: createdDate.format('YYYY-MM-DD HH:mm:ss'),
        dueDate: dueDate.format('YYYY-MM-DD HH:mm:ss'),
        completedDate: completedDate ? completedDate.format('YYYY-MM-DD HH:mm:ss') : null,
        isOverdue,
        estimatedHours: Math.floor(Math.random() * 8) + 1,
        actualHours: completedDate ? Math.floor(Math.random() * 10) + 1 : null,
      });
    }
    return jobs;
  };

  const [mockJobs] = useState(() => generateMockJobs(filters));

  // Generate filtered reports data
  const generateFilteredReportsData = () => {
    let totalJobs = 156;
    let completedJobs = 142;
    let overdueJobs = 8;
    let onTimeJobs = completedJobs - overdueJobs;
    
    // Apply date range filter (simulate filtering effect)
    const daysDiff = moment(filters.dateTo).diff(moment(filters.dateFrom), 'days');
    totalJobs = Math.max(10, Math.floor(totalJobs * (daysDiff / 30)));
    completedJobs = Math.floor(totalJobs * 0.85);
    overdueJobs = Math.floor(completedJobs * 0.08);
    onTimeJobs = completedJobs - overdueJobs;
    
    return {
      overview: {
        totalJobs,
        completedJobs,
        pendingJobs: totalJobs - completedJobs,
        onTimeJobs,
        overdueJobs,
        completionRate: Math.round((completedJobs / totalJobs) * 100),
        onTimeRate: Math.round((onTimeJobs / completedJobs) * 100),
      },
      byCategory: {
        teams: mockTeams.map(team => ({
          ...team,
          totalJobs: Math.floor(Math.random() * 25) + 10,
          completedJobs: Math.floor(Math.random() * 20) + 8,
          onTimeJobs: Math.floor(Math.random() * 15) + 5,
          overdueJobs: Math.floor(Math.random() * 3) + 1,
        })),
        groups: mockGroups.map(group => ({
          ...group,
          totalJobs: Math.floor(Math.random() * 15) + 5,
          completedJobs: Math.floor(Math.random() * 12) + 3,
          onTimeJobs: Math.floor(Math.random() * 10) + 2,
          overdueJobs: Math.floor(Math.random() * 2) + 1,
        })),
        individuals: mockIndividuals.map(individual => ({
          ...individual,
          totalJobs: Math.floor(Math.random() * 10) + 3,
          completedJobs: Math.floor(Math.random() * 8) + 2,
          onTimeJobs: Math.floor(Math.random() * 6) + 1,
          overdueJobs: Math.floor(Math.random() * 2),
        })),
      },
    };
  };

  const [reportsData, setReportsData] = useState(() => generateFilteredReportsData());

  const periods = [
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
    { label: 'Quý này', value: 'quarter' },
    { label: 'Năm này', value: 'year' },
  ];

  // Mock analytics data
  const [analytics, setAnalytics] = useState({
    overview: {
      totalJobs: 156,
      completedJobs: 89,
      inProgressJobs: 45,
      overdueJobs: 22,
      completionRate: 57,
      avgCompletionTime: 2.5, // days
    },
    statusBreakdown: {
      completed: { count: 89, percentage: 57 },
      in_progress: { count: 45, percentage: 29 },
      todo: { count: 15, percentage: 10 },
      review: { count: 7, percentage: 4 },
    },
    priorityBreakdown: {
      urgent: { count: 12, percentage: 8 },
      high: { count: 34, percentage: 22 },
      normal: { count: 89, percentage: 57 },
      low: { count: 21, percentage: 13 },
    },
    typeBreakdown: {
      maintenance: { count: 45, percentage: 29 },
      technical: { count: 38, percentage: 24 },
      cleaning: { count: 32, percentage: 21 },
      security: { count: 25, percentage: 16 },
      logistics: { count: 10, percentage: 6 },
      customer_service: { count: 6, percentage: 4 },
    },
    areaBreakdown: {
      'Terminal A': { count: 52, percentage: 33 },
      'Terminal B': { count: 41, percentage: 26 },
      'Gate': { count: 28, percentage: 18 },
      'Runway': { count: 20, percentage: 13 },
      'Cargo': { count: 15, percentage: 10 },
    },
    weeklyTrend: [
      { day: 'T2', completed: 12, created: 15 },
      { day: 'T3', completed: 18, created: 20 },
      { day: 'T4', completed: 15, created: 18 },
      { day: 'T5', completed: 22, created: 25 },
      { day: 'T6', completed: 19, created: 22 },
      { day: 'T7', completed: 8, created: 10 },
      { day: 'CN', completed: 5, created: 7 },
    ],
    topPerformers: [
      { name: 'Nguyễn Văn A', completed: 24, rate: 96 },
      { name: 'Trần Thị B', completed: 21, rate: 91 },
      { name: 'Lê Văn C', completed: 19, rate: 88 },
      { name: 'Phạm Thị D', completed: 17, rate: 85 },
      { name: 'Hoàng Văn E', completed: 15, rate: 83 },
    ],
  });

  const statusConfig = {
    completed: { label: 'Hoàn thành', color: '#4CAF50', icon: 'check-circle' },
    in_progress: { label: 'Đang thực hiện', color: '#2196F3', icon: 'play-circle' },
    todo: { label: 'Chờ xử lý', color: '#FF9800', icon: 'clock' },
    review: { label: 'Cần kiểm tra', color: '#9C27B0', icon: 'eye' },
  };

  const priorityConfig = {
    urgent: { label: 'Khẩn cấp', color: '#F44336' },
    high: { label: 'Cao', color: '#FF9800' },
    normal: { label: 'Bình thường', color: '#4CAF50' },
    low: { label: 'Thấp', color: '#2196F3' },
  };

  const typeConfig = {
    maintenance: { label: 'Bảo trì', color: '#FF5722' },
    technical: { label: 'Kỹ thuật', color: '#3F51B5' },
    cleaning: { label: 'Vệ sinh', color: '#00BCD4' },
    security: { label: 'An ninh', color: '#795548' },
    logistics: { label: 'Hậu cần', color: '#607D8B' },
    customer_service: { label: 'Khách hàng', color: '#E91E63' },
  };

  // Filter handler functions
  const openDatePicker = (field) => {
    setDatePickerConfig({
      isVisible: true,
      field,
    });
  };

  const closeDatePicker = () => {
    setDatePickerConfig({
      isVisible: false,
      field: '',
    });
  };

  const handleDateConfirm = (date) => {
    setFilters(prev => ({
      ...prev,
      [datePickerConfig.field]: date,
    }));
    closeDatePicker();
    // Regenerate data with new filters
    setTimeout(() => {
      setReportsData(generateFilteredReportsData());
    }, 100);
  };

  const openModal = (field, title, options) => {
    setModalConfig({
      isVisible: true,
      field,
      title,
      options,
    });
  };

  const closeModal = () => {
    setModalConfig({
      isVisible: false,
      title: '',
      field: '',
      options: [],
    });
  };

  const handleModalSelect = (value) => {
    if (modalConfig.field === 'assigneeType') {
      setFilters(prev => ({
        ...prev,
        assigneeType: value,
        assigneeValue: 'all', // Reset assignee value when type changes
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [modalConfig.field]: value,
      }));
    }
    closeModal();
    // Regenerate data with new filters
    setTimeout(() => {
      setReportsData(generateFilteredReportsData());
    }, 100);
  };

  const getAssigneeOptions = () => {
    switch (filters.assigneeType) {
      case 'team':
        return mockTeams.map(team => ({ label: team.name, value: team.id }));
      case 'group':
        return mockGroups.map(group => ({ label: group.name, value: group.id }));
      case 'individual':
        return mockIndividuals.map(individual => ({ label: individual.name, value: individual.id }));
      default:
        return [];
    }
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: moment().subtract(7, 'days').toDate(),
      dateTo: new Date(),
      assigneeType: 'all',
      assigneeValue: 'all',
    });
  };

  const applyFilters = () => {
    setReportsData(generateFilteredReportsData());
    setShowFilters(false);
  };

  // Export functions
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // Filter jobs based on current filters
      const filteredJobs = mockJobs.filter(job => {
        const jobDate = moment(job.createdDate);
        const isInDateRange = jobDate.isBetween(moment(filters.dateFrom), moment(filters.dateTo), 'day', '[]');
        
        if (!isInDateRange) return false;
        
        if (filters.assigneeType === 'all') return true;
        
        return job.assigneeType === filters.assigneeType && 
               (filters.assigneeValue === 'all' || job.assignee.includes(filters.assigneeValue));
      });

      const csvData = [
        ['ID', 'Tiêu đề', 'Loại', 'Mức độ', 'Trạng thái', 'Người thực hiện', 'Vị trí', 'Ngày tạo', 'Hạn hoàn thành', 'Ngày hoàn thành', 'Giờ ước tính', 'Giờ thực tế'],
        ...filteredJobs.map(job => [
          job.id,
          job.title,
          job.type,
          job.priority,
          job.status,
          job.assignee,
          job.location,
          job.createdDate,
          job.dueDate,
          job.completedDate || 'Chưa hoàn thành',
          job.estimatedHours,
          job.actualHours || 'N/A'
        ])
      ];

      // Simulate CSV export (in real app, would use file system)
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      console.log('CSV exported:', csvContent.length + ' characters');
      
      // Show success message
      alert(`Đã xuất ${filteredJobs.length} công việc ra file CSV thành công!`);
    } catch (error) {
      alert('Lỗi khi xuất file CSV: ' + error.message);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Simulate Excel export
      const filteredJobs = mockJobs.filter(job => {
        const jobDate = moment(job.createdDate);
        const isInDateRange = jobDate.isBetween(moment(filters.dateFrom), moment(filters.dateTo), 'day', '[]');
        
        if (!isInDateRange) return false;
        
        if (filters.assigneeType === 'all') return true;
        
        return job.assigneeType === filters.assigneeType && 
               (filters.assigneeValue === 'all' || job.assignee.includes(filters.assigneeValue));
      });

      console.log('Excel export simulated for', filteredJobs.length, 'jobs');
      alert(`Đã xuất ${filteredJobs.length} công việc ra file Excel thành công!`);
    } catch (error) {
      alert('Lỗi khi xuất file Excel: ' + error.message);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Generate PDF report
      const reportData = {
        title: 'Báo cáo công việc sân bay',
        dateRange: `${moment(filters.dateFrom).format('DD/MM/YYYY')} - ${moment(filters.dateTo).format('DD/MM/YYYY')}`,
        summary: reportsData.overview,
        generatedAt: moment().format('DD/MM/YYYY HH:mm:ss'),
        filters: {
          assigneeType: filters.assigneeType,
          assigneeValue: filters.assigneeValue
        }
      };

      console.log('PDF report generated:', reportData);
      alert('Đã xuất báo cáo PDF thành công!');
    } catch (error) {
      alert('Lỗi khi xuất file PDF: ' + error.message);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  useEffect(() => {
    // Animate progress bars
    Animated.timing(animationProgress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch updated analytics from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderOverviewCard = (title, value, subtitle, icon, color) => (
    <View style={styles.overviewCard}>
      <View style={[styles.overviewIconContainer, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color="white" />
      </View>
      <View style={styles.overviewContent}>
        <Text style={styles.overviewValue}>{value}</Text>
        <Text style={styles.overviewTitle}>{title}</Text>
        <Text style={styles.overviewSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  const renderProgressBar = (percentage, color) => (
    <View style={styles.progressBarContainer}>
      <Animated.View 
        style={[
          styles.progressBar, 
          { 
            backgroundColor: color,
            width: animationProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${percentage}%`],
            }),
          }
        ]} 
      />
    </View>
  );

  const renderStatusChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Phân bố theo trạng thái</Text>
      {Object.entries(analytics.statusBreakdown).map(([status, data]) => {
        const config = statusConfig[status];
        return (
          <View key={status} style={styles.chartItem}>
            <View style={styles.chartItemHeader}>
              <View style={styles.chartItemLabel}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={styles.chartItemText}>{config.label}</Text>
              </View>
              <Text style={styles.chartItemValue}>{data.count} ({data.percentage}%)</Text>
            </View>
            {renderProgressBar(data.percentage, config.color)}
          </View>
        );
      })}
    </View>
  );

  const renderPriorityChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Phân bố theo mức độ ưu tiên</Text>
      {Object.entries(analytics.priorityBreakdown).map(([priority, data]) => {
        const config = priorityConfig[priority];
        return (
          <View key={priority} style={styles.chartItem}>
            <View style={styles.chartItemHeader}>
              <View style={styles.chartItemLabel}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={styles.chartItemText}>{config.label}</Text>
              </View>
              <Text style={styles.chartItemValue}>{data.count} ({data.percentage}%)</Text>
            </View>
            {renderProgressBar(data.percentage, config.color)}
          </View>
        );
      })}
    </View>
  );

  const renderTypeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Phân bố theo loại công việc</Text>
      {Object.entries(analytics.typeBreakdown).map(([type, data]) => {
        const config = typeConfig[type];
        return (
          <View key={type} style={styles.chartItem}>
            <View style={styles.chartItemHeader}>
              <View style={styles.chartItemLabel}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={styles.chartItemText}>{config.label}</Text>
              </View>
              <Text style={styles.chartItemValue}>{data.count} ({data.percentage}%)</Text>
            </View>
            {renderProgressBar(data.percentage, config.color)}
          </View>
        );
      })}
    </View>
  );

  const renderWeeklyTrend = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Xu hướng tuần này</Text>
      <View style={styles.trendChart}>
        {analytics.weeklyTrend.map((item, index) => {
          const maxValue = Math.max(...analytics.weeklyTrend.map(d => Math.max(d.completed, d.created)));
          const completedHeight = (item.completed / maxValue) * 100;
          const createdHeight = (item.created / maxValue) * 100;
          
          return (
            <View key={index} style={styles.trendBar}>
              <View style={styles.trendBarContainer}>
                <Animated.View 
                  style={[
                    styles.trendBarCompleted, 
                    { 
                      height: animationProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, completedHeight],
                      }),
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.trendBarCreated, 
                    { 
                      height: animationProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, createdHeight],
                      }),
                    }
                  ]} 
                />
              </View>
              <Text style={styles.trendBarLabel}>{item.day}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.trendLegend}>
        <View style={styles.trendLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.trendLegendText}>Hoàn thành</Text>
        </View>
        <View style={styles.trendLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.trendLegendText}>Tạo mới</Text>
        </View>
      </View>
    </View>
  );

  const renderTopPerformers = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Top nhân viên xuất sắc</Text>
      {analytics.topPerformers.map((performer, index) => (
        <View key={index} style={styles.performerItem}>
          <View style={styles.performerRank}>
            <Text style={styles.performerRankText}>#{index + 1}</Text>
          </View>
          <View style={styles.performerInfo}>
            <Text style={styles.performerName}>{performer.name}</Text>
            <Text style={styles.performerStats}>
              {performer.completed} công việc • {performer.rate}% hoàn thành
            </Text>
          </View>
          <View style={styles.performerProgress}>
            <View style={styles.performerProgressBar}>
              <Animated.View 
                style={[
                  styles.performerProgressFill, 
                  { 
                    width: animationProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${performer.rate}%`],
                    }),
                  }
                ]} 
              />
            </View>
            <Text style={styles.performerRate}>{performer.rate}%</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Layout>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#5D4037', '#8D6E63']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="chart-line" size={32} color="white" />
          <Text style={styles.headerTitle}>Báo cáo và thống kê</Text>
          <Text style={styles.headerSubtitle}>Phân tích hiệu suất và xu hướng công việc</Text>
        </View>
        
        {/* Export Button */}
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => setShowExportOptions(true)}
        >
          <MaterialCommunityIcons name="download" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Period Filter */}
      <View style={styles.periodContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodButton,
                selectedPeriod === period.value && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.value)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period.value && styles.periodTextActive,
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialCommunityIcons name="filter" size={20} color="#5D4037" />
          <Text style={styles.filterToggleText}>Bộ lọc</Text>
          <MaterialCommunityIcons 
            name={showFilters ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#5D4037" 
          />
        </TouchableOpacity>
        
        {showFilters && (
          <View style={styles.filterContent}>
            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{mockTeams.length}</Text>
                <Text style={styles.quickStatLabel}>Đội</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{mockGroups.length}</Text>
                <Text style={styles.quickStatLabel}>Tổ</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{mockIndividuals.length}</Text>
                <Text style={styles.quickStatLabel}>Cá nhân</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{mockJobs.length}</Text>
                <Text style={styles.quickStatLabel}>Công việc</Text>
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <View style={styles.filterColumn}>
                <Text style={styles.filterLabel}>Từ ngày</Text>
                <TouchableOpacity 
                  style={styles.filterInput}
                  onPress={() => openDatePicker('dateFrom')}
                >
                  <Text style={styles.filterInputText}>
                    {moment(filters.dateFrom).format('DD/MM/YYYY')}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.filterColumn}>
                <Text style={styles.filterLabel}>Đến ngày</Text>
                <TouchableOpacity 
                  style={styles.filterInput}
                  onPress={() => openDatePicker('dateTo')}
                >
                  <Text style={styles.filterInputText}>
                    {moment(filters.dateTo).format('DD/MM/YYYY')}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterColumn}>
                <Text style={styles.filterLabel}>Phân loại</Text>
                <TouchableOpacity 
                  style={styles.filterInput}
                  onPress={() => openModal('assigneeType', 'Chọn phân loại', [
                    { label: 'Tất cả', value: 'all' },
                    { label: 'Đội', value: 'team' },
                    { label: 'Tổ', value: 'group' },
                    { label: 'Cá nhân', value: 'individual' },
                  ])}
                >
                  <Text style={styles.filterInputText}>
                    {filters.assigneeType === 'all' ? 'Tất cả' :
                     filters.assigneeType === 'team' ? 'Đội' :
                     filters.assigneeType === 'group' ? 'Tổ' : 'Cá nhân'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              {filters.assigneeType !== 'all' && (
                <View style={styles.filterColumn}>
                  <Text style={styles.filterLabel}>
                    {filters.assigneeType === 'team' ? 'Đội' :
                     filters.assigneeType === 'group' ? 'Tổ' : 'Cá nhân'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.filterInput}
                    onPress={() => {
                      const options = getAssigneeOptions();
                      if (options.length > 0) {
                        openModal('assigneeValue', `Chọn ${filters.assigneeType === 'team' ? 'đội' : filters.assigneeType === 'group' ? 'tổ' : 'cá nhân'}`, [
                          { label: 'Tất cả', value: 'all' },
                          ...options
                        ]);
                      }
                    }}
                  >
                    <Text style={styles.filterInputText}>
                      {filters.assigneeValue === 'all' ? 'Tất cả' : 
                       getAssigneeOptions().find(opt => opt.value === filters.assigneeValue)?.label || 'Chọn...'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <MaterialCommunityIcons name="refresh" size={16} color="#666" />
                <Text style={styles.resetButtonText}>Đặt lại</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <MaterialCommunityIcons name="check" size={16} color="white" />
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewRow}>
            {renderOverviewCard(
              'Tổng công việc',
              reportsData.overview.totalJobs,
              'Tất cả công việc',
              'briefcase',
              '#2196F3'
            )}
            {renderOverviewCard(
              'Hoàn thành',
              reportsData.overview.completedJobs,
              'Đã hoàn thành',
              'check-circle',
              '#4CAF50'
            )}
          </View>
          <View style={styles.overviewRow}>
            {renderOverviewCard(
              'Đúng hạn',
              reportsData.overview.onTimeJobs,
              `${reportsData.overview.onTimeRate}% hoàn thành đúng hạn`,
              'clock-check',
              '#009688'
            )}
            {renderOverviewCard(
              'Trễ hạn',
              reportsData.overview.overdueJobs,
              'Cần chú ý',
              'clock-alert',
              '#F44336'
            )}
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Tỷ lệ hoàn thành</Text>
            <View style={styles.metricContent}>
              <Text style={styles.metricValue}>{reportsData.overview.completionRate}%</Text>
              <View style={styles.metricProgressContainer}>
                {renderProgressBar(reportsData.overview.completionRate, '#4CAF50')}
              </View>
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Tỷ lệ đúng hạn</Text>
            <View style={styles.metricContent}>
              <Text style={styles.metricValue}>{reportsData.overview.onTimeRate}%</Text>
              <View style={styles.metricProgressContainer}>
                {renderProgressBar(reportsData.overview.onTimeRate, '#009688')}
              </View>
            </View>
          </View>
        </View>

        {/* Category Reports */}
        {filters.assigneeType !== 'all' && (
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>
              Thống kê theo {filters.assigneeType === 'team' ? 'đội' : filters.assigneeType === 'group' ? 'tổ' : 'cá nhân'}
            </Text>
            {reportsData.byCategory[`${filters.assigneeType}s`]
              .filter(item => filters.assigneeValue === 'all' || item.id === filters.assigneeValue)
              .slice(0, 10)
              .map((item, index) => (
                <View key={item.id} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <View style={styles.categoryStats}>
                      <Text style={styles.categoryCompleted}>{item.completedJobs}/{item.totalJobs}</Text>
                      <Text style={styles.categoryRate}>
                        {Math.round((item.completedJobs / item.totalJobs) * 100)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryProgress}>
                    {renderProgressBar((item.completedJobs / item.totalJobs) * 100, '#4CAF50')}
                  </View>
                  <View style={styles.categoryDetails}>
                    <View style={styles.categoryDetail}>
                      <MaterialCommunityIcons name="clock-check" size={16} color="#009688" />
                      <Text style={styles.categoryDetailText}>Đúng hạn: {item.onTimeJobs}</Text>
                    </View>
                    <View style={styles.categoryDetail}>
                      <MaterialCommunityIcons name="clock-alert" size={16} color="#F44336" />
                      <Text style={styles.categoryDetailText}>Trễ hạn: {item.overdueJobs}</Text>
                    </View>
                  </View>
                </View>
              ))
            }
          </View>
        )}

        {/* Detailed Breakdown */}
        <View style={styles.detailedContainer}>
          <Text style={styles.detailedTitle}>Chi tiết thống kê ({mockJobs.length} công việc)</Text>
          
          <View style={styles.detailedGrid}>
            <View style={styles.detailedCard}>
              <Text style={styles.detailedCardTitle}>Theo địa điểm</Text>
              {['Terminal A', 'Terminal B', 'Runway', 'Cargo Area'].map((location, index) => {
                const count = mockJobs.filter(job => job.location.includes(location.split(' ')[0])).length;
                return (
                  <View key={location} style={styles.detailedItem}>
                    <Text style={styles.detailedItemText}>{location}</Text>
                    <Text style={styles.detailedItemValue}>{count}</Text>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.detailedCard}>
              <Text style={styles.detailedCardTitle}>Theo mức độ ưu tiên</Text>
              {['Khẩn cấp', 'Cao', 'Bình thường', 'Thấp'].map((priority, index) => {
                const count = mockJobs.filter(job => 
                  (priority === 'Khẩn cấp' && job.priority === 'Khẩn cấp') ||
                  (priority === 'Cao' && job.priority === 'Cao') ||
                  (priority === 'Bình thường' && job.priority === 'Bình thường') ||
                  (priority === 'Thấp' && job.priority === 'Thấp')
                ).length;
                return (
                  <View key={priority} style={styles.detailedItem}>
                    <Text style={styles.detailedItemText}>{priority}</Text>
                    <Text style={styles.detailedItemValue}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          
          <View style={styles.detailedCard}>
            <Text style={styles.detailedCardTitle}>Hiệu suất theo loại công việc</Text>
            {['Bảo trì', 'An ninh', 'Vệ sinh', 'Kỹ thuật'].map((type, index) => {
              const typeJobs = mockJobs.filter(job => job.type === type);
              const completed = typeJobs.filter(job => job.completedDate).length;
              const rate = typeJobs.length > 0 ? Math.round((completed / typeJobs.length) * 100) : 0;
              return (
                <View key={type} style={styles.performanceItem}>
                  <View style={styles.performanceHeader}>
                    <Text style={styles.performanceType}>{type}</Text>
                    <Text style={styles.performanceStats}>{completed}/{typeJobs.length} ({rate}%)</Text>
                  </View>
                  <View style={styles.performanceBarContainer}>
                    <View style={[styles.performanceBar, { width: `${rate}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Charts */}
        {renderStatusChart()}
        {renderWeeklyTrend()}
        {renderPriorityChart()}
        {renderTypeChart()}
        {renderTopPerformers()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={datePickerConfig.isVisible}
        mode="date"
        date={datePickerConfig.field ? filters[datePickerConfig.field] : new Date()}
        onConfirm={handleDateConfirm}
        onCancel={closeDatePicker}
        maximumDate={datePickerConfig.field === 'dateFrom' ? filters.dateTo : new Date()}
        minimumDate={datePickerConfig.field === 'dateTo' ? filters.dateFrom : undefined}
      />

      {/* Selection Modal */}
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
              <TouchableOpacity onPress={closeModal}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {modalConfig.options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => handleModalSelect(option.value)}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {filters[modalConfig.field] === option.value && (
                    <MaterialCommunityIcons name="check" size={20} color="#5D4037" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Export Options Modal */}
      <Modal
        visible={showExportOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExportOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xuất báo cáo</Text>
              <TouchableOpacity onPress={() => setShowExportOptions(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.exportOptions}>
              <TouchableOpacity 
                style={styles.exportOption}
                onPress={exportToCSV}
                disabled={isExporting}
              >
                <MaterialCommunityIcons name="file-delimited" size={32} color="#4CAF50" />
                <Text style={styles.exportOptionTitle}>Xuất CSV</Text>
                <Text style={styles.exportOptionDesc}>Dữ liệu thô cho Excel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exportOption}
                onPress={exportToExcel}
                disabled={isExporting}
              >
                <MaterialCommunityIcons name="microsoft-excel" size={32} color="#217346" />
                <Text style={styles.exportOptionTitle}>Xuất Excel</Text>
                <Text style={styles.exportOptionDesc}>Bảng tính có định dạng</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exportOption}
                onPress={exportToPDF}
                disabled={isExporting}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={32} color="#F44336" />
                <Text style={styles.exportOptionTitle}>Xuất PDF</Text>
                <Text style={styles.exportOptionDesc}>Báo cáo tổng hợp</Text>
              </TouchableOpacity>
            </View>
            
            {isExporting && (
              <View style={styles.exportingOverlay}>
                <Text style={styles.exportingText}>Đang xuất file...</Text>
              </View>
            )}
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
  exportButton: {
    position: 'absolute',
    top: 20,
    right: 16,
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
  periodContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  periodScroll: {
    paddingHorizontal: 16,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  periodButtonActive: {
    backgroundColor: '#8D6E63',
    borderColor: '#8D6E63',
  },
  periodText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  periodTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  overviewContainer: {
    padding: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overviewContent: {
    flex: 1,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E2E2E',
    marginBottom: 2,
  },
  overviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 2,
  },
  overviewSubtitle: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  changeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    marginLeft: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 12,
  },
  metricContent: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E2E2E',
    marginBottom: 8,
  },
  metricProgressContainer: {
    width: '100%',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 16,
  },
  chartItem: {
    marginBottom: 12,
  },
  chartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  chartItemText: {
    fontSize: 14,
    color: '#2E2E2E',
    fontWeight: '500',
  },
  chartItemValue: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  trendBar: {
    alignItems: 'center',
    flex: 1,
  },
  trendBarContainer: {
    height: 80,
    width: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendBarCompleted: {
    width: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
    left: 2,
  },
  trendBarCreated: {
    width: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
    right: 2,
  },
  trendBarLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  trendLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendLegendText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8D6E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performerRankText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  performerInfo: {
    flex: 1,
    marginRight: 12,
  },
  performerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 2,
  },
  performerStats: {
    fontSize: 12,
    color: '#757575',
  },
  performerProgress: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  performerProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  performerProgressFill: {
    height: '100%',
    backgroundColor: '#8D6E63',
    borderRadius: 2,
  },
  performerRate: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D4037',
    marginHorizontal: 8,
  },
  filterContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5D4037',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterColumn: {
    flex: 1,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E2E2E',
    marginBottom: 8,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
  },
  filterInputText: {
    fontSize: 14,
    color: '#2E2E2E',
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#5D4037',
  },
  applyButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  categoryContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E2E2E',
    flex: 1,
    marginRight: 12,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  categoryRate: {
    fontSize: 12,
    color: '#757575',
  },
  categoryProgress: {
    marginBottom: 8,
  },
  categoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDetailText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  detailedContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 16,
  },
  detailedGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  detailedCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  detailedCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  detailedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailedItemText: {
    fontSize: 12,
    color: '#6C757D',
  },
  detailedItemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E2E2E',
  },
  performanceItem: {
    marginBottom: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  performanceType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E2E2E',
  },
  performanceStats: {
    fontSize: 12,
    color: '#6C757D',
  },
  performanceBarContainer: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  performanceBar: {
    height: '100%',
    backgroundColor: '#5D4037',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalContent: {
    paddingHorizontal: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#2E2E2E',
  },
  exportModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  exportOptions: {
    padding: 20,
  },
  exportOption: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    marginTop: 8,
  },
  exportOptionDesc: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  exportingText: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});

export default JobReportsScreen; 