import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import Layout from '../Common/Layout';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import httpApiClient from '../../services';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // 2 columns on mobile

const MyJobsScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('incomplete');
  const [selectedJobType, setSelectedJobType] = useState('created');
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [expandedJobs, setExpandedJobs] = useState(new Set()); // State for job card expansion
  const [jobCounts, setJobCounts] = useState({
    created: 0,
    assigned: 0,
    received: 0
  });
  
  // State for "created" tab filters
  const [searchText, setSearchText] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState([]); // Changed to array for multi-select
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(null); // null, 'from', 'to'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateValidationError, setDateValidationError] = useState('');
  const [isDatePickerFocused, setIsDatePickerFocused] = useState(false); // For highlighting date picker section
  
  // State for "assigned" tab filters (separate from created tab)
  const [assignedSearchText, setAssignedSearchText] = useState('');
  const [assignedSelectedPriorities, setAssignedSelectedPriorities] = useState([]);
  const [assignedSelectedAssigneeTypes, setAssignedSelectedAssigneeTypes] = useState([]); // For assignee type filter (USER, UNIT, TEAM)
  const [assignedDateFromFilter, setAssignedDateFromFilter] = useState('');
  const [assignedDateToFilter, setAssignedDateToFilter] = useState('');
  const [assignedShowDatePicker, setAssignedShowDatePicker] = useState(null);
  const [showAssignedFilterModal, setShowAssignedFilterModal] = useState(false);
  const [assignedDateValidationError, setAssignedDateValidationError] = useState('');
  const [assignedIsDatePickerFocused, setAssignedIsDatePickerFocused] = useState(false);
  
  // State for assignee selection modal
  const [showAssigneeSelectionModal, setShowAssigneeSelectionModal] = useState(false);
  const [currentAssigneeType, setCurrentAssigneeType] = useState(null); // 'USER', 'UNIT', 'TEAM'
  const [assigneeData, setAssigneeData] = useState([]); // Data from API
  const [selectedAssignees, setSelectedAssignees] = useState([]); // Currently selected assignees for this type
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [assigneeSearchText, setAssigneeSearchText] = useState('');
  
  // Store selected assignees for each type
  const [selectedUsers, setSelectedUsers] = useState([]); // Cá nhân
  const [selectedUnits, setSelectedUnits] = useState([]); // Tổ
  const [selectedTeams, setSelectedTeams] = useState([]); // Đội
  
  // State for inline assignee selection (expanded container)
  const [showInlineAssigneeSelection, setShowInlineAssigneeSelection] = useState(false);
  
  // State for Task Quick View Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // NEW: States for new modals
  const [showFullDetailModal, setShowFullDetailModal] = useState(false);
  const [showTreeViewModal, setShowTreeViewModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const [selectedTaskForTree, setSelectedTaskForTree] = useState(null);
  
  // Add ref to track current API call and prevent race conditions
  const currentFetchRef = useRef(null);
  
  // Add ref for filter modal ScrollView to enable auto-scroll
  const filterModalScrollRef = useRef(null);
  const assignedFilterModalScrollRef = useRef(null);

  // Job type tabs configuration
  const jobTypeTabs = [
    { 
      key: 'created', 
      label: 'Đã tạo', 
      icon: 'plus-box',
      color: '#2196F3',
      gradient: ['#1976D2', '#42A5F5']
    },
    { 
      key: 'assigned', 
      label: 'Đã giao', 
      icon: 'send',
      color: '#FF9800',
      gradient: ['#F57C00', '#FFB74D']
    },
    { 
      key: 'received', 
      label: 'Được giao', 
      icon: 'inbox-arrow-down',
      color: '#4CAF50',
      gradient: ['#2E7D32', '#4CAF50']
    },
  ];

  // API function to fetch jobs by type
  const fetchJobsByType = async (type) => {
    console.log(`🔄 Fetching jobs with type: ${type}`);
    console.log(`📡 API URL: tasks/my?type=${type}`);
    
    // Create a unique ID for this fetch request
    const fetchId = Date.now() + Math.random();
    currentFetchRef.current = fetchId;
    
    // Clear jobs immediately when starting fetch to prevent showing old data
    setJobs([]);
    setIsLoading(true);
    
    try {
      const response = await httpApiClient.get(`tasks/my?type=${type}`);
      
      // Check if this is still the current fetch request
      if (currentFetchRef.current !== fetchId) {
        console.log(`🚫 Fetch request ${fetchId} cancelled (newer request exists)`);
        return; // Ignore this response as a newer request has been made
      }
      
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response status text: ${response.statusText}`);
      
      if (response.status >= 200 && response.status < 300) {
        const responseData = await response.json();
        console.log('✅ Full API Response:', JSON.stringify(responseData, null, 2));
        
        // NEW API STRUCTURE - Handle the updated response format
        console.log('🔍 Response structure (NEW API):', {
          success: responseData.success,
          statusCode: responseData.statusCode,
          message: responseData.message,
          hasData: !!responseData.data,
          hasTasks: !!responseData.data?.tasks,
          tasksLength: responseData.data?.tasks?.length,
          totalCount: responseData.data?.totalCount,
          metadata: responseData.data?.metadata
        });
        
        let jobsArray = [];
        let totalCount = 0;
        let metadata = {};
        
        // Check if response has the new structure with success flag
        if (responseData.success === true && responseData.data && responseData.data.tasks) {
          // NEW API structure: response.data.tasks
          jobsArray = responseData.data.tasks;
          totalCount = responseData.data.totalCount || responseData.data.tasks.length;
          metadata = responseData.data.metadata || {};
          
          console.log('📊 Using NEW API structure: responseData.data.tasks');
          console.log('📊 Tasks array length:', jobsArray.length);
          console.log('📊 Total count from API:', totalCount);
          console.log('📊 Metadata:', metadata);
          
        } else if (Array.isArray(responseData)) {
          // Fallback: Direct array response
          jobsArray = responseData;
          totalCount = responseData.length;
          console.log('📊 Using responseData directly as array (fallback)');
          
        } else if (responseData.data && Array.isArray(responseData.data)) {
          // Fallback: responseData.data as array
          jobsArray = responseData.data;
          totalCount = responseData.totalCount || responseData.total || responseData.data.length;
          console.log('📊 Using responseData.data as array (fallback)');
          
        } else if (responseData.tasks && Array.isArray(responseData.tasks)) {
          // Fallback: responseData.tasks as array
          jobsArray = responseData.tasks;
          totalCount = responseData.totalCount || responseData.total || responseData.tasks.length;
          console.log('📊 Using responseData.tasks as array (fallback)');
          
        } else {
          // Try to find tasks array in various possible locations
          console.log('📊 Searching for tasks array in response...');
          if (responseData.data && responseData.data.data && Array.isArray(responseData.data.data)) {
            jobsArray = responseData.data.data;
            totalCount = responseData.data.totalCount || responseData.data.total || responseData.data.data.length;
            console.log('📊 Using responseData.data.data as array (nested fallback)');
          } else {
            console.log('📊 No suitable array found, setting empty array');
            jobsArray = [];
            totalCount = 0;
          }
        }
        
        console.log('📊 Final jobs array:', jobsArray);
        console.log('📊 Jobs array type:', typeof jobsArray);
        console.log('📊 Jobs array is array?:', Array.isArray(jobsArray));
        console.log('📊 Jobs array length:', jobsArray ? jobsArray.length : 'undefined');
        console.log('📊 Total count from API:', totalCount);
        
        // Log individual tasks for debugging with NEW structure
        if (Array.isArray(jobsArray) && jobsArray.length > 0) {
          console.log('📋 ==> Individual tasks (NEW STRUCTURE):');
          jobsArray.forEach((task, index) => {
            console.log(`📋 Task ${index}:`, {
              id: task.id,
              title: task.title,
              content: task.content,
              instructions: task.instructions,
              notes: task.notes,
              status: task.status, // NEW: Direct task status
              priority: task.priority, // NEW: Direct task priority
              parentId: task.parentId, // NEW: Parent ID instead of parentTaskId
              hierarchyLevel: task.hierarchyLevel,
              currentDepth: task.currentDepth, // NEW: Current depth field
              subtasks: task.subtasks, // NEW: May be different structure
              createdAt: task.createdAt,
              updatedAt: task.updatedAt, // NEW: Updated at field
              createdByUser: task.createdByUser,
              assignments: task.assignments,
              attachments: task.attachments // NEW: Attachments field
            });
            
            // Log user information with NEW structure
            if (task.createdByUser) {
              console.log(`👤 Created by user ${index} (NEW STRUCTURE):`, {
                id: task.createdByUser.id,
                name: task.createdByUser.name,
                email: task.createdByUser.email,
                roleName: task.createdByUser.roleName,
                teamName: task.createdByUser.teamName,
                unitName: task.createdByUser.unitName,
                roleId: task.createdByUser.roleId, // NEW: Role ID
                teamId: task.createdByUser.teamId, // NEW: Team ID
                unitId: task.createdByUser.unitId, // NEW: Unit ID
                permissions: task.createdByUser.permissions // NEW: Permissions array
              });
            }
            
            if (task.assignments && task.assignments.length > 0) {
              console.log(`📋 Assignments for task ${task.id} (NEW STRUCTURE):`, task.assignments.length);
              task.assignments.forEach((assignment, assignIndex) => {
                console.log(`👥 Assignment ${assignIndex}:`, {
                  assignmentId: assignment.assignmentId,
                  taskId: assignment.taskId,
                  recipientType: assignment.recipientType,
                  recipientId: assignment.recipientId, // NEW: Recipient ID field
                  assignedAt: assignment.assignedAt,
                  dueAt: assignment.dueAt,
                  completedAt: assignment.completedAt,
                  status: assignment.status, // NEW: Status enum (WORKING, etc.)
                  note: assignment.note, // NEW: Note field
                  assignedByUser: assignment.assignedByUser,
                  completedByUser: assignment.completedByUser, // NEW: Completed by user
                  recipientUser: assignment.recipientUser
                });
                
                // Log assigned by user with NEW structure
                if (assignment.assignedByUser) {
                  console.log(`👤 Assigned by user ${assignIndex}:`, {
                    id: assignment.assignedByUser.id,
                    name: assignment.assignedByUser.name,
                    email: assignment.assignedByUser.email,
                    roleName: assignment.assignedByUser.roleName,
                    teamName: assignment.assignedByUser.teamName,
                    unitName: assignment.assignedByUser.unitName,
                    roleId: assignment.assignedByUser.roleId,
                    teamId: assignment.assignedByUser.teamId,
                    unitId: assignment.assignedByUser.unitId,
                    permissions: assignment.assignedByUser.permissions
                  });
                }
                
                // Log completed by user (NEW field)
                if (assignment.completedByUser) {
                  console.log(`👤 Completed by user ${assignIndex}:`, {
                    id: assignment.completedByUser.id,
                    name: assignment.completedByUser.name,
                    email: assignment.completedByUser.email,
                    roleName: assignment.completedByUser.roleName,
                    teamName: assignment.completedByUser.teamName,
                    unitName: assignment.completedByUser.unitName,
                    roleId: assignment.completedByUser.roleId,
                    teamId: assignment.completedByUser.teamId,
                    unitId: assignment.completedByUser.unitId,
                    permissions: assignment.completedByUser.permissions
                  });
                }
                
                // Log recipient user with NEW structure
                if (assignment.recipientUser) {
                  console.log(`👤 Recipient user ${assignIndex}:`, {
                    id: assignment.recipientUser.id,
                    name: assignment.recipientUser.name,
                    email: assignment.recipientUser.email,
                    roleName: assignment.recipientUser.roleName,
                    teamName: assignment.recipientUser.teamName,
                    unitName: assignment.recipientUser.unitName,
                    roleId: assignment.recipientUser.roleId,
                    teamId: assignment.recipientUser.teamId,
                    unitId: assignment.recipientUser.unitId,
                    permissions: assignment.recipientUser.permissions
                  });
                }
              });
            }
            
            // Log attachments (NEW field)
            if (task.attachments && task.attachments.length > 0) {
              console.log(`📎 Attachments for task ${task.id}:`, task.attachments.length);
              task.attachments.forEach((attachment, attachIndex) => {
                console.log(`📄 Attachment ${attachIndex}:`, {
                  id: attachment.id,
                  filePath: attachment.filePath,
                  fileName: attachment.fileName,
                  fileSize: attachment.fileSize,
                  createdAt: attachment.createdAt,
                  sharedCount: attachment.sharedCount, // NEW: Shared count
                  uploadedBy: attachment.uploadedBy
                });
                
                if (attachment.uploadedBy) {
                  console.log(`👤 Uploaded by user ${attachIndex}:`, {
                    id: attachment.uploadedBy.id,
                    name: attachment.uploadedBy.name,
                    email: attachment.uploadedBy.email,
                    roleName: attachment.uploadedBy.roleName,
                    teamName: attachment.uploadedBy.teamName,
                    unitName: attachment.uploadedBy.unitName,
                    roleId: attachment.uploadedBy.roleId,
                    teamId: attachment.uploadedBy.teamId,
                    unitId: attachment.uploadedBy.unitId,
                    permissions: attachment.uploadedBy.permissions
                  });
                }
              });
            }
          });
        } else {
          console.log('📋 ❌ No tasks found or jobs array is empty/null');
        }
        
        // Build tree structure using hierarchyLevel and parentId (updated field names)
        const organizedJobs = buildTaskTree(Array.isArray(jobsArray) ? jobsArray : []);
        console.log('🌳 Jobs organized with hierarchy (NEW STRUCTURE):', organizedJobs);
        console.log('🌳 Organized jobs length:', organizedJobs.length);
        
        // Log metadata if available (NEW field)
        if (metadata && Object.keys(metadata).length > 0) {
          console.log('📊 API Metadata:', {
            createdCount: metadata.createdCount,
            assignedCount: metadata.assignedCount,
            receivedCount: metadata.receivedCount,
            rootTasksCount: metadata.rootTasksCount,
            subtasksCount: metadata.subtasksCount,
            maxLevel: metadata.maxLevel
          });
        }
        
        // Check again if this is still the current fetch request before setting state
        if (currentFetchRef.current === fetchId) {
          setJobs(organizedJobs);
          // Update job count for current tab - use metadata if available
          const countToUse = metadata && metadata[`${type}Count`] !== undefined 
            ? metadata[`${type}Count`] 
            : totalCount;
          
          setJobCounts(prevCounts => ({
            ...prevCounts,
            [type]: countToUse
          }));
          console.log(`📊 Updated ${type} count to: ${countToUse}`);
        } else {
          console.log(`🚫 Not setting jobs for fetch ${fetchId} (newer request exists)`);
        }
      } else {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`❌ Error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ API call failed:', error.message);
      console.error('❌ Full error:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Only set empty jobs if this is still the current fetch request
      if (currentFetchRef.current === fetchId) {
        setJobs([]);
      }
    } finally {
      // Only set loading to false if this is still the current fetch request
      if (currentFetchRef.current === fetchId) {
        setIsLoading(false);
      }
    }
  };

  // API functions to fetch assignee data
  const fetchUsers = async () => {
    console.log('🔄 Fetching users from API...');
    try {
      setIsLoadingAssignees(true);
      const response = await httpApiClient.get('users/assignable');
      console.log('✅ Users API Response:', response);
      
      if (response.status >= 200 && response.status < 300) {
        const responseData = await response.json();
        console.log('✅ Users API Response Data:', responseData);
        
        // Extract users array from response
        let users = [];
        if (Array.isArray(responseData)) {
          users = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          users = responseData.data;
        } else if (responseData.users && Array.isArray(responseData.users)) {
          users = responseData.users;
        }
        
        console.log('👥 Users fetched:', users.length);
        return users;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      return [];
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  const fetchUnits = async () => {
    console.log('🔄 Fetching units from API...');
    try {
      setIsLoadingAssignees(true);
      const response = await httpApiClient.get('units/assignable');
      console.log('✅ Units API Response:', response);
      
      if (response.status >= 200 && response.status < 300) {
        const responseData = await response.json();
        console.log('✅ Units API Response Data:', responseData);
        
        // Extract units array from response
        let units = [];
        if (Array.isArray(responseData)) {
          units = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          units = responseData.data;
        } else if (responseData.units && Array.isArray(responseData.units)) {
          units = responseData.units;
        }
        
        console.log('🏢 Units fetched:', units.length);
        return units;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch units:', error);
      return [];
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  const fetchTeams = async () => {
    console.log('🔄 Fetching teams from API...');
    try {
      setIsLoadingAssignees(true);
      const response = await httpApiClient.get('teams/assignable');
      console.log('✅ Teams API Response:', response);
      
      if (response.status >= 200 && response.status < 300) {
        const responseData = await response.json();
        console.log('✅ Teams API Response Data:', responseData);
        
        // Extract teams array from response
        let teams = [];
        if (Array.isArray(responseData)) {
          teams = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          teams = responseData.data;
        } else if (responseData.teams && Array.isArray(responseData.teams)) {
          teams = responseData.teams;
        }
        
        console.log('👥 Teams fetched:', teams.length);
        return teams;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch teams:', error);
      return [];
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  // Handle assignee type selection - open modal to select specific assignees
  const handleAssigneeTypeSelect = async (assigneeType, isInlineMode = false) => {
    console.log('🎯 Assignee type selected:', assigneeType);
    console.log('🎯 Mode:', isInlineMode ? 'Inline' : 'Modal');
    
    setCurrentAssigneeType(assigneeType);
    setAssigneeSearchText('');
    
    // Get current selections for this type and ensure selectedAssignees reflects them
    let currentSelections = [];
    if (assigneeType === 'USER') {
      currentSelections = selectedUsers;
    } else if (assigneeType === 'UNIT') {
      currentSelections = selectedUnits;
    } else if (assigneeType === 'TEAM') {
      currentSelections = selectedTeams;
    }
    
    console.log('🎯 Current selections for', assigneeType, ':', currentSelections);
    setSelectedAssignees([...currentSelections]);
    
    if (!isInlineMode) {
      // Show modal for original functionality
      console.log('🎯 Showing assignee selection modal...');
      setShowAssigneeSelectionModal(true);
    }
    
    // Fetch data based on type
    let data = [];
    if (assigneeType === 'USER') {
      data = await fetchUsers();
    } else if (assigneeType === 'UNIT') {
      data = await fetchUnits();
    } else if (assigneeType === 'TEAM') {
      data = await fetchTeams();
    }
    
    console.log('🎯 Fetched data:', data);
    setAssigneeData(data);
  };

  // Toggle assignee selection in modal
  const toggleAssigneeSelection = (assignee) => {
    const isSelected = selectedAssignees.some(a => a.id === assignee.id);
    if (isSelected) {
      setSelectedAssignees(prev => prev.filter(a => a.id !== assignee.id));
    } else {
      setSelectedAssignees(prev => [...prev, assignee]);
    }
  };

  // Apply assignee selections and update assigned types automatically
  const applyAssigneeSelections = () => {
    console.log('✅ Applying assignee selections for type:', currentAssigneeType);
    console.log('✅ Selected assignees:', selectedAssignees);
    
    // Update the appropriate state based on type
    if (currentAssigneeType === 'USER') {
      setSelectedUsers([...selectedAssignees]);
    } else if (currentAssigneeType === 'UNIT') {
      setSelectedUnits([...selectedAssignees]);
    } else if (currentAssigneeType === 'TEAM') {
      setSelectedTeams([...selectedAssignees]);
    }
    
    // Update the assignee types filter based on actual selections
    setAssignedSelectedAssigneeTypes(prev => {
      let newTypes = [...prev];
      
      if (selectedAssignees.length > 0) {
        // Add this type to selected types if not already there
        if (!newTypes.includes(currentAssigneeType)) {
          newTypes.push(currentAssigneeType);
        }
      } else {
        // Remove this type from selected types if no assignees selected
        newTypes = newTypes.filter(type => type !== currentAssigneeType);
      }
      
      console.log('✅ Updated assignedSelectedAssigneeTypes:', newTypes);
      return newTypes;
    });
    
    setShowAssigneeSelectionModal(false);
  };

  // Test function to add some mock recipients for demonstration
  const addMockRecipients = () => {
    console.log('🧪 Adding mock recipients for testing...');
    
    // Mock users
    const mockUsers = [
      { id: 1, fullName: 'Nguyễn Văn A', email: 'nguyenvana@company.com', employeeId: 'EMP001' },
      { id: 2, fullName: 'Trần Thị B', email: 'tranthib@company.com', employeeId: 'EMP002' },
      { id: 3, fullName: 'Lê Văn C', email: 'levanc@company.com', employeeId: 'EMP003' },
    ];
    
    // Mock units
    const mockUnits = [
      { id: 1, unitName: 'Tổ Kỹ Thuật A', teamName: 'Đội Kỹ Thuật' },
      { id: 2, unitName: 'Tổ Vận Hành B', teamName: 'Đội Vận Hành' },
    ];
    
    // Mock teams
    const mockTeams = [
      { id: 1, teamName: 'Đội An Ninh', description: 'Đội An Ninh Sân Bay', memberCount: 15 },
      { id: 2, teamName: 'Đội Kỹ Thuật', description: 'Đội Kỹ Thuật Máy Bay', memberCount: 20 },
    ];
    
    setSelectedUsers(mockUsers);
    setSelectedUnits(mockUnits);
    setSelectedTeams(mockTeams);
    setAssignedSelectedAssigneeTypes(['USER', 'UNIT', 'TEAM']);
    
    console.log('🧪 Mock recipients added successfully!');
  };

  // Enhanced test function with better mock data
  const addEnhancedMockData = () => {
    console.log('🎯 Adding enhanced mock data for UI testing...');
    
    const enhancedMockUsers = [
      { id: 1, fullName: 'Nguyễn Văn An', email: 'nguyenvanan@acv.com.vn', employeeId: 'ACV001', position: 'Kỹ sư' },
      { id: 2, fullName: 'Trần Thị Bình', email: 'tranthibinh@acv.com.vn', employeeId: 'ACV002', position: 'Chuyên viên' },
      { id: 3, fullName: 'Lê Văn Cường', email: 'levancuong@acv.com.vn', employeeId: 'ACV003', position: 'Trưởng ca' },
      { id: 4, fullName: 'Phạm Thị Dung', email: 'phamthidung@acv.com.vn', employeeId: 'ACV004', position: 'Điều hành viên' },
    ];
    
    const enhancedMockUnits = [
      { id: 1, unitName: 'Tổ Kỹ Thuật Hàng Không', teamName: 'Đội Kỹ Thuật', description: 'Bảo dưỡng máy bay' },
      { id: 2, unitName: 'Tổ Vận Hành Sân Bay', teamName: 'Đội Vận Hành', description: 'Điều hành chuyến bay' },
      { id: 3, unitName: 'Tổ An Toàn Bay', teamName: 'Đội An Toàn', description: 'Kiểm soát an toàn' },
    ];
    
    const enhancedMockTeams = [
      { id: 1, teamName: 'Đội An Ninh Hàng Không', description: 'Đảm bảo an ninh sân bay', memberCount: 25 },
      { id: 2, teamName: 'Đội Kỹ Thuật Máy Bay', description: 'Bảo dưỡng và sửa chữa', memberCount: 30 },
      { id: 3, teamName: 'Đội Điều Hành Bay', description: 'Điều phối chuyến bay', memberCount: 18 },
    ];
    
    console.log('🎯 Setting users:', enhancedMockUsers);
    console.log('🎯 Setting units:', enhancedMockUnits);
    console.log('🎯 Setting teams:', enhancedMockTeams);
    
    setSelectedUsers(enhancedMockUsers);
    setSelectedUnits(enhancedMockUnits);
    setSelectedTeams(enhancedMockTeams);
    setAssignedSelectedAssigneeTypes(['USER', 'UNIT', 'TEAM']);
    
    console.log('🎯 Enhanced mock data added successfully!');
    
    // Force re-render by logging current state after a short delay
    setTimeout(() => {
      console.log('🎯 Current selectedUsers:', selectedUsers);
      console.log('🎯 Current selectedUnits:', selectedUnits);
      console.log('🎯 Current selectedTeams:', selectedTeams);
    }, 100);
  };

  // Cancel assignee selection
  const cancelAssigneeSelection = () => {
    setShowAssigneeSelectionModal(false);
    setSelectedAssignees([]);
    setAssigneeData([]);
    setCurrentAssigneeType(null);
    setAssigneeSearchText('');
  };

  // Get display name for assignee
  const getAssigneeDisplayName = (assignee, type) => {
    console.log('🏷️ Getting display name for:', { assignee, type });
    
    let displayName = '';
    if (type === 'USER') {
      displayName = assignee.fullName || assignee.name || assignee.username || `User #${assignee.id}`;
    } else if (type === 'UNIT') {
      displayName = assignee.unitName || assignee.name || `Unit #${assignee.id}`;
    } else if (type === 'TEAM') {
      displayName = assignee.teamName || assignee.name || `Team #${assignee.id}`;
    } else {
      displayName = 'Unknown';
    }
    
    console.log('🏷️ Generated display name:', displayName);
    return displayName;
  };

  // Get total selected count for a type
  const getSelectedCountForType = (type) => {
    if (type === 'USER') {
      return selectedUsers.length;
    } else if (type === 'UNIT') {
      return selectedUnits.length;
    } else if (type === 'TEAM') {
      return selectedTeams.length;
    }
    return 0;
  };

  // Clear all selections for a type
  const clearSelectionsForType = (type) => {
    if (type === 'USER') {
      setSelectedUsers([]);
    } else if (type === 'UNIT') {
      setSelectedUnits([]);
    } else if (type === 'TEAM') {
      setSelectedTeams([]);
    }
    
    // Remove from assignee types filter
    setAssignedSelectedAssigneeTypes(prev => prev.filter(t => t !== type));
  };

  // Build tree structure using hierarchyLevel and parentId (UPDATED for new API structure)
  const buildTaskTree = (flatTasks) => {
    if (!Array.isArray(flatTasks) || flatTasks.length === 0) {
      console.log('🏗️ [TREE DEBUG] No tasks to build tree from');
      return [];
    }

    console.log('🏗️ [TREE DEBUG] Building task tree from flat tasks (NEW STRUCTURE):', flatTasks);
    console.log('🏗️ [TREE DEBUG] Total flat tasks:', flatTasks.length);
    
    // Log each task's hierarchy info with NEW field names
    flatTasks.forEach((task, index) => {
      console.log(`🏗️ [TREE DEBUG] Task ${index}: ID=${task.id}, hierarchyLevel=${task.hierarchyLevel}, parentId=${task.parentId}, currentDepth=${task.currentDepth}, title="${task.title}"`);
    });

    // Sort tasks by hierarchyLevel to ensure proper order
    const sortedTasks = [...flatTasks].sort((a, b) => {
      const levelA = a.hierarchyLevel || 0;
      const levelB = b.hierarchyLevel || 0;
      return levelA - levelB;
    });

    const taskMap = new Map();
    const rootTasks = [];

    // First pass: create map of all tasks with subtasks array
    sortedTasks.forEach((task, index) => {
      const uniqueId = task.id || `temp-${index}`;
      const hierarchyLevel = task.hierarchyLevel || 0;
      
      if (!taskMap.has(uniqueId)) {
        taskMap.set(uniqueId, { 
          ...task, 
          id: uniqueId, 
          hierarchyLevel,
          subtasks: [] 
        });
      }
    });

    // Second pass: build tree structure using hierarchyLevel and parentId (UPDATED)
    sortedTasks.forEach((task, index) => {
      const uniqueId = task.id || `temp-${index}`;
      const currentTask = taskMap.get(uniqueId);
      const hierarchyLevel = task.hierarchyLevel || 0;

      if (hierarchyLevel === 0 || !task.parentId) {
        // Root level task (level 0 or no parentId)
        if (!rootTasks.some(rt => rt.id === currentTask.id)) {
          rootTasks.push(currentTask);
        }
      } else {
        // Find parent task using parentId (UPDATED field name)
        let parentTask = null;
        
        // Look for parent by checking parentId first
        if (task.parentId && taskMap.has(task.parentId)) {
          parentTask = taskMap.get(task.parentId);
        } else {
          // If no parentId found in map, find by hierarchy level (fallback)
          for (let i = index - 1; i >= 0; i--) {
            const potentialParent = sortedTasks[i];
            const potentialParentLevel = potentialParent.hierarchyLevel || 0;
            
            if (potentialParentLevel === hierarchyLevel - 1) {
              parentTask = taskMap.get(potentialParent.id);
              break;
            } else if (potentialParentLevel < hierarchyLevel - 1) {
              // We've gone too far back, stop searching
              break;
            }
          }
        }

        // Add to parent's subtasks if parent found
        if (parentTask && !parentTask.subtasks.some(st => st.id === currentTask.id)) {
          parentTask.subtasks.push(currentTask);
          console.log(`📎 Added task ${currentTask.id} (level ${hierarchyLevel}) to parent ${parentTask.id} (level ${parentTask.hierarchyLevel})`);
        } else if (hierarchyLevel === 1) {
          // If it's level 1 and no parent found, might be a root task
          if (!rootTasks.some(rt => rt.id === currentTask.id)) {
            rootTasks.push(currentTask);
            console.log(`🔗 Added level 1 task ${currentTask.id} as root task (no parent found)`);
          }
        }
      }
    });

    console.log('🌳 [TREE DEBUG] Task tree built successfully with NEW STRUCTURE!');
    console.log('🌳 [TREE DEBUG] Root tasks count:', rootTasks.length);
    
    // Log each root task and its subtasks
    rootTasks.forEach((rootTask, index) => {
      console.log(`🌳 [TREE DEBUG] Root task ${index}: ID=${rootTask.id}, title="${rootTask.title}", subtasks=${rootTask.subtasks?.length || 0}`);
      
      // Log subtasks recursively
      const logSubtasks = (subtasks, level = 1) => {
        subtasks?.forEach((subtask, subIndex) => {
          const indent = '  '.repeat(level);
          console.log(`🌳 [TREE DEBUG] ${indent}Subtask ${subIndex}: ID=${subtask.id}, title="${subtask.title}", level=${subtask.hierarchyLevel}, children=${subtask.subtasks?.length || 0}`);
          if (subtask.subtasks && subtask.subtasks.length > 0) {
            logSubtasks(subtask.subtasks, level + 1);
          }
        });
      };
      
      if (rootTask.subtasks && rootTask.subtasks.length > 0) {
        logSubtasks(rootTask.subtasks);
      }
    });
    
    return rootTasks;
  };

  // Helper function to get status info from backend data - UPDATED for new status enum
  const getStatusInfo = (status, type = 'task') => {
    if (!status) return { label: 'Không xác định', color: '#9CA3AF', icon: 'help-circle-outline' };
    
    const statusUpper = status.toUpperCase();
    
    // NEW API status enum handling
    if (statusUpper === 'OPEN') {
      return { 
        label: 'Mở', 
        color: '#3B82F6', // Blue
        icon: type === 'assignment' ? 'account-clock' : 'clipboard-clock-outline' 
      };
    }
    
    if (statusUpper === 'WORKING') {
      return { 
        label: 'Đang thực hiện', 
        color: '#F59E0B', // Amber
        icon: type === 'assignment' ? 'account-cog' : 'clipboard-text-clock' 
      };
    }
    
    if (statusUpper === 'COMPLETED') {
      return { 
        label: 'Hoàn thành', 
        color: '#10B981', // Green
        icon: type === 'assignment' ? 'account-check' : 'clipboard-check' 
      };
    }
    
    if (statusUpper === 'CANCELLED') {
      return { 
        label: 'Đã hủy', 
        color: '#EF4444', // Red
        icon: type === 'assignment' ? 'account-cancel' : 'clipboard-remove-outline' 
      };
    }
    
    if (statusUpper === 'PAUSED') {
      return { 
        label: 'Tạm dừng', 
        color: '#8B5CF6', // Purple
        icon: type === 'assignment' ? 'account-alert' : 'clipboard-alert-outline' 
      };
    }
    
    // Fallback for legacy status values
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('complet') || statusLower.includes('done') || statusLower.includes('finished') || statusLower.includes('hoàn thành')) {
      return { 
        label: status, 
        color: '#10B981', // Green
        icon: type === 'assignment' ? 'account-check' : 'clipboard-check' 
      };
    }
    
    if (statusLower.includes('progress') || statusLower.includes('doing') || statusLower.includes('working') || statusLower.includes('đang thực hiện')) {
      return { 
        label: status, 
        color: '#3B82F6', // Blue
        icon: type === 'assignment' ? 'account-clock' : 'clipboard-clock-outline' 
      };
    }
    
    if (statusLower.includes('pending') || statusLower.includes('waiting') || statusLower.includes('chờ xử lý')) {
      return { 
        label: status, 
        color: '#F59E0B', // Amber
        icon: type === 'assignment' ? 'account-alert' : 'clipboard-alert-outline' 
      };
    }
    
    if (statusLower.includes('cancelled') || statusLower.includes('rejected') || statusLower.includes('huỷ')) {
      return { 
        label: status, 
        color: '#EF4444', // Red
        icon: type === 'assignment' ? 'account-cancel' : 'clipboard-remove-outline' 
      };
    }
    
    // Default fallback
    return { 
      label: status, 
      color: '#6B7280', // Gray
      icon: type === 'assignment' ? 'account-outline' : 'clipboard-text-outline' 
    };
  };

  // Date validation function
  const validateDateRange = (fromDate, toDate) => {
    console.log('📅 [VALIDATION] Validating date range - from:', fromDate, 'to:', toDate);
    
    if (!fromDate || !toDate) {
      setDateValidationError('');
      return true;
    }
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (to < from) {
      const errorMsg = 'Ngày kết thúc phải bằng hoặc lớn hơn ngày bắt đầu';
      console.log('📅 [VALIDATION] Error:', errorMsg);
      setDateValidationError(errorMsg);
      return false;
    }
    
    console.log('📅 [VALIDATION] Date range is valid');
    setDateValidationError('');
    return true;
  };

  // Priority multi-select functions
  const togglePriority = (priorityValue) => {
    console.log('🎯 [PRIORITY] Toggling priority:', priorityValue);
    console.log('🎯 [PRIORITY] Current selectedPriorities:', selectedPriorities);
    
    setSelectedPriorities(prev => {
      const newPriorities = prev.includes(priorityValue)
        ? prev.filter(p => p !== priorityValue)
        : [...prev, priorityValue];
      
      console.log('🎯 [PRIORITY] New selectedPriorities:', newPriorities);
      return newPriorities;
    });
  };

  const removePriority = (priorityValue) => {
    console.log('🎯 [PRIORITY] Removing priority:', priorityValue);
    setSelectedPriorities(prev => {
      const newPriorities = prev.filter(p => p !== priorityValue);
      console.log('🎯 [PRIORITY] New selectedPriorities after removal:', newPriorities);
      return newPriorities;
    });
  };

  // Assigned tab priority multi-select functions
  const toggleAssignedPriority = (priorityValue) => {
    console.log('🎯 [ASSIGNED PRIORITY] Toggling priority:', priorityValue);
    console.log('🎯 [ASSIGNED PRIORITY] Current assignedSelectedPriorities:', assignedSelectedPriorities);
    
    setAssignedSelectedPriorities(prev => {
      const newPriorities = prev.includes(priorityValue)
        ? prev.filter(p => p !== priorityValue)
        : [...prev, priorityValue];
      
      console.log('🎯 [ASSIGNED PRIORITY] New assignedSelectedPriorities:', newPriorities);
      return newPriorities;
    });
  };

  const removeAssignedPriority = (priorityValue) => {
    console.log('🎯 [ASSIGNED PRIORITY] Removing priority:', priorityValue);
    setAssignedSelectedPriorities(prev => {
      const newPriorities = prev.filter(p => p !== priorityValue);
      console.log('🎯 [ASSIGNED PRIORITY] New assignedSelectedPriorities after removal:', newPriorities);
      return newPriorities;
    });
  };

  // Assigned tab assignee type multi-select functions  
  const toggleAssignedAssigneeType = (assigneeType) => {
    console.log('👥 [ASSIGNED ASSIGNEE TYPE] Toggling inline container for type:', assigneeType);
    console.log('👥 [ASSIGNED ASSIGNEE TYPE] Current assignedSelectedAssigneeTypes:', assignedSelectedAssigneeTypes);
    
    // Toggle inline container instead of modal
    if (currentAssigneeType === assigneeType && showInlineAssigneeSelection) {
      // If clicking the same type that's already open, close it
      setShowInlineAssigneeSelection(false);
      setCurrentAssigneeType(null);
      setAssigneeData([]);
      setSelectedAssignees([]);
    } else {
      // Open inline container for this type
      setCurrentAssigneeType(assigneeType);
      setShowInlineAssigneeSelection(true);
      setAssigneeData([]);
      
      // Load current selections for this type before clearing selectedAssignees
      let currentSelections = [];
      if (assigneeType === 'USER') {
        currentSelections = selectedUsers;
      } else if (assigneeType === 'UNIT') {
        currentSelections = selectedUnits;
      } else if (assigneeType === 'TEAM') {
        currentSelections = selectedTeams;
      }
      
      console.log('👥 Loading current selections for', assigneeType, ':', currentSelections);
      setSelectedAssignees([...currentSelections]);
      
      // Fetch data for this type
      handleAssigneeTypeSelect(assigneeType, true); // true for inline mode
    }
  };

  const removeAssignedAssigneeType = (assigneeType) => {
    console.log('👥 [ASSIGNED ASSIGNEE TYPE] Removing assignee type:', assigneeType);
    
    // Clear selections for this type
    clearSelectionsForType(assigneeType);
    
    setAssignedSelectedAssigneeTypes(prev => {
      const newTypes = prev.filter(t => t !== assigneeType);
      console.log('👥 [ASSIGNED ASSIGNEE TYPE] New assignedSelectedAssigneeTypes after removal:', newTypes);
      return newTypes;
    });
  };

  // Assigned tab date picker handlers
  const showAssignedDateFromPicker = () => {
    console.log('🗓️ [ASSIGNED DATE PICKER] Showing date from picker in modal');
    console.log('🗓️ [ASSIGNED DATE PICKER] Current assignedDateFromFilter state:', assignedDateFromFilter);
    console.log('🗓️ [ASSIGNED DATE PICKER] Current assignedShowDatePicker state:', assignedShowDatePicker);
    
    setAssignedShowDatePicker('from');
    setAssignedIsDatePickerFocused(true);
    console.log('🗓️ [ASSIGNED DATE PICKER] Date picker set to show FROM picker');
    
    setTimeout(() => {
      if (assignedFilterModalScrollRef.current) {
        assignedFilterModalScrollRef.current.scrollToEnd({ animated: true });
        console.log('🗓️ [ASSIGNED DATE PICKER] Auto-scrolled to date picker section');
      }
    }, 100);
    
    setTimeout(() => {
      setAssignedIsDatePickerFocused(false);
    }, 2000);
  };

  const showAssignedDateToPicker = () => {
    console.log('🗓️ [ASSIGNED DATE PICKER] Showing date to picker in modal');
    console.log('🗓️ [ASSIGNED DATE PICKER] Current assignedDateToFilter state:', assignedDateToFilter);
    console.log('🗓️ [ASSIGNED DATE PICKER] Current assignedShowDatePicker state:', assignedShowDatePicker);
    
    setAssignedShowDatePicker('to');
    setAssignedIsDatePickerFocused(true);
    console.log('🗓️ [ASSIGNED DATE PICKER] Date picker set to show TO picker');
    
    setTimeout(() => {
      if (assignedFilterModalScrollRef.current) {
        assignedFilterModalScrollRef.current.scrollToEnd({ animated: true });
        console.log('🗓️ [ASSIGNED DATE PICKER] Auto-scrolled to date picker section');
      }
    }, 100);
    
    setTimeout(() => {
      setAssignedIsDatePickerFocused(false);
    }, 2000);
  };

  const hideAssignedDatePicker = () => {
    console.log('🗓️ [ASSIGNED DATE PICKER] Hiding date picker in modal');
    console.log('🗓️ [ASSIGNED DATE PICKER] Current assignedShowDatePicker state:', assignedShowDatePicker);
    setAssignedShowDatePicker(null);
    setAssignedIsDatePickerFocused(false);
    console.log('🗓️ [ASSIGNED DATE PICKER] Date picker hidden');
  };

  const handleAssignedDateChange = (event, selectedDate) => {
    console.log('🗓️ [ASSIGNED DATE PICKER] Date changed event:', event);
    console.log('🗓️ [ASSIGNED DATE PICKER] Selected date:', selectedDate);
    console.log('🗓️ [ASSIGNED DATE PICKER] Current assignedShowDatePicker type:', assignedShowDatePicker);
    
    if (Platform.OS === 'android') {
      setAssignedShowDatePicker(null);
    }
    
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log('🗓️ [ASSIGNED DATE PICKER] Formatted date:', formattedDate);
      
      if (assignedShowDatePicker === 'from') {
        console.log('🗓️ [ASSIGNED DATE PICKER] Setting FROM date:', formattedDate);
        setAssignedDateFromFilter(formattedDate);
        validateAssignedDateRange(formattedDate, assignedDateToFilter);
      } else if (assignedShowDatePicker === 'to') {
        console.log('🗓️ [ASSIGNED DATE PICKER] Setting TO date:', formattedDate);
        setAssignedDateToFilter(formattedDate);
        validateAssignedDateRange(assignedDateFromFilter, formattedDate);
      }
      
      if (Platform.OS === 'ios') {
        console.log('🗓️ [ASSIGNED DATE PICKER] iOS: Date set, keeping picker open');
      }
    }
  };

  // Helper function to get priority info from backend data - Updated with new colors
  const getPriorityInfo = (priority) => {
    if (!priority) return { label: 'Bình thường', color: '#9CA3AF', emoji: '⚪' };
    
    const priorityUpper = priority.toUpperCase();
    
    // NEW API priority enum handling
    if (priorityUpper === 'LOW') {
      return { 
        label: 'Thấp', 
        color: '#10B981', // Green
        emoji: '🟢' 
      };
    }
    
    if (priorityUpper === 'MEDIUM') {
      return { 
        label: 'Trung bình', 
        color: '#F59E0B', // Amber
        emoji: '🟡' 
      };
    }
    
    if (priorityUpper === 'HIGH') {
      return { 
        label: 'Cao', 
        color: '#EF4444', // Red
        emoji: '🔴' 
      };
    }
    
    if (priorityUpper === 'URGENT') {
      return { 
        label: 'Khẩn cấp', 
        color: '#8B5CF6', // Purple
        emoji: '🟣' 
      };
    }
    
    // Fallback for legacy priority values
    const priorityLower = priority.toLowerCase();
    
    // Khẩn cấp - Purple
    if (priorityLower.includes('urgent') || priorityLower.includes('critical') || priorityLower.includes('khẩn cấp')) {
      return { 
        label: priority, 
        color: '#8B5CF6', // Purple
        emoji: '�' 
      };
    }
    
    // Cao - Red
    if (priorityLower.includes('high') || priorityLower.includes('cao') || priorityLower.includes('important') || priorityLower.includes('quan trọng')) {
      return { 
        label: priority, 
        color: '#EF4444', // Red
        emoji: '�' 
      };
    }
    
    // Trung bình - Amber
    if (priorityLower.includes('medium') || priorityLower.includes('normal') || priorityLower.includes('trung bình')) {
      return { 
        label: priority, 
        color: '#F59E0B', // Amber
        emoji: '�' 
      };
    }
    
    // Thấp - Green
    if (priorityLower.includes('low') || priorityLower.includes('thấp')) {
      return { 
        label: priority, 
        color: '#10B981', // Green
        emoji: '🟢' 
      };
    }
    
    // Default fallback
    return { 
      label: priority, 
      color: '#6B7280', // Gray
      emoji: '⚪' 
    };
  };

  // Priority options for the created tab with custom colors
  const priorityOptions = [
    { 
      label: 'Thấp', 
      value: 'low',
      color: '#10B981', // Green - Xanh lá
      lightColor: '#D1FAE5', // Light green background
      emoji: '🟢'
    },
    { 
      label: 'Trung bình', 
      value: 'medium',
      color: '#F59E0B', // Amber - Vàng cam
      lightColor: '#FEF3C7', // Light amber background
      emoji: '🟡'
    },
    { 
      label: 'Cao', 
      value: 'high',
      color: '#EF4444', // Red - Đỏ
      lightColor: '#FEE2E2', // Light red background
      emoji: '🔴'
    },
    { 
      label: 'Khẩn cấp', 
      value: 'urgent',
      color: '#8B5CF6', // Purple - Tím
      lightColor: '#EDE9FE', // Light purple background
      emoji: '🟣'
    },
  ];

  // Assignee type options for assigned tab filter
  const assigneeTypeOptions = [
    {
      label: 'Cá nhân',
      value: 'USER',
      color: '#4CAF50', // Green
      lightColor: '#E8F5E8',
      icon: 'account',
      emoji: '👤'
    },
    {
      label: 'Tổ',
      value: 'UNIT', 
      color: '#FF9800', // Orange
      lightColor: '#FFF3E0',
      icon: 'office-building',
      emoji: '🏢'
    },
    {
      label: 'Đội',
      value: 'TEAM',
      color: '#2196F3', // Blue
      lightColor: '#E3F2FD', 
      icon: 'account-group',
      emoji: '👥'
    }
  ];

  // Helper function to clear created tab filters
  const clearCreatedFilters = () => {
    console.log('🧹 [CLEAR FILTERS] Starting to clear created tab filters');
    console.log('🧹 [CLEAR FILTERS] Current searchText:', searchText);
    console.log('🧹 [CLEAR FILTERS] Current selectedPriorities:', selectedPriorities);
    console.log('🧹 [CLEAR FILTERS] Current dateFromFilter:', dateFromFilter);
    console.log('🧹 [CLEAR FILTERS] Current dateToFilter:', dateToFilter);
    console.log('🧹 [CLEAR FILTERS] Current showDatePicker:', showDatePicker);
    
    setSearchText('');
    setSelectedPriorities([]);
    setDateFromFilter('');
    setDateToFilter('');
    setShowDatePicker(null);
    setDateValidationError('');
    
    console.log('🧹 [CLEAR FILTERS] All filters cleared');
    console.log('🧹 [CLEAR FILTERS] searchText set to empty');
    console.log('🧹 [CLEAR FILTERS] selectedPriorities set to empty array');
    console.log('🧹 [CLEAR FILTERS] dateFromFilter set to empty');
    console.log('🧹 [CLEAR FILTERS] dateToFilter set to empty');
    console.log('🧹 [CLEAR FILTERS] showDatePicker set to null');
    console.log('🧹 [CLEAR FILTERS] dateValidationError set to empty');
  };

  // Helper function to clear assigned tab filters  
  const clearAssignedFilters = () => {
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Starting to clear assigned tab filters');
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Current assignedSearchText:', assignedSearchText);
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Current assignedSelectedPriorities:', assignedSelectedPriorities);
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Current assignedSelectedAssigneeTypes:', assignedSelectedAssigneeTypes);
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Current assignedDateFromFilter:', assignedDateFromFilter);
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Current assignedDateToFilter:', assignedDateToFilter);
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Current assignedShowDatePicker:', assignedShowDatePicker);
    
    setAssignedSearchText('');
    setAssignedSelectedPriorities([]);
    setAssignedSelectedAssigneeTypes([]);
    setAssignedDateFromFilter('');
    setAssignedDateToFilter('');
    setAssignedShowDatePicker(null);
    setAssignedDateValidationError('');
    
    // Clear all assignee selections
    setSelectedUsers([]);
    setSelectedUnits([]);
    setSelectedTeams([]);
    
    console.log('🧹 [CLEAR ASSIGNED FILTERS] Assigned tab filters and selections cleared');
  };

  // Helper function to count completed subtasks recursively
  const countCompletedSubtasksRecursively = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return 0;
    }
    
    let completedCount = 0;
    
    task.subtasks.forEach(subtask => {
      // Check if this subtask is completed
      const subAssignment = subtask.assignments && subtask.assignments.length > 0 ? subtask.assignments[0] : null;
      const isAssignmentCompleted = subAssignment?.status && subAssignment.status.toLowerCase().includes('complet');
      const isTaskCompleted = subtask.status && subtask.status.toLowerCase().includes('complet');
      
      if (isAssignmentCompleted || isTaskCompleted) {
        completedCount++;
      }
      
      // Recursively count completed subtasks of this subtask
      completedCount += countCompletedSubtasksRecursively(subtask);
    });
    
    console.log(`📊 [RECURSIVE COMPLETED] Task ${task.id}: completed_recursive=${completedCount}`);
    return completedCount;
  };

  // Debug helper function to count subtasks recursively
  const countSubtasksRecursively = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return 0;
    }
    
    let count = task.subtasks.length; // Count direct subtasks
    
    // Recursively count subtasks of each subtask
    task.subtasks.forEach(subtask => {
      count += countSubtasksRecursively(subtask);
    });
    
    console.log(`📊 [RECURSIVE COUNT] Task ${task.id}: direct=${task.subtasks.length}, total_recursive=${count}`);
    return count;
  };

  // Debug helper function to print task tree structure
  const printTaskStructure = (task, level = 0) => {
    const indent = '  '.repeat(level);
    console.log(`${indent}📋 Task: ${task.id} - "${task.title}" (level: ${task.hierarchyLevel || 0})`);
    
    if (task.subtasks && task.subtasks.length > 0) {
      console.log(`${indent}  └── Subtasks (${task.subtasks.length}):`);
      task.subtasks.forEach((subtask, index) => {
        printTaskStructure(subtask, level + 2);
      });
    } else {
      console.log(`${indent}  └── No subtasks`);
    }
  };

  // Handle task item press - Show quick view modal
  const handleTaskPress = (task) => {
    console.log('🎯 Task pressed:', task.id);
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  // Navigate to full task detail screen
  const navigateToTaskDetail = (task) => {
    console.log('📍 Navigate to task detail:', task.id);
    setShowTaskModal(false);
    // TODO: Implement navigation to TaskDetailScreen
    // navigation.navigate('TaskDetail', { 
    //   taskId: task.id, 
    //   taskData: task 
    // });
    console.log('🚧 TaskDetailScreen navigation not implemented yet');
  };

  // NEW: Functions for new modals with haptic feedback
  const openFullDetailModal = (task) => {
    console.log('🔍 Opening full detail modal for task:', task.id);
    // Add haptic feedback for better UX (optional)
    // if (Platform.OS === 'ios') {
    //   const { impactAsync, ImpactFeedbackStyle } = require('expo-haptics');
    //   impactAsync(ImpactFeedbackStyle.Light);
    // }
    setSelectedTaskForDetail(task);
    setShowFullDetailModal(true);
  };
  
  const closeFullDetailModal = () => {
    setShowFullDetailModal(false);
    setSelectedTaskForDetail(null);
  };
  
  const openTreeViewModal = (task) => {
    console.log('🌳 Opening tree view modal for task:', task.id);
    // Add haptic feedback for better UX (optional)
    // if (Platform.OS === 'ios') {
    //   const { impactAsync, ImpactFeedbackStyle } = require('expo-haptics');
    //   impactAsync(ImpactFeedbackStyle.Light);
    // }
    setSelectedTaskForTree(task);
    setShowTreeViewModal(true);
  };
  
  const closeTreeViewModal = () => {
    setShowTreeViewModal(false);
    setSelectedTaskForTree(null);
  };
  
  // Helper function để flatten task tree cho tree view
  const flattenTaskTree = (task, level = 0) => {
    const result = [{ ...task, level }];
    
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(subtask => {
        result.push(...flattenTaskTree(subtask, level + 1));
      });
    }
    
    return result;
  };

  // Render task tree visualization for Tree View Modal
  const renderTaskTree = (task, level = 0) => {
    const indentWidth = level * 20;
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    
    return (
      <View key={task.id} style={styles.treeTaskContainer}>
        <View style={[styles.treeTaskItem, { marginLeft: indentWidth }]}>
          {/* Level indicator line */}
          {level > 0 && (
            <View style={[styles.treeLevelLine, { left: -10 }]} />
          )}
          
          {/* Task content */}
          <View style={styles.treeTaskContent}>
            <View style={styles.treeTaskHeader}>
              <View style={styles.treeTaskInfo}>
                {hasSubtasks && (
                  <MaterialCommunityIcons 
                    name="file-tree" 
                    size={16} 
                    color="#666" 
                    style={styles.treeIcon}
                  />
                )}
                <Text style={[styles.treeTaskName, { fontWeight: level === 0 ? 'bold' : 'normal' }]}>
                  {task.task_name}
                </Text>
              </View>
              
              <View style={[styles.treeTaskStatus, 
                task.status === 'completed' ? styles.treeStatusCompleted :
                task.status === 'in_progress' ? styles.treeStatusInProgress : 
                styles.treeStatusPending]}>
                <Text style={styles.treeStatusText}>
                  {task.status === 'completed' ? 'Xong' :
                   task.status === 'in_progress' ? 'Đang làm' : 'Chờ'}
                </Text>
              </View>
            </View>
            
            {task.description && (
              <Text style={styles.treeTaskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}
            
            {task.assigned_users && task.assigned_users.length > 0 && (
              <Text style={styles.treeTaskAssigned}>
                Giao cho: {task.assigned_users.length} người
              </Text>
            )}
          </View>
        </View>
        
        {/* Render subtasks */}
        {hasSubtasks && (
          <View style={styles.treeSubtasks}>
            {task.subtasks.map(subtask => renderTaskTree(subtask, level + 1))}
          </View>
        )}
      </View>
    );
  };

  // Assigned tab validation function
  const validateAssignedDateRange = (fromDate, toDate) => {
    console.log('📅 [ASSIGNED VALIDATION] Validating date range - from:', fromDate, 'to:', toDate);
    
    if (!fromDate || !toDate) {
      setAssignedDateValidationError('');
      return true;
    }
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (to < from) {
      const errorMsg = 'Ngày kết thúc phải bằng hoặc lớn hơn ngày bắt đầu';
      console.log('📅 [ASSIGNED VALIDATION] Error:', errorMsg);
      setAssignedDateValidationError(errorMsg);
      return false;
    }
    
    console.log('📅 [ASSIGNED VALIDATION] Date range is valid');
    setAssignedDateValidationError('');
    return true;
  };

  // Helper function to format date for display - following SearchScheduleScreen pattern
  const formatDateForDisplay = (dateString) => {
    console.log('📅 [FORMAT DATE] Input dateString:', dateString);
    console.log('📅 [FORMAT DATE] Input type:', typeof dateString);
    
    if (!dateString) {
      console.log('📅 [FORMAT DATE] No dateString provided, returning empty string');
      return '';
    }
    
    const date = new Date(dateString);
    console.log('📅 [FORMAT DATE] Created date object:', date);
    console.log('📅 [FORMAT DATE] Date is valid:', !isNaN(date.getTime()));
    
    if (isNaN(date.getTime())) {
      console.log('📅 [FORMAT DATE] Invalid date, returning empty string');
      return '';
    }
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    
    console.log('📅 [FORMAT DATE] Extracted day:', day);
    console.log('📅 [FORMAT DATE] Extracted month:', month);
    console.log('📅 [FORMAT DATE] Extracted year:', year);
    
    const formattedResult = `${day}/${month}/${year}`;
    console.log('📅 [FORMAT DATE] Final formatted result:', formattedResult);
    
    return formattedResult;
  };

  // Date picker handlers - integrated into filter modal
  const showDateFromPicker = () => {
    console.log('🗓️ [DATE PICKER] Showing date from picker in modal');
    console.log('🗓️ [DATE PICKER] Current dateFromFilter state:', dateFromFilter);
    console.log('🗓️ [DATE PICKER] Current showDatePicker state:', showDatePicker);
    
    setShowDatePicker('from');
    setIsDatePickerFocused(true); // Highlight date picker section
    console.log('🗓️ [DATE PICKER] Date picker set to show FROM picker');
    
    // Auto-scroll to date picker section after a short delay
    setTimeout(() => {
      if (filterModalScrollRef.current) {
        filterModalScrollRef.current.scrollToEnd({ animated: true });
        console.log('🗓️ [DATE PICKER] Auto-scrolled to date picker section');
      }
    }, 100);
    
    // Remove highlight after animation
    setTimeout(() => {
      setIsDatePickerFocused(false);
    }, 2000);
  };

  const showDateToPicker = () => {
    console.log('🗓️ [DATE PICKER] Showing date to picker in modal');
    console.log('🗓️ [DATE PICKER] Current dateToFilter state:', dateToFilter);
    console.log('🗓️ [DATE PICKER] Current showDatePicker state:', showDatePicker);
    
    setShowDatePicker('to');
    setIsDatePickerFocused(true); // Highlight date picker section
    console.log('🗓️ [DATE PICKER] Date picker set to show TO picker');
    
    // Auto-scroll to date picker section after a short delay
    setTimeout(() => {
      if (filterModalScrollRef.current) {
        filterModalScrollRef.current.scrollToEnd({ animated: true });
        console.log('🗓️ [DATE PICKER] Auto-scrolled to date picker section');
      }
    }, 100);
    
    // Remove highlight after animation
    setTimeout(() => {
      setIsDatePickerFocused(false);
    }, 2000);
  };

  const hideDatePicker = () => {
    console.log('🗓️ [DATE PICKER] Hiding date picker in modal');
    console.log('🗓️ [DATE PICKER] Current showDatePicker state:', showDatePicker);
    setShowDatePicker(null);
    setIsDatePickerFocused(false); // Remove highlight when hiding
    console.log('🗓️ [DATE PICKER] Date picker hidden');
  };

  const handleDateChange = (event, selectedDate) => {
    console.log('🗓️ [DATE PICKER] Date changed event:', event);
    console.log('🗓️ [DATE PICKER] Selected date:', selectedDate);
    console.log('🗓️ [DATE PICKER] Current showDatePicker type:', showDatePicker);
    
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }
    
    if (selectedDate) {
      // Format date using JavaScript date methods
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log('🗓️ [DATE PICKER] Formatted date:', formattedDate);
      
      if (showDatePicker === 'from') {
        console.log('🗓️ [DATE PICKER] Setting FROM date:', formattedDate);
        setDateFromFilter(formattedDate);
        // Validate with existing TO date
        validateDateRange(formattedDate, dateToFilter);
      } else if (showDatePicker === 'to') {
        console.log('🗓️ [DATE PICKER] Setting TO date:', formattedDate);
        setDateToFilter(formattedDate);
        // Validate with existing FROM date
        validateDateRange(dateFromFilter, formattedDate);
      }
      
      if (Platform.OS === 'ios') {
        // On iOS, don't hide immediately to allow for better UX
        console.log('🗓️ [DATE PICKER] iOS: Date set, keeping picker open');
      }
    }
  };

  const filters = [
    { label: 'Chưa hoàn thành', value: 'incomplete' },
    { label: 'Quá hạn', value: 'overdue' },
    { label: 'Công việc khẩn', value: 'urgent' },
    { label: 'Đã hoàn thành', value: 'completed' },
  ];

  // Helper function to reset all states when switching tabs
  const resetTabStates = () => {
    console.log('🧹 Resetting all tab states...');
    
    // Clear main data
    setJobs([]);
    
    // Clear UI states
    setExpandedJobs(new Set());
    setExpandedTasks(new Set());
    setIsLoading(false);
    setRefreshing(false);
    
    // Clear assignee selection states
    setShowAssigneeSelectionModal(false);
    setCurrentAssigneeType(null);
    setAssigneeData([]);
    setSelectedAssignees([]);
    setIsLoadingAssignees(false);
    setAssigneeSearchText('');
    setShowInlineAssigneeSelection(false);
    
    // Clear selected assignees for all types
    setSelectedUsers([]);
    setSelectedUnits([]);
    setSelectedTeams([]);
    
    // Cancel any ongoing fetch requests
    currentFetchRef.current = null;
    
    console.log('🧹 Tab states reset completed');
  };

  useEffect(() => {
    console.log(`🔄 [TAB SWITCH] Selected job type changed to: ${selectedJobType}`);
    console.log(`🔄 [TAB SWITCH] Previous jobs state length:`, jobs?.length || 0);
    console.log(`🔄 [TAB SWITCH] About to reset all states and fetch new data`);
    
    // Reset all states when switching tabs
    resetTabStates();
    
    // Clear filters when switching tabs
    if (selectedJobType === 'created' || selectedJobType === 'received') {
      console.log(`🔄 [TAB SWITCH] Switching to '${selectedJobType}' tab - calling clearCreatedFilters()`);
      clearCreatedFilters();
    } else if (selectedJobType === 'assigned') {
      console.log(`🔄 [TAB SWITCH] Switching to 'assigned' tab - calling clearAssignedFilters()`);
      clearAssignedFilters();
    } else {
      console.log(`🔄 [TAB SWITCH] Switching to '${selectedJobType}' tab - setting selectedFilter to 'incomplete'`);
      setSelectedFilter('incomplete');
    }
    
    console.log(`🔄 [TAB SWITCH] About to fetch jobs for type: ${selectedJobType}`);
    fetchJobsByType(selectedJobType);
  }, [selectedJobType]);

  // Fetch counts for all tabs on component mount
  useEffect(() => {
    console.log('🔄 Fetching counts for all job types on mount');
    const fetchAllCounts = async () => {
      const jobTypes = ['created', 'assigned', 'received'];
      for (const type of jobTypes) {
        if (type !== selectedJobType) {
          try {
            const response = await httpApiClient.get(`tasks/my?type=${type}`);
            if (response.status >= 200 && response.status < 300) {
              const responseData = await response.json();
              let totalCount = 0;
              
              if (Array.isArray(responseData)) {
                totalCount = responseData.length;
              } else if (responseData.data && Array.isArray(responseData.data)) {
                totalCount = responseData.totalCount || responseData.total || responseData.data.length;
              } else if (responseData.tasks && Array.isArray(responseData.tasks)) {
                totalCount = responseData.totalCount || responseData.total || responseData.tasks.length;
              } else if (responseData.jobs && Array.isArray(responseData.jobs)) {
                totalCount = responseData.totalCount || responseData.total || responseData.jobs.length;
              } else if (responseData.result && Array.isArray(responseData.result)) {
                totalCount = responseData.totalCount || responseData.total || responseData.result.length;
              }
              
              setJobCounts(prevCounts => ({
                ...prevCounts,
                [type]: totalCount
              }));
              console.log(`📊 Background count for ${type}: ${totalCount}`);
            }
          } catch (error) {
            console.error(`❌ Failed to fetch count for ${type}:`, error.message);
          }
        }
      }
    };
    
    fetchAllCounts();
  }, []); // Run only once on mount

  // Sync assignedSelectedAssigneeTypes with actual selections
  useEffect(() => {
    const currentTypes = [];
    
    if (selectedUsers.length > 0) {
      currentTypes.push('USER');
    }
    if (selectedUnits.length > 0) {
      currentTypes.push('UNIT');
    }
    if (selectedTeams.length > 0) {
      currentTypes.push('TEAM');
    }
    
    // Only update if there's a difference to avoid infinite loops
    const currentTypesString = currentTypes.sort().join(',');
    const existingTypesString = assignedSelectedAssigneeTypes.sort().join(',');
    
    if (currentTypesString !== existingTypesString) {
      console.log('🔄 Syncing assignedSelectedAssigneeTypes with actual selections');
      console.log('🔄 Current selections - Users:', selectedUsers.length, 'Units:', selectedUnits.length, 'Teams:', selectedTeams.length);
      console.log('🔄 New assignee types:', currentTypes);
      setAssignedSelectedAssigneeTypes(currentTypes);
    }
  }, [selectedUsers, selectedUnits, selectedTeams, assignedSelectedAssigneeTypes]);

  const getFilteredJobs = () => {
    console.log('🔍 Getting filtered jobs...');
    console.log('🔍 Current jobs state:', jobs);
    console.log('🔍 Jobs type:', typeof jobs);
    console.log('🔍 Jobs is array:', Array.isArray(jobs));
    console.log('🔍 Jobs length:', jobs ? jobs.length : 'undefined');
    console.log('🔍 Selected job type:', selectedJobType);
    console.log('🔍 Selected filter:', selectedFilter);
    
    if (!jobs || !Array.isArray(jobs)) {
      console.log('🔍 ❌ Jobs is not an array, returning empty array');
      return [];
    }
    
    let filtered = [...jobs];
    console.log('🔍 Initial filtered length:', filtered.length);
    
    // For "created" and "received" tabs, use new filter system
    if (selectedJobType === 'created' || selectedJobType === 'received') {
      // Apply search filter
      if (searchText && searchText.trim()) {
        filtered = filtered.filter(job => 
          (job.title && job.title.toLowerCase().includes(searchText.toLowerCase())) ||
          (job.description && job.description.toLowerCase().includes(searchText.toLowerCase())) ||
          (job.content && job.content.toLowerCase().includes(searchText.toLowerCase()))
        );
        console.log('🔍 After search filter:', filtered.length);
      }
      
      // Apply priority filter (multi-select)
      if (selectedPriorities && selectedPriorities.length > 0) {
        filtered = filtered.filter(job => {
          if (!job.priority) return false;
          
          const priority = job.priority.toLowerCase();
          return selectedPriorities.some(selectedPriority => {
            switch (selectedPriority) {
              case 'low':
                return priority.includes('low') || priority.includes('thấp');
              case 'medium':
                return priority.includes('medium') || priority.includes('trung bình');
              case 'high':
                return priority.includes('high') || priority.includes('cao');
              case 'urgent':
                return priority.includes('urgent') || priority.includes('khẩn') || priority.includes('critical');
              default:
                return false;
            }
          });
        });
        console.log('🔍 After priority filter (multi-select):', filtered.length, 'selected priorities:', selectedPriorities);
      }
      
      // Apply date range filter
      if (dateFromFilter || dateToFilter) {
        console.log('📅 [DATE FILTER] Starting date range filtering');
        console.log('📅 [DATE FILTER] dateFromFilter:', dateFromFilter);
        console.log('📅 [DATE FILTER] dateToFilter:', dateToFilter);
        console.log('📅 [DATE FILTER] Jobs to filter count:', filtered.length);
        
        filtered = filtered.filter((job, index) => {
          console.log(`📅 [DATE FILTER] Processing job ${index} (ID: ${job.id})`);
          
          // For "received" tab, use assignment date if available, otherwise use creation date
          const dateToCheck = selectedJobType === 'received' 
            ? (job.assignments && job.assignments.length > 0 ? job.assignments[0].assignedAt : job.createdAt)
            : job.createdAt;
          
          console.log(`📅 [DATE FILTER] Job ${index} using date:`, dateToCheck);
          
          if (!dateToCheck) {
            console.log(`📅 [DATE FILTER] Job ${index} has no date to check, excluding`);
            return false;
          }
          
          const jobDate = moment(dateToCheck);
          console.log(`📅 [DATE FILTER] Job ${index} parsed date:`, jobDate.format('YYYY-MM-DD'));
          console.log(`📅 [DATE FILTER] Job ${index} date is valid:`, jobDate.isValid());
          
          if (!jobDate.isValid()) {
            console.log(`📅 [DATE FILTER] Job ${index} has invalid date, excluding`);
            return false;
          }
          
          let passesFilter = true;
          
          if (dateFromFilter) {
            const fromMoment = moment(dateFromFilter);
            console.log(`📅 [DATE FILTER] Job ${index} - From filter date:`, fromMoment.format('YYYY-MM-DD'));
            const fromCheck = jobDate.isSameOrAfter(fromMoment, 'day');
            console.log(`📅 [DATE FILTER] Job ${index} - From check (${jobDate.format('YYYY-MM-DD')} >= ${fromMoment.format('YYYY-MM-DD')}):`, fromCheck);
            passesFilter = passesFilter && fromCheck;
          }
          
          if (dateToFilter) {
            const toMoment = moment(dateToFilter);
            console.log(`📅 [DATE FILTER] Job ${index} - To filter date:`, toMoment.format('YYYY-MM-DD'));
            const toCheck = jobDate.isSameOrBefore(toMoment, 'day');
            console.log(`📅 [DATE FILTER] Job ${index} - To check (${jobDate.format('YYYY-MM-DD')} <= ${toMoment.format('YYYY-MM-DD')}):`, toCheck);
            passesFilter = passesFilter && toCheck;
          }
          
          console.log(`📅 [DATE FILTER] Job ${index} - Final passes filter:`, passesFilter);
          return passesFilter;
        });
        console.log('📅 [DATE FILTER] After date range filter:', filtered.length);
      }
    } else if (selectedJobType === 'assigned') {
      // Apply assigned tab search filter
      if (assignedSearchText && assignedSearchText.trim()) {
        filtered = filtered.filter(job => 
          (job.title && job.title.toLowerCase().includes(assignedSearchText.toLowerCase())) ||
          (job.description && job.description.toLowerCase().includes(assignedSearchText.toLowerCase())) ||
          (job.content && job.content.toLowerCase().includes(assignedSearchText.toLowerCase()))
        );
        console.log('🔍 [ASSIGNED] After search filter:', filtered.length);
      }
      
      // Apply assigned tab priority filter (multi-select)
      if (assignedSelectedPriorities && assignedSelectedPriorities.length > 0) {
        filtered = filtered.filter(job => {
          if (!job.priority) return false;
          
          const priority = job.priority.toLowerCase();
          return assignedSelectedPriorities.some(selectedPriority => {
            switch (selectedPriority) {
              case 'low':
                return priority.includes('low') || priority.includes('thấp');
              case 'medium':
                return priority.includes('medium') || priority.includes('trung bình');
              case 'high':
                return priority.includes('high') || priority.includes('cao');
              case 'urgent':
                return priority.includes('urgent') || priority.includes('khẩn') || priority.includes('critical');
              default:
                return false;
            }
          });
        });
        console.log('🔍 [ASSIGNED] After priority filter (multi-select):', filtered.length, 'selected priorities:', assignedSelectedPriorities);
      }
      
      // Apply assigned tab date range filter using assignment date
      if (assignedDateFromFilter || assignedDateToFilter) {
        console.log('📅 [ASSIGNED DATE FILTER] Starting date range filtering');
        console.log('📅 [ASSIGNED DATE FILTER] assignedDateFromFilter:', assignedDateFromFilter);
        console.log('📅 [ASSIGNED DATE FILTER] assignedDateToFilter:', assignedDateToFilter);
        console.log('📅 [ASSIGNED DATE FILTER] Jobs to filter count:', filtered.length);
        
        filtered = filtered.filter((job, index) => {
          console.log(`📅 [ASSIGNED DATE FILTER] Processing job ${index} (ID: ${job.id})`);
          
          // Use assignment date from the first assignment
          const assignment = job.assignments && job.assignments.length > 0 ? job.assignments[0] : null;
          const dateToCheck = assignment?.assignedAt || job.createdAt;
          console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} assignedAt:`, assignment?.assignedAt);
          console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} using date:`, dateToCheck);
          
          if (!dateToCheck) {
            console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} has no date to check, excluding`);
            return false;
          }
          
          const jobDate = moment(dateToCheck);
          console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} parsed date:`, jobDate.format('YYYY-MM-DD'));
          console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} date is valid:`, jobDate.isValid());
          
          if (!jobDate.isValid()) {
            console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} has invalid date, excluding`);
            return false;
          }
          
          let passesFilter = true;
          
          if (assignedDateFromFilter) {
            const fromMoment = moment(assignedDateFromFilter);
            console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} - From filter date:`, fromMoment.format('YYYY-MM-DD'));
            const fromCheck = jobDate.isSameOrAfter(fromMoment, 'day');
            console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} - From check (${jobDate.format('YYYY-MM-DD')} >= ${fromMoment.format('YYYY-MM-DD')}):`, fromCheck);
            passesFilter = passesFilter && fromCheck;
          }
          
          if (assignedDateToFilter) {
            const toMoment = moment(assignedDateToFilter);
            console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} - To filter date:`, toMoment.format('YYYY-MM-DD'));
            const toCheck = jobDate.isSameOrBefore(toMoment, 'day');
            console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} - To check (${jobDate.format('YYYY-MM-DD')} <= ${toMoment.format('YYYY-MM-DD')}):`, toCheck);
            passesFilter = passesFilter && toCheck;
          }
          
          console.log(`📅 [ASSIGNED DATE FILTER] Job ${index} - Final passes filter:`, passesFilter);
          return passesFilter;
        });
        console.log('📅 [ASSIGNED DATE FILTER] After date range filter:', filtered.length);
      }
      
      // Apply assigned tab assignee type filter
      if (assignedSelectedAssigneeTypes && assignedSelectedAssigneeTypes.length > 0) {
        console.log('👥 [ASSIGNEE TYPE FILTER] Starting assignee type filtering');
        console.log('👥 [ASSIGNEE TYPE FILTER] Selected types:', assignedSelectedAssigneeTypes);
        console.log('👥 [ASSIGNEE TYPE FILTER] Jobs to filter count:', filtered.length);
        
        filtered = filtered.filter((job, index) => {
          console.log(`👥 [ASSIGNEE TYPE FILTER] Processing job ${index} (ID: ${job.id})`);
          console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} assignments:`, job.assignments);
          
          if (!job.assignments || job.assignments.length === 0) {
            console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} has no assignments, excluding`);
            return false;
          }
          
          // Check if any assignment matches the selected assignee types
          const hasMatchingAssigneeType = job.assignments.some(assignment => {
            console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} - Assignment:`, assignment);
            console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} - Assignment recipientType:`, assignment.recipientType);
            
            if (!assignment.recipientType) {
              console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} - Assignment has no recipientType`);
              return false;
            }
            
            const recipientType = assignment.recipientType.toUpperCase();
            const isMatching = assignedSelectedAssigneeTypes.includes(recipientType);
            console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} - recipientType ${recipientType} matches filter:`, isMatching);
            
            return isMatching;
          });
          
          console.log(`👥 [ASSIGNEE TYPE FILTER] Job ${index} - Has matching assignee type:`, hasMatchingAssigneeType);
          return hasMatchingAssigneeType;
        });
        console.log('👥 [ASSIGNEE TYPE FILTER] After assignee type filter:', filtered.length);
      }
    } else {
      // For other tabs, use the original filter system
      if (selectedFilter === 'incomplete') {
        // Lọc công việc chưa hoàn thành
        filtered = filtered.filter(job => {
          const taskStatus = job.status?.toLowerCase() || '';
          const isCompleted = taskStatus.includes('complet') || taskStatus.includes('done') || taskStatus.includes('finished') || taskStatus.includes('hoàn thành');
          return !isCompleted;
        });
        console.log('🔍 After incomplete filter:', filtered.length);
      } else if (selectedFilter === 'overdue') {
        // Lọc công việc quá hạn
        filtered = filtered.filter(job => {
          const assignment = job.assignments && job.assignments.length > 0 ? job.assignments[0] : null;
          if (!assignment?.dueAt) return false;
          
          const isOverdue = moment(assignment.dueAt).isBefore(moment());
          const isCompleted = assignment.status?.toLowerCase().includes('complet') || false;
          return isOverdue && !isCompleted;
        });
        console.log('🔍 After overdue filter:', filtered.length);
      } else if (selectedFilter === 'urgent') {
        // Lọc công việc khẩn cấp  
        filtered = filtered.filter(job => 
          job.priority && (
            job.priority.toLowerCase().includes('urgent') ||
            job.priority.toLowerCase().includes('high') ||
            job.priority.toLowerCase().includes('critical') ||
            job.priority.toLowerCase().includes('cao') ||
            job.priority.toLowerCase().includes('khẩn')
          )
        );
        console.log('🔍 After urgent filter:', filtered.length);
      } else if (selectedFilter === 'completed') {
        // Lọc công việc đã hoàn thành
        filtered = filtered.filter(job => {
          const taskStatus = job.status?.toLowerCase() || '';
          return taskStatus.includes('complet') || taskStatus.includes('done') || taskStatus.includes('finished') || taskStatus.includes('hoàn thành');
        });
        console.log('🔍 After completed filter:', filtered.length);
      }
    }
    
    console.log('🔍 Final filtered jobs:', filtered);
    console.log('🔍 Final filtered jobs length:', filtered.length);
    return filtered;
  };

  const onRefresh = async () => {
    console.log('🔄 [REFRESH] Starting refresh for tab:', selectedJobType);
    setRefreshing(true);
    
    // Clear current data to show fresh loading state
    setJobs([]);
    
    try {
      await fetchJobsByType(selectedJobType);
    } catch (error) {
      console.error('🔄 [REFRESH] Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleTaskExpansion = (taskId) => {
    const newExpandedTasks = new Set(expandedTasks);
    if (newExpandedTasks.has(taskId)) {
      newExpandedTasks.delete(taskId);
    } else {
      newExpandedTasks.add(taskId);
    }
    setExpandedTasks(newExpandedTasks);
  };

  const toggleJobExpansion = (jobId) => {
    const newExpandedJobs = new Set(expandedJobs);
    if (newExpandedJobs.has(jobId)) {
      newExpandedJobs.delete(jobId);
    } else {
      newExpandedJobs.add(jobId);
    }
    setExpandedJobs(newExpandedJobs);
  };

  // Helper function to get display name with format: name - team name
  const getDisplayName = (user) => {
    if (!user) return '';
    
    console.log('🔍 Getting display name for user:', user);
    
    // Get name from the new API structure
    const name = user.name || 
                `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                user.username || user.email?.split('@')[0] || '';
    
    // Get team/department name from new structure
    const teamName = user.teamName || user.unitName || user.department || 
                    user.departmentName || user.dept || user.team || 
                    user.division || '';
    
    console.log('🔍 Name:', name);
    console.log('🔍 Team name:', teamName);
    
    // Format: name - team name
    if (name && teamName) {
      return `${name} - ${teamName}`;
    } else if (name) {
      return name;
    } else if (teamName) {
      return `User - ${teamName}`;
    }
    
    return 'User';
  };

  // Helper function to get full user name (fallback)
  const getFullUserName = (user) => {
    if (!user) return '';
    return user.name || 
           `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
           user.username || user.displayName || user.email || 'User';
  };

  // Helper function to extract all user fields
  const extractUserInfo = (user) => {
    if (!user) return {
      name: 'Chưa có thông tin',
      displayName: 'Chưa có thông tin',
      email: '',
      phone: '',
      department: '',
      position: '',
      avatar: '',
      username: '',
      id: '',
      fullUser: null
    };
    
    console.log('📝 Extracting user info for:', user);
    
    const displayName = getDisplayName(user);
    const fullName = getFullUserName(user);
    
    const result = {
      name: fullName,
      displayName: displayName,
      email: user.email || user.emailAddress || '',
      phone: user.phone || user.phoneNumber || user.mobile || '',
      department: user.teamName || user.unitName || user.department || user.departmentName || user.dept || user.team || '',
      position: user.roleName || user.position || user.title || user.jobTitle || user.role || '',
      avatar: user.avatar || user.profilePicture || user.photo || user.image || '',
      username: user.username || user.email?.split('@')[0] || '',
      id: user.id || user.userId || '',
      fullUser: user
    };
    
    console.log('📝 Extracted user info result:', result);
    return result;
  };

  const renderSubtask = (subtask, level = 1, keyPrefix = '') => {
    // Use helper functions for dynamic colors
    const priority = getPriorityInfo(subtask.priority);
    const taskStatus = getStatusInfo(subtask.status, 'task');
    
    // Get assignment status if available - use helper function
    const assignment = subtask.assignments && subtask.assignments.length > 0 ? subtask.assignments[0] : null;
    const assignmentStatus = assignment ? getStatusInfo(assignment.status, 'assignment') : null;
    
    const hasDeadline = assignment?.dueAt && assignment.dueAt !== '';
    const isOverdue = hasDeadline && moment(assignment.dueAt).isBefore(moment()) && 
                     !(assignment.status && assignment.status.toLowerCase().includes('complet'));
    const hasSubtasks = subtask.subtasks && subtask.subtasks.length > 0;
    const isExpanded = expandedTasks.has(subtask.id);
    const uniqueKey = keyPrefix || `subtask-${subtask.id}-${level}`;
    const hierarchyLevel = subtask.hierarchyLevel || level;

    // Calculate indentation based on hierarchy level
    const indentationLevel = Math.max(hierarchyLevel - 1, 0);
    const leftMargin = indentationLevel * 20; // 20px per level

    return (
      <View key={uniqueKey} style={[styles.subtaskContainer, { marginLeft: leftMargin }]}>
        <TouchableOpacity 
          style={[styles.subtaskCard, isOverdue && styles.overdueCard]} 
          activeOpacity={0.8}
          onPress={() => handleTaskPress(subtask)}
        >
          {/* Priority indicator with hierarchy level indication */}
          <View style={[styles.priorityIndicator, { backgroundColor: priority.color }]}>
            {hierarchyLevel > 1 && (
              <View style={styles.hierarchyLevelIndicator}>
                <Text style={styles.hierarchyLevelText}>{hierarchyLevel}</Text>
              </View>
            )}
          </View>
          
          {/* Subtask Header - TASK INFORMATION */}
          <View style={styles.subtaskHeader}>
            <View style={styles.subtaskHeaderTopRow}>
              <View style={styles.subtaskHeaderLeft}>
                {hasSubtasks && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => toggleTaskExpansion(subtask.id)}
                  >
                    <MaterialCommunityIcons 
                      name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                      size={14} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                )}
                {/* Show hierarchy indicators */}
                {hierarchyLevel > 0 && (
                  <View style={styles.hierarchyIndicators}>
                    {Array.from({ length: hierarchyLevel }, (_, i) => (
                      <MaterialCommunityIcons 
                        key={i}
                        name={i === hierarchyLevel - 1 ? "subdirectory-arrow-right" : "minus"} 
                        size={10} 
                        color="#9E9E9E" 
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                )}
                <View style={styles.subtaskIdContainer}>
                  <Text style={styles.subtaskId}>#{subtask.id}</Text>
                </View>
                <View style={styles.subtaskTypeContainer}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={10} color="#D97706" />
                  <Text style={styles.subtaskTypeText}>SUBTASK</Text>
                </View>
                {hierarchyLevel > 0 && (
                  <Text style={styles.hierarchyLevelBadge}>L{hierarchyLevel}</Text>
                )}
              </View>
              
              <View style={styles.subtaskHeaderRight}>
                <View style={[styles.subtaskPriorityBadge, { backgroundColor: priority.color }]}>
                  <Text style={styles.subtaskPriorityEmoji}>{priority.emoji}</Text>
                  <Text style={styles.subtaskPriorityLabel}>{priority.label}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.subtaskHeaderBottomRow}>
              {/* Task Status */}
              <View style={[styles.subtaskStatusBadge, { backgroundColor: taskStatus.color }]}>
                <MaterialCommunityIcons name={taskStatus.icon} size={10} color="white" />
                <Text style={styles.subtaskStatusText}>{taskStatus.label}</Text>
              </View>
              
              {/* Task Creator Info */}
              <View style={styles.subtaskCreatorContainer}>
                <MaterialCommunityIcons name="account-plus" size={10} color="#9CA3AF" />
                <Text style={styles.subtaskCreatorText}>
                  {extractUserInfo(subtask.createdByUser).displayName || 'Hệ thống'}
                </Text>
              </View>
            </View>
          </View>

          {/* Subtask Content Section */}
          <View style={styles.subtaskContentSection}>
            <Text style={styles.subtaskTitle} numberOfLines={2}>
              {subtask.title || 'Không có tiêu đề'}
            </Text>
            
            {subtask.content && (
              <Text style={styles.subtaskDescription} numberOfLines={2}>
                {subtask.content}
              </Text>
            )}
          </View>

          {/* Subtask Footer - ASSIGNMENT INFORMATION */}
          <View style={styles.subtaskFooter}>
            {assignment ? (
              <>
                {/* Assignment Header */}
                <View style={styles.subtaskAssignmentHeader}>
                  <View style={styles.subtaskAssignmentHeaderLeft}>
                    <MaterialCommunityIcons name="account-group" size={12} color="#6B7280" />
                    <Text style={styles.subtaskAssignmentLabel}>ASSIGNMENT</Text>
                  </View>
                  <View style={styles.subtaskAssignmentHeaderRight}>
                    {assignmentStatus && (
                      <View style={[styles.subtaskAssignmentStatusBadge, { backgroundColor: assignmentStatus.color }]}>
                        <MaterialCommunityIcons name={assignmentStatus.icon} size={8} color="white" />
                        <Text style={styles.subtaskAssignmentStatusText}>{assignmentStatus.label}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Assignment Details */}
                <View style={styles.subtaskAssignmentDetails}>
                  <View style={styles.subtaskRoleSection}>
                    {/* User Avatar */}
                    <View style={styles.subtaskUserAvatarContainer}>
                      {(() => {
                        const user = assignment?.recipientUser || subtask.createdByUser;
                        const userInfo = extractUserInfo(user);
                        
                        return (
                          <View style={styles.subtaskUserAvatarWrapper}>
                            {userInfo.avatar ? (
                              <Image
                                source={{ uri: userInfo.avatar }}
                                style={styles.subtaskUserAvatar}
                                onError={() => {
                                  console.log('Avatar failed to load for subtask user:', userInfo.name);
                                }}
                              />
                            ) : (
                              <View style={styles.subtaskUserAvatarFallback}>
                                <MaterialCommunityIcons 
                                  name="account" 
                                  size={14} 
                                  color="#9CA3AF" 
                                />
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                    
                    {/* User Info */}
                    <View style={styles.subtaskRoleTextContainer}>
                      <Text style={styles.subtaskRoleLabel}>
                        {assignment?.recipientUser ? 'Được giao' : 'Người tạo'}
                      </Text>
                      <Text style={[styles.subtaskRoleName, { color: '#6B7280' }]} numberOfLines={1}>
                        {(() => {
                          const user = assignment?.recipientUser || subtask.createdByUser;
                          const userInfo = extractUserInfo(user);
                          return userInfo.displayName || userInfo.name || 'Chưa có thông tin';
                        })()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.subtaskTimeSection}>
                    {hasDeadline ? (
                      <View style={styles.subtaskDeadlineContainer}>
                        <MaterialCommunityIcons 
                          name={isOverdue ? "alert-circle" : "calendar-clock"} 
                          size={12} 
                          color={isOverdue ? '#EF4444' : '#F59E0B'} 
                        />
                        <View style={styles.subtaskDeadlineTextContainer}>
                          <Text style={styles.subtaskDeadlineLabel}>
                            {isOverdue ? 'Quá hạn' : 'Hạn cuối'}
                          </Text>
                          <Text style={[
                            styles.subtaskDeadlineText, 
                            isOverdue && styles.overdueText
                          ]}>
                            {moment(assignment.dueAt).format('DD/MM HH:mm')}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.subtaskCreationInfo}>
                        <MaterialCommunityIcons name="calendar-plus" size={12} color="#9CA3AF" />
                        <View style={styles.subtaskCreatedTextContainer}>
                          <Text style={styles.subtaskCreatedLabel}>Giao lúc</Text>
                          <Text style={styles.subtaskCreatedTime}>
                            {assignment.assignedAt ? moment(assignment.assignedAt).format('DD/MM HH:mm') : 'Chưa xác định'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </>
            ) : (
              /* No Assignment - Show Task Creation Info */
              <View style={styles.subtaskNoAssignmentContainer}>
                <View style={styles.subtaskNoAssignmentHeader}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={10} color="#9CA3AF" />
                  <Text style={styles.subtaskNoAssignmentLabel}>CHƯA ĐƯỢC GIAO</Text>
                </View>
                <View style={styles.subtaskCreationInfo}>
                  <MaterialCommunityIcons name="clock-outline" size={10} color="#9CA3AF" />
                  <View style={styles.subtaskCreatedTextContainer}>
                    <Text style={styles.subtaskCreatedLabel}>Tạo lúc</Text>
                    <Text style={styles.subtaskCreatedTime}>
                      {moment(subtask.createdAt).format('DD/MM HH:mm')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Render nested subtasks if expanded - RECURSIVE TREE RENDERING */}
        {hasSubtasks && isExpanded && (
          <View style={styles.nestedSubtasks}>
            {(() => {
              console.log(`🔍 [SUBTASK DEBUG] Rendering nested subtasks for task ${subtask.id}:`);
              console.log(`🔍 [SUBTASK DEBUG] Has subtasks: ${hasSubtasks}`);
              console.log(`🔍 [SUBTASK DEBUG] Is expanded: ${isExpanded}`);
              console.log(`🔍 [SUBTASK DEBUG] Subtasks array:`, subtask.subtasks);
              console.log(`🔍 [SUBTASK DEBUG] Subtasks length:`, subtask.subtasks?.length || 0);
              console.log(`🔍 [SUBTASK DEBUG] Current hierarchy level: ${hierarchyLevel}`);
              console.log(`🔍 [SUBTASK DEBUG] Next level will be: ${hierarchyLevel + 1}`);
              
              return subtask.subtasks.map((nestedSubtask, index) => {
                console.log(`🔍 [SUBTASK DEBUG] Rendering nested subtask ${index}:`, nestedSubtask.id, nestedSubtask.title, `level: ${nestedSubtask.hierarchyLevel || (hierarchyLevel + 1)}`);
                
                // Recursive call with increased hierarchy level
                return renderSubtask(
                  nestedSubtask, 
                  nestedSubtask.hierarchyLevel || (hierarchyLevel + 1), 
                  `${subtask.id}-${nestedSubtask.id}-${index}`
                );
              });
            })()}
          </View>
        )}
      </View>
    );

    return (
      <View key={uniqueKey} style={[styles.subtaskContainer, { marginLeft: leftMargin }]}>
        <TouchableOpacity 
          style={[styles.subtaskCard, isOverdue && styles.overdueCard]} 
          activeOpacity={0.8}
          onPress={() => {
            console.log('Subtask pressed:', subtask.id, 'hierarchyLevel:', hierarchyLevel);
          }}
        >
          {/* Priority indicator with hierarchy level indication */}
          <View style={[styles.priorityIndicator, { backgroundColor: priority.color }]}>
            {hierarchyLevel > 1 && (
              <View style={styles.hierarchyLevelIndicator}>
                <Text style={styles.hierarchyLevelText}>{hierarchyLevel}</Text>
              </View>
            )}
          </View>
          
          {/* Subtask Header - TASK INFORMATION */}
          <View style={styles.subtaskHeader}>
            <View style={styles.subtaskHeaderTopRow}>
              <View style={styles.subtaskHeaderLeft}>
                {hasSubtasks && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => toggleTaskExpansion(subtask.id)}
                  >
                    <MaterialCommunityIcons 
                      name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                      size={14} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                )}
                {/* Show hierarchy indicators */}
                {hierarchyLevel > 0 && (
                  <View style={styles.hierarchyIndicators}>
                    {Array.from({ length: hierarchyLevel }, (_, i) => (
                      <MaterialCommunityIcons 
                        key={i}
                        name={i === hierarchyLevel - 1 ? "subdirectory-arrow-right" : "minus"} 
                        size={10} 
                        color="#9E9E9E" 
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                )}
                <View style={styles.subtaskIdContainer}>
                  <Text style={styles.subtaskId}>#{subtask.id}</Text>
                </View>
                <View style={styles.subtaskTypeContainer}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={10} color="#D97706" />
                  <Text style={styles.subtaskTypeText}>SUBTASK</Text>
                </View>
                {hierarchyLevel > 0 && (
                  <Text style={styles.hierarchyLevelBadge}>L{hierarchyLevel}</Text>
                )}
              </View>
              
              <View style={styles.subtaskHeaderRight}>
                <View style={[styles.subtaskPriorityBadge, { backgroundColor: priority.color }]}>
                  <Text style={styles.subtaskPriorityEmoji}>{priority.emoji}</Text>
                  <Text style={styles.subtaskPriorityLabel}>{priority.label}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.subtaskHeaderBottomRow}>
              {/* Task Status */}
              <View style={[styles.subtaskStatusBadge, { backgroundColor: taskStatus.color }]}>
                <MaterialCommunityIcons name={taskStatus.icon} size={10} color="white" />
                <Text style={styles.subtaskStatusText}>{taskStatus.label}</Text>
              </View>
              
              {/* Task Creator Info */}
              <View style={styles.subtaskCreatorContainer}>
                <MaterialCommunityIcons name="account-plus" size={10} color="#9CA3AF" />
                <Text style={styles.subtaskCreatorText}>
                  {extractUserInfo(subtask.createdByUser).displayName || 'Hệ thống'}
                </Text>
              </View>
            </View>
          </View>

          {/* Subtask Content Section */}
          <View style={styles.subtaskContentSection}>
            <Text style={styles.subtaskTitle} numberOfLines={2}>
              {subtask.title || 'Không có tiêu đề'}
            </Text>
            
            {subtask.content && (
              <Text style={styles.subtaskDescription} numberOfLines={2}>
                {subtask.content}
              </Text>
            )}
          </View>

          {/* Subtask Footer - ASSIGNMENT INFORMATION */}
          <View style={styles.subtaskFooter}>
            {assignment ? (
              <>
                {/* Assignment Header */}
                <View style={styles.subtaskAssignmentHeader}>
                  <View style={styles.subtaskAssignmentHeaderLeft}>
                    <MaterialCommunityIcons name="account-group" size={12} color="#6B7280" />
                    <Text style={styles.subtaskAssignmentLabel}>ASSIGNMENT</Text>
                  </View>
                  <View style={styles.subtaskAssignmentHeaderRight}>
                    {assignmentStatus && (
                      <View style={[styles.subtaskAssignmentStatusBadge, { backgroundColor: assignmentStatus.color }]}>
                        <MaterialCommunityIcons name={assignmentStatus.icon} size={8} color="white" />
                        <Text style={styles.subtaskAssignmentStatusText}>{assignmentStatus.label}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Assignment Details */}
                <View style={styles.subtaskAssignmentDetails}>
                  <View style={styles.subtaskRoleSection}>
                    {/* User Avatar */}
                    <View style={styles.subtaskUserAvatarContainer}>
                      {(() => {
                        const user = assignment?.recipientUser || subtask.createdByUser;
                        const userInfo = extractUserInfo(user);
                        
                        return (
                          <View style={styles.subtaskUserAvatarWrapper}>
                            {userInfo.avatar ? (
                              <Image
                                source={{ uri: userInfo.avatar }}
                                style={styles.subtaskUserAvatar}
                                onError={() => {
                                  console.log('Avatar failed to load for subtask user:', userInfo.name);
                                }}
                              />
                            ) : (
                              <View style={styles.subtaskUserAvatarFallback}>
                                <MaterialCommunityIcons 
                                  name="account" 
                                  size={14} 
                                  color="#9CA3AF" 
                                />
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                    
                    {/* User Info */}
                    <View style={styles.subtaskRoleTextContainer}>
                      <Text style={styles.subtaskRoleLabel}>
                        {assignment?.recipientUser ? 'Được giao' : 'Người tạo'}
                      </Text>
                      <Text style={[styles.subtaskRoleName, { color: '#6B7280' }]} numberOfLines={1}>
                        {(() => {
                          const user = assignment?.recipientUser || subtask.createdByUser;
                          const userInfo = extractUserInfo(user);
                          return userInfo.displayName || userInfo.name || 'Chưa có thông tin';
                        })()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.subtaskTimeSection}>
                    {hasDeadline ? (
                      <View style={styles.subtaskDeadlineContainer}>
                        <MaterialCommunityIcons 
                          name={isOverdue ? "alert-circle" : "calendar-clock"} 
                          size={12} 
                          color={isOverdue ? '#EF4444' : '#F59E0B'} 
                        />
                        <View style={styles.subtaskDeadlineTextContainer}>
                          <Text style={styles.subtaskDeadlineLabel}>
                            {isOverdue ? 'Quá hạn' : 'Hạn cuối'}
                          </Text>
                          <Text style={[
                            styles.subtaskDeadlineText, 
                            isOverdue && styles.overdueText
                          ]}>
                            {moment(assignment.dueAt).format('DD/MM HH:mm')}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.subtaskCreationInfo}>
                        <MaterialCommunityIcons name="calendar-plus" size={12} color="#9CA3AF" />
                        <View style={styles.subtaskCreatedTextContainer}>
                          <Text style={styles.subtaskCreatedLabel}>Giao lúc</Text>
                          <Text style={styles.subtaskCreatedTime}>
                            {assignment.assignedAt ? moment(assignment.assignedAt).format('DD/MM HH:mm') : 'Chưa xác định'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </>
            ) : (
              /* No Assignment - Show Task Creation Info */
              <View style={styles.subtaskNoAssignmentContainer}>
                <View style={styles.subtaskNoAssignmentHeader}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={10} color="#9CA3AF" />
                  <Text style={styles.subtaskNoAssignmentLabel}>CHƯA ĐƯỢC GIAO</Text>
                </View>
                <View style={styles.subtaskCreationInfo}>
                  <MaterialCommunityIcons name="clock-outline" size={10} color="#9CA3AF" />
                  <View style={styles.subtaskCreatedTextContainer}>
                    <Text style={styles.subtaskCreatedLabel}>Tạo lúc</Text>
                    <Text style={styles.subtaskCreatedTime}>
                      {moment(subtask.createdAt).format('DD/MM HH:mm')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Render nested subtasks if expanded */}
        {hasSubtasks && isExpanded && (
          <View style={styles.nestedSubtasks}>
            {(() => {
              console.log(`🔍 [SUBTASK DEBUG] Rendering nested subtasks for task ${subtask.id}:`);
              console.log(`🔍 [SUBTASK DEBUG] Has subtasks: ${hasSubtasks}`);
              console.log(`🔍 [SUBTASK DEBUG] Is expanded: ${isExpanded}`);
              console.log(`🔍 [SUBTASK DEBUG] Subtasks array:`, subtask.subtasks);
              console.log(`🔍 [SUBTASK DEBUG] Subtasks length:`, subtask.subtasks?.length || 0);
              
              return subtask.subtasks.map((nestedSubtask, index) => {
                console.log(`🔍 [SUBTASK DEBUG] Rendering nested subtask ${index}:`, nestedSubtask.id, nestedSubtask.title);
                return renderSubtask(nestedSubtask, hierarchyLevel + 1, `${subtask.id}-${nestedSubtask.id}-${index}`);
              });
            })()}
          </View>
        )}


      </View>
    );
  };

  const renderJobCard = ({ item }) => {
    // Use helper functions for dynamic colors
    const priority = getPriorityInfo(item.priority);
    const taskStatus = getStatusInfo(item.status, 'task');
    
    // Get assignment info - use backend data directly
    const assignment = item.assignments && item.assignments.length > 0 ? item.assignments[0] : null;
    const assignmentStatus = assignment ? getStatusInfo(assignment.status, 'assignment') : null;
    
    const hasDeadline = assignment?.dueAt && assignment.dueAt !== '';
    const isOverdue = hasDeadline && moment(assignment.dueAt).isBefore(moment()) && 
                     !(assignment.status && assignment.status.toLowerCase().includes('complet'));
    const hasSubtasks = item.subtasks && item.subtasks.length > 0;
    const isJobExpanded = expandedJobs.has(item.id); // For job card expansion
    const isSubtasksExpanded = expandedTasks.has(item.id); // For subtasks expansion

    // Calculate subtasks statistics - using recursive counting for complete tree
    const completedSubtasksDirect = hasSubtasks ? item.subtasks.filter(subtask => {
      const subAssignment = subtask.assignments && subtask.assignments.length > 0 ? subtask.assignments[0] : null;
      // Use backend status directly - check for completion keywords
      const isAssignmentCompleted = subAssignment?.status && subAssignment.status.toLowerCase().includes('complet');
      const isTaskCompleted = subtask.status && subtask.status.toLowerCase().includes('complet');
      return isAssignmentCompleted || isTaskCompleted;
    }).length : 0;
    const totalSubtasks = hasSubtasks ? item.subtasks.length : 0; // Direct subtasks only
    const totalSubtasksRecursive = hasSubtasks ? countSubtasksRecursively(item) : 0; // All subtasks in tree
    
    // Calculate completed subtasks recursively for the entire tree
    const completedSubtasksRecursive = hasSubtasks ? countCompletedSubtasksRecursively(item) : 0;
    
    console.log(`🎯 [JOB CARD DEBUG] Job ${item.id}:`);
    console.log(`🎯 [JOB CARD DEBUG] - Direct subtasks: ${totalSubtasks}`);
    console.log(`🎯 [JOB CARD DEBUG] - Total subtasks (recursive): ${totalSubtasksRecursive}`);
    console.log(`🎯 [JOB CARD DEBUG] - Completed direct: ${completedSubtasksDirect}`);
    console.log(`🎯 [JOB CARD DEBUG] - Completed recursive: ${completedSubtasksRecursive}`);
    console.log(`🎯 [JOB CARD DEBUG] - Has subtasks: ${hasSubtasks}`);
    
    // Print detailed task structure
    if (hasSubtasks) {
      console.log(`🌳 [TASK STRUCTURE] Printing structure for job ${item.id}:`);
      printTaskStructure(item);
    }
    
    // Use recursive counts for progress calculation (showing total progress of entire tree)
    const progressPercentage = totalSubtasksRecursive > 0 ? (completedSubtasksRecursive / totalSubtasksRecursive) * 100 : 0;

    // Determine the role display based on job type
    const getRoleInfo = () => {
      // Log assignment data for debugging
      if (item.assignments && item.assignments.length > 0) {
        console.log(`📋 Assignments for task ${item.id}:`, item.assignments);
        item.assignments.forEach((assignment, index) => {
          console.log(`👥 Assignment ${index}:`, {
            assignmentId: assignment.assignmentId,
            taskId: assignment.taskId,
            recipientType: assignment.recipientType,
            recipientUser: assignment.recipientUser,
            assignedByUser: assignment.assignedByUser,
            status: assignment.status,
            assignedAt: assignment.assignedAt,
            dueAt: assignment.dueAt
          });
        });
      }

      switch (selectedJobType) {
        case 'created':
          // For created jobs, show who we assigned it to (recipient)
          const createdAssignment = item.assignments?.[0];
          const recipientUser = createdAssignment?.recipientUser;
          const recipientInfo = extractUserInfo(recipientUser);
          
          // Log for debugging
          console.log(`📋 Created job ${item.id} - Assignment:`, createdAssignment);
          console.log(`👤 Recipient user:`, recipientUser);
          console.log(`📝 Extracted recipient info:`, recipientInfo);
          
          return { 
            label: 'Giao cho', 
            ...recipientInfo,
            name: recipientInfo.displayName || recipientInfo.name || 'Chưa giao',
            icon: 'account-arrow-right',
            color: '#2196F3',
            assignmentStatus: createdAssignment?.status || 'pending'
          };
          
        case 'assigned':
          // For assigned jobs, show who we assigned it to (recipient)
          const assignedAssignment = item.assignments?.[0];
          const assignedToUser = assignedAssignment?.recipientUser;
          const assignedInfo = extractUserInfo(assignedToUser);
          
          // Log for debugging
          console.log(`📋 Assigned job ${item.id} - Assignment:`, assignedAssignment);
          console.log(`👤 Assigned to user:`, assignedToUser);
          console.log(`📝 Extracted assigned info:`, assignedInfo);
          
          return { 
            label: 'Đã giao cho', 
            ...assignedInfo,
            name: assignedInfo.displayName || assignedInfo.name || 'Chưa xác định',
            icon: 'account-check',
            color: '#FF9800',
            assignmentStatus: assignedAssignment?.status || 'assigned'
          };
          
        case 'received':
          // For received jobs, show who assigned it to us (creator or assigner)
          const creator = item.createdByUser;
          
          // Also check if there's assignment info that shows who assigned it
          const receivedAssignment = item.assignments?.[0];
          const assignerUser = receivedAssignment?.assignedByUser || creator;
          const assignerInfo = extractUserInfo(assignerUser);
          
          // Log for debugging
          console.log(`📋 Received job ${item.id} - Creator:`, creator);
          console.log(`📋 Received job ${item.id} - Assignment:`, receivedAssignment);
          console.log(`👤 Assigner user:`, assignerUser);
          console.log(`📝 Extracted assigner info:`, assignerInfo);
          
          return { 
            label: 'Được giao bởi', 
            ...assignerInfo,
            name: assignerInfo.displayName || assignerInfo.name || 'Hệ thống',
            icon: 'account-arrow-left',
            color: '#4CAF50',
            assignmentStatus: receivedAssignment?.status || 'received'
          };
          
        default:
          return { 
            label: 'Người thực hiện', 
            name: 'Chưa xác định',
            email: '',
            phone: '',
            department: '',
            position: '',
            avatar: '',
            username: '',
            id: '',
            fullUser: null,
            icon: 'account',
            color: '#757575',
            assignmentStatus: 'unknown'
          };
      }
    };

    const roleInfo = getRoleInfo();

    // Format creation date - shorter version for compact cards
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = moment(dateString);
      const now = moment();
      
      if (date.isSame(now, 'day')) {
        return date.format('HH:mm');
      } else if (date.isSame(now.clone().subtract(1, 'day'), 'day')) {
        return 'Hôm qua';
      } else if (date.isAfter(now.clone().subtract(7, 'days'))) {
        return date.format('dddd');
      } else {
        return date.format('DD/MM');
      }
    };

    // Render compact list item when collapsed
    if (!isJobExpanded) {
      return (
        <View style={styles.jobListItemContainer} key={`job-list-${item.id}-${selectedJobType}`}>
          <TouchableOpacity 
            style={[styles.jobListItem, isOverdue && styles.jobListItemOverdue]} 
            activeOpacity={0.85}
            onPress={() => handleTaskPress(item)}
          >
            {/* Priority stripe */}
            <View style={[styles.jobListPriorityStripe, { backgroundColor: priority.color }]} />
            
            {/* Main content */}
            <View style={styles.jobListContent}>
              {/* Header row */}
              <View style={styles.jobListHeader}>
                <View style={styles.jobListLeft}>
                  {/* ID và Priority trên cùng một dòng */}
                  <View style={styles.jobListTopRow}>
                    <View style={styles.jobListIdContainer}>
                      <Text style={styles.jobListIdText}>#{item.id}</Text>
                    </View>
                    {/* Subtasks badge riêng biệt */}
                    {hasSubtasks && (
                      <View style={styles.jobListSubtasksBadge}>
                        <MaterialCommunityIcons name="format-list-checks" size={12} color="#6B7280" />
                        <Text style={styles.jobListSubtasksText}>
                          {totalSubtasksRecursive > totalSubtasks ? `${totalSubtasks}(+${totalSubtasksRecursive - totalSubtasks})` : totalSubtasks}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.jobListRight}>
                  <View style={[styles.jobListPriorityBadge, { backgroundColor: priority.color }]}>
                    <Text style={styles.jobListPriorityEmoji}>{priority.emoji}</Text>
                    <Text style={styles.jobListPriorityText} numberOfLines={1} ellipsizeMode="tail">
                      {priority.label === 'Thấp' ? 'THẤP' :
                       priority.label === 'Trung bình' ? 'TB' :
                       priority.label === 'Cao' ? 'CAO' :
                       priority.label === 'Khẩn cấp' ? 'KC' : 
                       priority.label.substring(0, 3).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.jobListDate}>{formatDate(item.createdAt)}</Text>
                  <View style={styles.expandIconContainer}>
                    <LinearGradient
                      colors={['#3B82F6', '#1E40AF']}
                      style={styles.expandIconGradient}
                    >
                      <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={16} 
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                  </View>
                </View>
              </View>
              
              {/* Title */}
              <Text style={styles.jobListTitle} numberOfLines={2}>
                {item.title || 'Không có tiêu đề'}
              </Text>
              
              {/* Footer row with status and creation date */}
              <View style={styles.jobListFooter}>
                <View style={[styles.jobListStatusBadge, { backgroundColor: taskStatus.color }]}>
                  <Text style={styles.jobListStatusText}>{taskStatus.label}</Text>
                </View>
                
                {hasDeadline && (
                  <View style={styles.jobListDeadline}>
                    <MaterialCommunityIcons 
                      name={isOverdue ? "alert-circle" : "calendar-clock"} 
                      size={12} 
                      color={isOverdue ? '#EF4444' : '#F59E0B'} 
                    />
                    <Text style={[
                      styles.jobListDeadlineText,
                      isOverdue && styles.jobListDeadlineOverdue
                    ]}>
                      {moment(assignment.dueAt).format('DD/MM')}
                    </Text>
                  </View>
                )}
                
                {/* Ngày tạo và Action Buttons trên cùng 1 hàng - nằm trong card */}
                <View style={styles.jobListBottomRow}>
                  {/* Created Date */}
                  <View style={styles.jobListCreatedContainer}>
                    <MaterialCommunityIcons name="calendar-plus" size={12} color="#9CA3AF" />
                    <Text style={styles.jobListCreatedText} numberOfLines={1}>
                      {moment(item.createdAt).format('DD/MM HH:mm')}
                    </Text>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={styles.inlineActionButtonsContainer}>
                    {/* Detail Button */}
                    <TouchableOpacity 
                      style={styles.inlineActionButton}
                      activeOpacity={0.8}
                      onPress={() => openFullDetailModal(item)}
                    >
                      <LinearGradient
                        colors={['#3B82F6', '#1E40AF']}
                        style={styles.inlineActionButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialCommunityIcons name="information-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.inlineActionButtonText}>Chi tiết</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    {/* Edit Button */}
                    <TouchableOpacity 
                      style={styles.inlineActionButton}
                      activeOpacity={0.8}
                      onPress={() => {
                        console.log('✏️ Edit task pressed:', item.id);
                        console.log('🚧 Edit functionality not implemented yet');
                      }}
                    >
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.inlineActionButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.inlineActionButtonText}>Sửa</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    {/* Tree View Button - Only if has subtasks */}
                    {hasSubtasks && (
                      <TouchableOpacity 
                        style={styles.inlineActionButton}
                        activeOpacity={0.8}
                        onPress={() => openTreeViewModal(item)}
                      >
                        <LinearGradient
                          colors={['#059669', '#047857']}
                          style={styles.inlineActionButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <MaterialCommunityIcons name="file-tree-outline" size={12} color="#FFFFFF" />
                          <Text style={styles.inlineActionButtonText}>Cây task</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Render full card when expanded (existing card design)
    return (
      <View style={styles.jobCardContainer} key={`job-card-${item.id}-${selectedJobType}`}>
        <TouchableOpacity 
          style={[styles.jobCard, isOverdue && styles.overdueCard]}
          activeOpacity={0.95}
          onPress={() => handleTaskPress(item)}
        >
          {/* Modern gradient overlay */}
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,1)']}
            style={styles.cardGradient}
          />
          
          {/* Priority stripe */}
          <View style={[styles.priorityStripe, { backgroundColor: priority.color }]} />
          
          {/* Collapse button */}
          <TouchableOpacity 
            style={styles.collapseButton}
            activeOpacity={0.8}
            onPress={() => toggleJobExpansion(item.id)}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.collapseButtonGradient}
            >
              <MaterialCommunityIcons name="chevron-up" size={14} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* ...existing full card content... */}
          {/* Header section - TASK INFORMATION */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerLeft}>
                {hasSubtasks && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => toggleTaskExpansion(item.id)}
                  >
                    <MaterialCommunityIcons 
                      name={isSubtasksExpanded ? 'chevron-down' : 'chevron-right'} 
                      size={14} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.taskIdContainer}>
                  <Text style={styles.taskIdText}>#{item.id}</Text>
                </View>
                <View style={styles.taskTypeContainer}>
                  <MaterialCommunityIcons name="clipboard-text" size={10} color="#6B7280" />
                  <Text style={styles.taskTypeText}>TASK</Text>
                </View>
              </View>
              
              <View style={styles.headerRight}>
                <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
                  <Text style={styles.priorityEmoji}>{priority.emoji}</Text>
                  <Text style={styles.priorityLabel}>{priority.label}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.headerBottomRow}>
              {/* Task Status */}
              <View style={[styles.statusBadge, { backgroundColor: taskStatus.color }]}>
                <MaterialCommunityIcons name={taskStatus.icon} size={10} color="white" />
                <Text style={styles.statusText}>{taskStatus.label}</Text>
              </View>
              
              {/* Task Creator Info */}
              <View style={styles.taskCreatorContainer}>
                <MaterialCommunityIcons name="account-plus" size={10} color="#9CA3AF" />
                <Text style={styles.taskCreatorText}>
                  {extractUserInfo(item.createdByUser).displayName || 'Hệ thống'}
                </Text>
              </View>
            </View>
          </View>

          {/* Content section */}
          <View style={styles.contentSection}>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {item.title || 'Không có tiêu đề'}
            </Text>
            
            {item.content && (
              <Text style={styles.jobDescription} numberOfLines={2}>
                {item.content}
              </Text>
            )}
          </View>

          {/* Progress section */}
          {hasSubtasks && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.progressInfo}>
                  <View style={styles.progressIconContainer}>
                    <MaterialCommunityIcons name="format-list-checks" size={14} color="#3B82F6" />
                  </View>
                  <View style={styles.progressTextContainer}>
                    <Text style={styles.progressLabel}>Tiến độ công việc</Text>
                    <Text style={styles.progressText}>
                      {completedSubtasks} / {totalSubtasks} công việc con
                    </Text>
                  </View>
                </View>
                <View style={styles.progressPercentageContainer}>
                  <Text style={[styles.progressPercentage, { color: '#6B7280' }]}>
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${progressPercentage}%`, 
                        backgroundColor: '#6B7280'
                      }
                    ]} 
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressStartLabel}>Bắt đầu</Text>
                  <Text style={styles.progressEndLabel}>Hoàn thành</Text>
                </View>
              </View>
            </View>
          )}

          {/* Visual Separator between Task and Creation Info */}
          <View style={styles.sectionSeparator}>
            <View style={styles.separatorLine} />
            <View style={styles.separatorTextContainer}>
              <MaterialCommunityIcons name="calendar-plus" size={14} color="#22C55E" />
              <Text style={styles.separatorText}>CREATION INFO</Text>
            </View>
            <View style={styles.separatorLine} />
          </View>

          {/* Footer section - CREATION INFORMATION */}
          <View style={styles.cardFooter}>
            <View style={styles.creationInfoContainer}>
              <View style={styles.creationHeader}>
                <View style={styles.creationHeaderLeft}>
                  <MaterialCommunityIcons name="calendar-plus" size={14} color="#6B7280" />
                  <Text style={styles.creationLabel}>NGÀY TẠO</Text>
                </View>
                <View style={styles.creationHeaderRight}>
                  <View style={styles.creationBadge}>
                    <MaterialCommunityIcons name="calendar-check" size={10} color="#22C55E" />
                    <Text style={styles.creationBadgeText}>ĐÃ TẠO</Text>
                  </View>
                </View>
              </View>

              <View style={styles.creationDetails}>
                <View style={styles.creationSection}>
                  {/* Creation Icon */}
                  <View style={styles.creationIconContainer}>
                    <View style={styles.creationIconFallback}>
                      <MaterialCommunityIcons 
                        name="calendar-plus" 
                        size={16} 
                        color="white" 
                      />
                    </View>
                  </View>
                  
                  {/* Creation Info */}
                  <View style={styles.creationTextContainer}>
                    <Text style={styles.creationInfoLabel}>Ngày tạo task</Text>
                    <Text style={styles.creationDate} numberOfLines={1}>
                      {moment(item.createdAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.creatorSection}>
                  <View style={styles.creatorContainer}>
                    <MaterialCommunityIcons name="account-plus" size={14} color="#9CA3AF" />
                    <View style={styles.creatorTextContainer}>
                      <Text style={styles.creatorLabel}>Người tạo</Text>
                      <Text style={styles.creatorName}>
                        {extractUserInfo(item.createdByUser).displayName || 'Hệ thống'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Render subtasks if expanded */}
        {hasSubtasks && isSubtasksExpanded && (
          <View style={styles.subtasksContainer}>
            <View style={styles.subtasksHeader}>
              <View style={styles.subtasksHeaderLeft}>
                <MaterialCommunityIcons name="format-list-bulleted" size={16} color="#6B7280" />
                <Text style={styles.subtasksHeaderTitle}>Công việc con</Text>
                <View style={styles.subtasksCountBadge}>
                  <Text style={styles.subtasksCountText}>
                    {totalSubtasksRecursive > totalSubtasks ? `${totalSubtasks}(+${totalSubtasksRecursive - totalSubtasks})` : totalSubtasks}
                  </Text>
                </View>
              </View>
              <View style={styles.subtasksHeaderRight}>
                <Text style={styles.subtasksCompletionText}>
                  {completedSubtasksRecursive}/{totalSubtasksRecursive} hoàn thành
                  {totalSubtasksRecursive > totalSubtasks && (
                    <Text style={styles.subtasksRecursiveNote}> (toàn bộ cây)</Text>
                  )}
                </Text>
              </View>
            </View>
            
            <View style={styles.subtasksContent}>
              {(() => {
                console.log(`🔍 [JOB SUBTASKS DEBUG] Rendering subtasks for job ${item.id}:`);
                console.log(`🔍 [JOB SUBTASKS DEBUG] Item subtasks:`, item.subtasks);
                console.log(`🔍 [JOB SUBTASKS DEBUG] Subtasks length:`, item.subtasks?.length || 0);
                console.log(`🔍 [JOB SUBTASKS DEBUG] Total subtasks count:`, totalSubtasks);
                
                return item.subtasks.map((subtask, index) => {
                  console.log(`🔍 [JOB SUBTASKS DEBUG] Rendering subtask ${index}:`, subtask.id, subtask.title, `hierarchyLevel: ${subtask.hierarchyLevel}`);
                  return renderSubtask(subtask, subtask.hierarchyLevel || 1, `${item.id}-${subtask.id}-${index}`);
                });
              })()}
            </View>
          </View>
        )}
        
        {/* Action Buttons cho Expanded View - nằm trong card */}
        <View style={styles.expandedActionButtonsContainer}>
          {/* Detail Button */}
          <TouchableOpacity 
            style={styles.expandedActionButton}
            activeOpacity={0.8}
            onPress={() => openFullDetailModal(item)}
          >
            <LinearGradient
              colors={['#3B82F6', '#1E40AF']}
              style={styles.expandedActionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="information-outline" size={14} color="#FFFFFF" />
              <Text style={styles.expandedActionButtonText}>Chi tiết</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Edit Button */}
          <TouchableOpacity 
            style={styles.expandedActionButton}
            activeOpacity={0.8}
            onPress={() => {
              console.log('✏️ Edit expanded task pressed:', item.id);
              console.log('🚧 Edit functionality not implemented yet');
            }}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.expandedActionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFFFFF" />
              <Text style={styles.expandedActionButtonText}>Sửa</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Tree View Button - Only if has subtasks */}
          {hasSubtasks && (
            <TouchableOpacity 
              style={styles.expandedActionButton}
              activeOpacity={0.8}
              onPress={() => openTreeViewModal(item)}
            >
              <LinearGradient
                colors={['#059669', '#047857']}
                style={styles.expandedActionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="file-tree-outline" size={14} color="#FFFFFF" />
                <Text style={styles.expandedActionButtonText}>Cây task</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // TaskQuickView Component
  const TaskQuickView = ({ task, onViewFullDetail }) => {
    const priority = getPriorityInfo(task.priority);
    const taskStatus = getStatusInfo(task.status, 'task');
    const assignment = task.assignments?.[0];
    const assignmentStatus = assignment ? getStatusInfo(assignment.status, 'assignment') : null;
    
    const hasDeadline = assignment?.dueAt;
    const isOverdue = hasDeadline && moment(assignment.dueAt).isBefore(moment()) && 
                     !assignment.status?.toLowerCase().includes('complet');
    
    return (
      <View style={styles.taskQuickView}>
        {/* Task Header */}
        <View style={styles.quickViewHeader}>
          <View style={styles.quickViewHeaderTop}>
            <View style={styles.quickViewIdContainer}>
              <Text style={styles.quickViewIdText}>#{task.id}</Text>
            </View>
            <View style={[styles.quickViewPriorityBadge, { backgroundColor: priority.color }]}>
              <Text style={styles.quickViewPriorityText}>{priority.emoji} {priority.label}</Text>
            </View>
          </View>
          <View style={styles.quickViewHeaderBottom}>
            <View style={[styles.quickViewStatusBadge, { backgroundColor: taskStatus.color }]}>
              <MaterialCommunityIcons name={taskStatus.icon} size={12} color="white" />
              <Text style={styles.quickViewStatusText}>{taskStatus.label}</Text>
            </View>
            <Text style={styles.quickViewCreatedAt}>
              Tạo: {moment(task.createdAt).format('DD/MM/YY HH:mm')}
            </Text>
          </View>
        </View>
        
        {/* Task Content */}
        <View style={styles.quickViewContent}>
          <Text style={styles.quickViewTitle}>{task.title || 'Không có tiêu đề'}</Text>
          {task.content && (
            <Text style={styles.quickViewDescription} numberOfLines={3}>
              {task.content}
            </Text>
          )}
        </View>
        
        {/* Creator Info */}
        <View style={styles.quickViewCreator}>
          <View style={styles.quickViewCreatorIcon}>
            <MaterialCommunityIcons name="account-plus" size={16} color="#6B7280" />
          </View>
          <View style={styles.quickViewCreatorInfo}>
            <Text style={styles.quickViewCreatorLabel}>Người tạo</Text>
            <Text style={styles.quickViewCreatorName}>
              {extractUserInfo(task.createdByUser).displayName || 'Hệ thống'}
            </Text>
          </View>
        </View>
        
        {/* Assignment Info */}
        {assignment && (
          <View style={styles.quickViewAssignment}>
            <View style={styles.quickViewAssignmentHeader}>
              <MaterialCommunityIcons name="account-arrow-right" size={16} color="#F97316" />
              <Text style={styles.quickViewAssignmentLabel}>Thông tin giao việc</Text>
              {assignmentStatus && (
                <View style={[styles.quickViewAssignmentStatus, { backgroundColor: assignmentStatus.color }]}>
                  <Text style={styles.quickViewAssignmentStatusText}>{assignmentStatus.label}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.quickViewAssignmentDetails}>
              <View style={styles.quickViewAssignmentRow}>
                <Text style={styles.quickViewAssignmentKey}>Được giao cho:</Text>
                <Text style={styles.quickViewAssignmentValue}>
                  {extractUserInfo(assignment.recipientUser).displayName || 'Chưa xác định'}
                </Text>
              </View>
              
              <View style={styles.quickViewAssignmentRow}>
                <Text style={styles.quickViewAssignmentKey}>Giao lúc:</Text>
                <Text style={styles.quickViewAssignmentValue}>
                  {moment(assignment.assignedAt).format('DD/MM/YY HH:mm')}
                </Text>
              </View>
              
              {hasDeadline && (
                <View style={styles.quickViewAssignmentRow}>
                  <Text style={styles.quickViewAssignmentKey}>Hạn cuối:</Text>
                  <Text style={[
                    styles.quickViewAssignmentValue,
                    isOverdue && styles.quickViewOverdue
                  ]}>
                    {moment(assignment.dueAt).format('DD/MM/YY HH:mm')}
                    {isOverdue && ' (Quá hạn)'}
                  </Text>
                </View>
              )}
              
              {assignment.note && (
                <View style={styles.quickViewAssignmentRow}>
                  <Text style={styles.quickViewAssignmentKey}>Ghi chú:</Text>
                  <Text style={styles.quickViewAssignmentValue} numberOfLines={2}>
                    {assignment.note}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Subtasks Summary */}
        {task.subtasks && task.subtasks.length > 0 && (
          <View style={styles.quickViewSubtasks}>
            <View style={styles.quickViewSubtasksHeader}>
              <MaterialCommunityIcons name="format-list-checks" size={16} color="#8B5CF6" />
              <Text style={styles.quickViewSubtasksLabel}>Công việc con</Text>
              <View style={styles.quickViewSubtasksBadge}>
                <Text style={styles.quickViewSubtasksBadgeText}>{task.subtasks.length}</Text>
              </View>
            </View>
            
            <View style={styles.quickViewSubtasksList}>
              {task.subtasks.slice(0, 3).map((subtask, index) => (
                <View key={subtask.id} style={styles.quickViewSubtaskItem}>
                  <View style={[styles.quickViewSubtaskPriority, { 
                    backgroundColor: getPriorityInfo(subtask.priority).color 
                  }]} />
                  <Text style={styles.quickViewSubtaskTitle} numberOfLines={1}>
                    {subtask.title || 'Không có tiêu đề'}
                  </Text>
                  <View style={[styles.quickViewSubtaskStatus, { 
                    backgroundColor: getStatusInfo(subtask.status).color 
                  }]}>
                    <Text style={styles.quickViewSubtaskStatusText}>
                      {getStatusInfo(subtask.status).label}
                    </Text>
                  </View>
                </View>
              ))}
              
              {task.subtasks.length > 3 && (
                <Text style={styles.quickViewSubtasksMore}>
                  và {task.subtasks.length - 3} công việc khác...
                </Text>
              )}
            </View>
          </View>
        )}
        
        {/* Attachments Summary */}
        {task.attachments && task.attachments.length > 0 && (
          <View style={styles.quickViewAttachments}>
            <View style={styles.quickViewAttachmentsHeader}>
              <MaterialCommunityIcons name="paperclip" size={16} color="#059669" />
              <Text style={styles.quickViewAttachmentsLabel}>File đính kèm</Text>
              <View style={styles.quickViewAttachmentsBadge}>
                <Text style={styles.quickViewAttachmentsBadgeText}>{task.attachments.length}</Text>
              </View>
            </View>
            
            <View style={styles.quickViewAttachmentsList}>
              {task.attachments.slice(0, 2).map((attachment, index) => (
                <View key={attachment.attachmentId} style={styles.quickViewAttachmentItem}>
                  <MaterialCommunityIcons name="file-document" size={14} color="#6B7280" />
                  <Text style={styles.quickViewAttachmentName} numberOfLines={1}>
                    {attachment.fileName}
                  </Text>
                </View>
              ))}
              
              {task.attachments.length > 2 && (
                <Text style={styles.quickViewAttachmentsMore}>
                  và {task.attachments.length - 2} file khác...
                </Text>
              )}
            </View>
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.quickViewActions}>
          <TouchableOpacity 
            style={styles.quickViewFullDetailButton}
            onPress={onViewFullDetail}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.quickViewFullDetailGradient}
            >
              <MaterialCommunityIcons name="eye" size={18} color="white" />
              <Text style={styles.quickViewFullDetailText}>Xem chi tiết đầy đủ</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Layout>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#7B1FA2', '#AB47BC']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        
        {/* Debug Button - For UI Testing */}
      </LinearGradient>

      {/* Job Type Tabs */}
      <View style={styles.jobTypeContainer}>
        <View style={styles.jobTypeTabs}>
          {jobTypeTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.jobTypeTab,
                selectedJobType === tab.key && styles.jobTypeTabActive,
              ]}
              onPress={() => setSelectedJobType(tab.key)}
            >
              <LinearGradient
                colors={selectedJobType === tab.key ? tab.gradient : ['transparent', 'transparent']}
                style={styles.jobTypeTabGradient}
              >
                <View style={styles.tabIconContainer}>
                  <MaterialCommunityIcons 
                    name={tab.icon} 
                    size={16} 
                    color={selectedJobType === tab.key ? 'white' : tab.color} 
                  />
                </View>
                <View style={styles.tabContentContainer}>
                  <Text style={[
                    styles.jobTypeTabText,
                    selectedJobType === tab.key && styles.jobTypeTabTextActive,
                    { color: selectedJobType === tab.key ? 'white' : tab.color }
                  ]}>
                    {tab.label}
                  </Text>
                  <Text style={[
                    styles.tabDescriptionInline,
                    { color: selectedJobType === tab.key ? 'rgba(255,255,255,0.8)' : '#9E9E9E' }
                  ]}>
                    {tab.key === 'created' && '(Công việc chưa giao)'}
                    {tab.key === 'assigned' && '(Xem tiến độ đã giao)'}
                    {tab.key === 'received' && '(Được giao cho tôi)'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filters */}
      {selectedJobType === 'created' ? (
        <View style={styles.createdTabFilters}>
          {/* Search & Filter Row - Cùng một dòng */}
          <View style={styles.searchFilterRow}>
            {/* Search Box */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm công việc..."
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#9CA3AF"
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            
            {/* Filter Button */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                (selectedPriorities.length > 0 || dateFromFilter || dateToFilter) && styles.filterButtonActive
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <View style={styles.filterButtonContent}>
                <Ionicons 
                  name={(selectedPriorities.length > 0 || dateFromFilter || dateToFilter) ? "funnel" : "funnel-outline"} 
                  size={18} 
                  color={(selectedPriorities.length > 0 || dateFromFilter || dateToFilter) ? "#FFFFFF" : "#3B82F6"} 
                />
                <Text style={[
                  styles.filterButtonText,
                  (selectedPriorities.length > 0 || dateFromFilter || dateToFilter) && styles.filterButtonTextActive
                ]}>
                  Bộ lọc
                </Text>
                {(selectedPriorities.length > 0 || dateFromFilter || dateToFilter) && (
                  <View style={styles.filterActiveBadge}>
                    <Text style={styles.filterActiveBadgeText}>
                      {selectedPriorities.length + (dateFromFilter ? 1 : 0) + (dateToFilter ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : selectedJobType === 'assigned' ? (
        <View style={styles.assignedTabFilters}>
          {/* Original Filter System - 4 filters cũ */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterButton,
                    selectedFilter === filter.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.value)}
                >
                  <Text style={[
                    styles.filterText,
                    selectedFilter === filter.value && styles.filterTextActive,
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Search & Filter Row - Cùng một dòng */}
          <View style={styles.searchFilterRow}>
            {/* Search Box */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm công việc..."
                  value={assignedSearchText}
                  onChangeText={setAssignedSearchText}
                  placeholderTextColor="#9CA3AF"
                />
                {assignedSearchText ? (
                  <TouchableOpacity onPress={() => setAssignedSearchText('')} style={styles.clearSearchButton}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            
            {/* Advanced Filter Button */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                (assignedSelectedPriorities.length > 0 || assignedSelectedAssigneeTypes.length > 0 || assignedDateFromFilter || assignedDateToFilter) && styles.filterButtonActive
              ]}
              onPress={() => setShowAssignedFilterModal(true)}
            >
              <View style={styles.filterButtonContent}>
                <Ionicons 
                  name={(assignedSelectedPriorities.length > 0 || assignedSelectedAssigneeTypes.length > 0 || assignedDateFromFilter || assignedDateToFilter) ? "funnel" : "funnel-outline"} 
                  size={18} 
                  color={(assignedSelectedPriorities.length > 0 || assignedSelectedAssigneeTypes.length > 0 || assignedDateFromFilter || assignedDateToFilter) ? "#FFFFFF" : "#3B82F6"} 
                />
                <Text style={[
                  styles.filterButtonText,
                  (assignedSelectedPriorities.length > 0 || assignedSelectedAssigneeTypes.length > 0 || assignedDateFromFilter || assignedDateToFilter) && styles.filterButtonTextActive
                ]}>
                  Bộ lọc
                </Text>
                {(assignedSelectedPriorities.length > 0 || assignedSelectedAssigneeTypes.length > 0 || assignedDateFromFilter || assignedDateToFilter) && (
                  <View style={styles.filterActiveBadge}>
                    <Text style={styles.filterActiveBadgeText}>
                      {assignedSelectedPriorities.length + assignedSelectedAssigneeTypes.length + (assignedDateFromFilter ? 1 : 0) + (assignedDateToFilter ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : selectedJobType === 'received' ? (
        /* Tab "Được giao" - Search & Filter cùng một dòng */
        <View style={styles.createdTabFilters}>
          {/* Search & Filter Row - Cùng một dòng */}
          <View style={styles.searchFilterRow}>
            {/* Search Box */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm công việc..."
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#9CA3AF"
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            
            {/* Filter Button */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                (selectedPriorities.length > 0 || dateFromFilter || dateToFilter) && styles.filterButtonActive
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <View style={styles.filterButtonContent}>
                <Ionicons 
                  name={(selectedPriorities.length > 0 || dateFromFilter || dateToFilter) ? "funnel" : "funnel-outline"} 
                  size={18} 
                  color={(selectedPriorities.length > 0 || dateFromFilter || dateToFilter) ? "#FFFFFF" : "#3B82F6"} 
                />
                <Text style={[
                  styles.filterButtonText,
                  (selectedPriorities.length > 0 || dateFromFilter || dateToFilter) && styles.filterButtonTextActive
                ]}>
                  Bộ lọc
                </Text>
                {(selectedPriorities.length > 0 || dateFromFilter || dateToFilter) && (
                  <View style={styles.filterActiveBadge}>
                    <Text style={styles.filterActiveBadgeText}>
                      {selectedPriorities.length + (dateFromFilter ? 1 : 0) + (dateToFilter ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Other Tabs - Original Filter System */
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(filter.value)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter.value && styles.filterTextActive,
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Total Count Display */}
      <View style={styles.totalCountContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,1)', 'rgba(248,250,252,0.8)']}
          style={styles.totalCountGradient}
        >
          <View style={styles.totalCountContent}>
            <View style={styles.totalCountLeft}>
              <View style={[styles.totalCountIcon, { backgroundColor: jobTypeTabs.find(tab => tab.key === selectedJobType)?.color + '20' || '#F1F5F9' }]}>
                <MaterialCommunityIcons 
                  name={jobTypeTabs.find(tab => tab.key === selectedJobType)?.icon || 'clipboard-text'} 
                  size={16} 
                  color={jobTypeTabs.find(tab => tab.key === selectedJobType)?.color || '#64748B'} 
                />
              </View>
              <View style={styles.totalCountTextContainer}>
                <Text style={styles.totalCountLabel}>
                  {jobTypeTabs.find(tab => tab.key === selectedJobType)?.label || 'Công việc'}
                </Text>
                <Text style={styles.totalCountText}>
                  Tổng số: {jobCounts[selectedJobType] || 0} công việc
                </Text>
              </View>
            </View>
            <View style={[styles.totalCountBadge, { backgroundColor: jobTypeTabs.find(tab => tab.key === selectedJobType)?.color + '15' || '#F1F5F9', borderColor: jobTypeTabs.find(tab => tab.key === selectedJobType)?.color + '30' || '#E2E8F0' }]}>
              <Text style={[styles.totalCountNumber, { color: jobTypeTabs.find(tab => tab.key === selectedJobType)?.color || '#475569' }]}>
                {jobCounts[selectedJobType] || 0}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Jobs List */}
      <View style={styles.jobsContainer}>
        {(() => {
          const filteredJobs = getFilteredJobs();
          console.log('🎨 Render check - isLoading:', isLoading);
          console.log('🎨 Render check - filteredJobs length:', filteredJobs.length);
          console.log('🎨 Render check - will show empty state:', !isLoading && filteredJobs.length === 0);
          console.log('🎨 Render check - will show jobs list:', !isLoading && filteredJobs.length > 0);
          
          if (isLoading) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#AB47BC" />
                <Text style={styles.loadingText}>Đang tải công việc...</Text>
              </View>
            );
          } else if (filteredJobs.length === 0) {
            return (
              <View style={styles.noJobsContainer}>
                <MaterialCommunityIcons name="briefcase-off-outline" size={64} color="#BDBDBD" />
                <Text style={styles.noJobsTitle}>Chưa có công việc nào</Text>
                <Text style={styles.noJobsDescription}>
                  {selectedJobType === 'created' ? 'Bạn chưa tạo công việc nào' :
                   selectedJobType === 'assigned' ? 'Bạn chưa giao công việc nào' :
                   'Bạn chưa được giao công việc nào'}
                </Text>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => fetchJobsByType(selectedJobType)}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#AB47BC" />
                  <Text style={styles.refreshButtonText}>Tải lại</Text>
                </TouchableOpacity>
              </View>
            );
          } else {
            return (
              <FlatList
                data={filteredJobs}
                renderItem={renderJobCard}
                keyExtractor={(item, index) => `job-${item.id}-${selectedJobType}-${index}`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.jobsList}
              />
            );
          }
        })()}
      </View>

      {/* Filter Modal for Created Tab */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            {/* Modal Handle Bar */}
            <View style={styles.modalHandleBar} />
            
            {/* Modal Header with gradient background */}
            <View style={styles.filterModalHeader}>
              <LinearGradient
                colors={['#F8FAFC', '#EFF6FF']}
                style={styles.filterModalHeaderGradient}
              />
              <View style={styles.filterModalHeaderContent}>
                <View style={styles.filterModalTitleContainer}>
                  <MaterialCommunityIcons 
                    name="filter-variant" 
                    size={20} 
                    color="#3B82F6" 
                    style={styles.filterModalIcon}
                  />
                  <Text style={styles.filterModalTitle}>Bộ lọc công việc</Text>
                </View>
                <TouchableOpacity 
                  style={styles.filterModalCloseButton}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              ref={filterModalScrollRef}
              style={styles.filterModalBody} 
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={styles.filterModalScrollContent}
            >
              {/* Priority Filter Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionTitleContainer}>
                  <MaterialCommunityIcons 
                    name="flag-variant" 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.filterSectionTitle}>Độ ưu tiên (Có thể chọn nhiều)</Text>
                </View>
                
                {/* Selected Priorities Display - Moved to top */}
                {selectedPriorities.length > 0 && (
                  <View style={styles.selectedPrioritiesContainer}>
                    <Text style={styles.selectedPrioritiesLabel}>Đã chọn ({selectedPriorities.length}):</Text>
                    <View style={styles.selectedPrioritiesChips}>
                      {selectedPriorities.map((priorityValue) => {
                        const priority = priorityOptions.find(p => p.value === priorityValue);
                        return (
                          <View 
                            key={priorityValue} 
                            style={[
                              styles.selectedPriorityChip,
                              { backgroundColor: priority?.color || '#3B82F6' }
                            ]}
                          >
                            <Text style={styles.selectedPriorityChipText}>
                              {priority?.emoji || '⚪'} {priority?.label || priorityValue}
                            </Text>
                            <TouchableOpacity
                              style={styles.selectedPriorityRemoveButton}
                              onPress={() => removePriority(priorityValue)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close" size={8} color="white" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Priority Options Grid */}
                <View style={styles.priorityMultiSelectContainer}>
                  {priorityOptions.map((priority) => {
                    const isSelected = selectedPriorities.includes(priority.value);
                    return (
                      <TouchableOpacity
                        key={priority.value}
                        style={[
                          styles.priorityMultiSelectButton,
                          {
                            backgroundColor: isSelected ? priority.color : priority.lightColor,
                            borderColor: isSelected ? priority.color : '#E2E8F0',
                            shadowColor: isSelected ? priority.color : '#64748B',
                          }
                        ]}
                        onPress={() => togglePriority(priority.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.priorityMultiSelectText,
                          {
                            color: isSelected ? '#FFFFFF' : priority.color,
                            fontWeight: isSelected ? '700' : '600',
                          }
                        ]}>
                          {priority.emoji} {priority.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Date Range Filter Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionTitleContainer}>
                  <MaterialCommunityIcons 
                    name="calendar-range" 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.filterSectionTitle}>Thời gian tạo</Text>
                </View>
                <View style={styles.dateRangeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.dateModalButton,
                      dateFromFilter && styles.dateModalButtonActive
                    ]}
                    onPress={() => {
                      console.log('🗓️ [BUTTON] Date From button pressed');
                      showDateFromPicker();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={18} 
                      color={dateFromFilter ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[
                      styles.dateModalButtonText,
                      dateFromFilter && styles.dateModalButtonTextActive
                    ]}>
                      {dateFromFilter ? formatDateForDisplay(dateFromFilter) : 'Từ ngày'}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.dateSeparatorContainer}>
                    <Text style={styles.dateSeparator}>đến</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[
                      styles.dateModalButton,
                      dateToFilter && styles.dateModalButtonActive
                    ]}
                    onPress={() => {
                      console.log('🗓️ [BUTTON] Date To button pressed');
                      showDateToPicker();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={18} 
                      color={dateToFilter ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[
                      styles.dateModalButtonText,
                      dateToFilter && styles.dateModalButtonTextActive
                    ]}>
                      {dateToFilter ? formatDateForDisplay(dateToFilter) : 'Đến ngày'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Date Validation Error */}
                {dateValidationError ? (
                  <View style={styles.dateValidationError}>
                    <MaterialCommunityIcons 
                      name="alert-circle" 
                      size={16} 
                      color="#DC2626" 
                      style={styles.dateValidationErrorIcon}
                    />
                    <Text style={styles.dateValidationErrorText}>
                      {dateValidationError}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Date Picker - Integrated into modal */}
              {showDatePicker && (
                <View style={[
                  styles.datePickerSection,
                  isDatePickerFocused && styles.datePickerSectionFocused
                ]}>
                  <Text style={styles.datePickerTitle}>
                    {showDatePicker === 'from' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                  </Text>
                  <DateTimePicker
                    value={
                      showDatePicker === 'from' 
                        ? (dateFromFilter ? new Date(dateFromFilter) : new Date())
                        : (dateToFilter ? new Date(dateToFilter) : new Date())
                    }
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date(2020, 0, 1)} // Có thể chọn từ năm 2020
                    maximumDate={new Date(2030, 11, 31)} // Có thể chọn đến cuối năm 2030
                    locale="vi-VN"
                    style={styles.datePicker}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={hideDatePicker}
                    >
                      <Text style={styles.datePickerDoneText}>Xong</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Filter Modal Actions */}
            <View style={styles.filterModalActions}>
              <TouchableOpacity 
                style={styles.clearAllFiltersButton}
                onPress={() => {
                  console.log('🧹 [BUTTON] Clear all filters button pressed');
                  clearCreatedFilters();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F8FAFC', '#F1F5F9']}
                  style={styles.clearAllFiltersButtonGradient}
                />
                <MaterialCommunityIcons name="refresh" size={18} color="#64748B" />
                <Text style={styles.clearAllFiltersText}>Xóa tất cả</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.applyFiltersButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <MaterialCommunityIcons 
                  name="check" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.applyFiltersButtonIcon}
                />
                <Text style={styles.applyFiltersText}>Áp dụng bộ lọc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal for Assigned Tab */}
      <Modal
        visible={showAssignedFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAssignedFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            {/* Modal Handle Bar */}
            <View style={styles.modalHandleBar} />
            
            {/* Modal Header with gradient background */}
            <View style={styles.filterModalHeader}>
              <LinearGradient
                colors={['#F8FAFC', '#EFF6FF']}
                style={styles.filterModalHeaderGradient}
              />
              <View style={styles.filterModalHeaderContent}>
                <View style={styles.filterModalTitleContainer}>
                  <MaterialCommunityIcons 
                    name="filter-variant" 
                    size={20} 
                    color="#3B82F6" 
                    style={styles.filterModalIcon}
                  />
                  <Text style={styles.filterModalTitle}>Bộ lọc công việc đã giao</Text>
                </View>
                <TouchableOpacity 
                  style={styles.filterModalCloseButton}
                  onPress={() => setShowAssignedFilterModal(false)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              ref={assignedFilterModalScrollRef}
              style={styles.filterModalBody} 
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={styles.filterModalScrollContent}
            >
              {/* Priority Filter Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionTitleContainer}>
                  <MaterialCommunityIcons 
                    name="flag-variant" 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.filterSectionTitle}>Độ ưu tiên (Có thể chọn nhiều)</Text>
                </View>
                
                {/* Selected Priorities Display - Moved to top */}
                {assignedSelectedPriorities.length > 0 && (
                  <View style={styles.selectedPrioritiesContainer}>
                    <Text style={styles.selectedPrioritiesLabel}>Đã chọn ({assignedSelectedPriorities.length}):</Text>
                    <View style={styles.selectedPrioritiesChips}>
                      {assignedSelectedPriorities.map((priorityValue) => {
                        const priority = priorityOptions.find(p => p.value === priorityValue);
                        return (
                          <View 
                            key={priorityValue} 
                            style={[
                              styles.selectedPriorityChip,
                              { backgroundColor: priority?.color || '#3B82F6' }
                            ]}
                          >
                            <Text style={styles.selectedPriorityChipText}>
                              {priority?.emoji || '⚪'} {priority?.label || priorityValue}
                            </Text>
                            <TouchableOpacity
                              style={styles.selectedPriorityRemoveButton}
                              onPress={() => removeAssignedPriority(priorityValue)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close" size={8} color="white" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Priority Options Grid */}
                <View style={styles.priorityMultiSelectContainer}>
                  {priorityOptions.map((priority) => {
                    const isSelected = assignedSelectedPriorities.includes(priority.value);
                    return (
                      <TouchableOpacity
                        key={priority.value}
                        style={[
                          styles.priorityMultiSelectButton,
                          {
                            backgroundColor: isSelected ? priority.color : priority.lightColor,
                            borderColor: isSelected ? priority.color : '#E2E8F0',
                            shadowColor: isSelected ? priority.color : '#64748B',
                          }
                        ]}
                        onPress={() => toggleAssignedPriority(priority.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.priorityMultiSelectText,
                          {
                            color: isSelected ? '#FFFFFF' : priority.color,
                            fontWeight: isSelected ? '700' : '600',
                          }
                        ]}>
                          {priority.emoji} {priority.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Assignee Type Filter Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionTitleContainer}>
                  <MaterialCommunityIcons 
                    name="account-multiple" 
                    size={22} 
                    color="#4F46E5" 
                  />
                  <Text style={[styles.filterSectionTitle, { color: '#1E293B', fontSize: 16, fontWeight: '700' }]}>
                    Đối tượng được giao
                  </Text>
                  <View style={{
                    backgroundColor: '#EDE9FE',
                    paddingHorizontal: 8, // Giảm từ 12 xuống 8
                    paddingVertical: 4, // Giảm từ 6 xuống 4
                    borderRadius: 12, // Giảm từ 16 xuống 12
                    borderWidth: 1,
                    borderColor: '#C4B5FD',
                    minHeight: 24, // Giảm từ 32 xuống 24
                  }}>
                    <Text style={{ 
                      fontSize: 10, // Giảm từ 12 xuống 10
                      color: '#6B46C1', 
                      fontWeight: '600', // Giảm từ 700 xuống 600
                      textTransform: 'uppercase',
                      letterSpacing: 0.3 // Giảm từ 0.5 xuống 0.3
                    }}>
                      Chọn nhiều
                    </Text>
                  </View>
                </View>
                
                {/* Selected Assignees Summary */}
                {(selectedUsers.length > 0 || selectedUnits.length > 0 || selectedTeams.length > 0) && (
                  <View style={styles.selectedAssigneesContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={styles.selectedAssigneesLabel}>
                        🎯 Đã chọn ({selectedUsers.length + selectedUnits.length + selectedTeams.length} đối tượng)
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#FFFFFF',
                          paddingHorizontal: 12, // Giảm từ 18 xuống 12
                          paddingVertical: 8, // Giảm từ 12 xuống 8
                          borderRadius: 12, // Giảm từ 16 xuống 12
                          borderWidth: 2,
                          borderColor: '#FCA5A5',
                          minHeight: 36, // Giảm từ 48 xuống 36
                          justifyContent: 'center',
                          shadowColor: '#EF4444',
                          shadowOffset: { width: 0, height: 2 }, // Giảm từ 4 xuống 2
                          shadowOpacity: 0.12, // Giảm từ 0.15 xuống 0.12
                          shadowRadius: 4, // Giảm từ 8 xuống 4
                          elevation: 2, // Giảm từ 4 xuống 2
                        }}
                        onPress={() => {
                          clearAssignedFilters();
                        }}
                      >
                        <Text style={{ fontSize: 14, color: '#DC2626', fontWeight: '700', letterSpacing: 0.3 }}>Xóa tất cả</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.selectedAssigneesChips}>
                      {/* Display selected users */}
                      {selectedUsers.map((user) => {
                        const displayName = getAssigneeDisplayName(user, 'USER');
                        console.log('👤 Rendering user chip:', user.fullName || user.name, 'Display:', displayName);
                        return (
                          <View 
                            key={`user-${user.id}`} 
                            style={[
                              styles.selectedAssigneeChip,
                              { 
                                backgroundColor: '#10B981',
                                borderColor: '#059669'
                              }
                            ]}
                          >
                            <View style={styles.selectedAssigneeChipContent}>
                              <MaterialCommunityIcons name="account" size={18} color="white" />
                              <Text style={[styles.selectedAssigneeChipText, { 
                                fontSize: 14, // Giảm từ 19 xuống 14
                                fontWeight: '700',
                                marginLeft: 8, // Giảm từ 12 xuống 8
                                flex: 1,
                                color: '#FFFFFF',
                                minWidth: 80, // Giảm từ 120 xuống 80
                                textAlign: 'left'
                              }]} numberOfLines={0}>
                                {displayName || 'No Name'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.selectedAssigneeRemoveButton, {
                                width: 20, // Giảm từ 28 xuống 20
                                height: 20, // Giảm từ 28 xuống 20
                                borderRadius: 10, // Giảm từ 14 xuống 10
                              }]}
                              onPress={() => {
                                setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                // If no users left, remove USER from selected types
                                if (selectedUsers.length === 1) {
                                  setAssignedSelectedAssigneeTypes(prev => prev.filter(type => type !== 'USER'));
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="close" size={14} color="white" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                      
                      {/* Display selected units */}
                      {selectedUnits.map((unit) => {
                        const displayName = getAssigneeDisplayName(unit, 'UNIT');
                        console.log('🏢 Rendering unit chip:', unit.unitName || unit.name, 'Display:', displayName);
                        return (
                          <View 
                            key={`unit-${unit.id}`} 
                            style={[
                              styles.selectedAssigneeChip,
                              { 
                                backgroundColor: '#F59E0B',
                                borderColor: '#D97706'
                              }
                            ]}
                          >
                            <View style={styles.selectedAssigneeChipContent}>
                              <MaterialCommunityIcons name="office-building" size={18} color="white" />
                              <Text style={[styles.selectedAssigneeChipText, { 
                                fontSize: 14, // Giảm từ 19 xuống 14
                                fontWeight: '700',
                                marginLeft: 8, // Giảm từ 12 xuống 8
                                flex: 1,
                                color: '#FFFFFF',
                                minWidth: 80, // Giảm từ 120 xuống 80
                                textAlign: 'left'
                              }]} numberOfLines={0}>
                                {displayName || 'No Name'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.selectedAssigneeRemoveButton, {
                                width: 20, // Giảm từ 28 xuống 20
                                height: 20, // Giảm từ 28 xuống 20
                                borderRadius: 10, // Giảm từ 14 xuống 10
                              }]}
                              onPress={() => {
                                setSelectedUnits(prev => prev.filter(u => u.id !== unit.id));
                                // If no units left, remove UNIT from selected types
                                if (selectedUnits.length === 1) {
                                  setAssignedSelectedAssigneeTypes(prev => prev.filter(type => type !== 'UNIT'));
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="close" size={14} color="white" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                      
                      {/* Display selected teams */}
                      {selectedTeams.map((team) => {
                        const displayName = getAssigneeDisplayName(team, 'TEAM');
                        console.log('👥 Rendering team chip:', team.teamName || team.name, 'Display:', displayName);
                        return (
                          <View 
                            key={`team-${team.id}`} 
                            style={[
                              styles.selectedAssigneeChip,
                              { 
                                backgroundColor: '#3B82F6',
                                borderColor: '#2563EB'
                              }
                            ]}
                          >
                            <View style={styles.selectedAssigneeChipContent}>
                              <MaterialCommunityIcons name="account-group" size={18} color="white" />
                              <Text style={[styles.selectedAssigneeChipText, { 
                                fontSize: 14, // Giảm từ 19 xuống 14
                                fontWeight: '700',
                                marginLeft: 8, // Giảm từ 12 xuống 8
                                flex: 1,
                                color: '#FFFFFF',
                                minWidth: 80, // Giảm từ 120 xuống 80
                                textAlign: 'left'
                              }]} numberOfLines={0}>
                                {displayName || 'No Name'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.selectedAssigneeRemoveButton, {
                                width: 20, // Giảm từ 28 xuống 20
                                height: 20, // Giảm từ 28 xuống 20
                                borderRadius: 10, // Giảm từ 14 xuống 10
                              }]}
                              onPress={() => {
                                setSelectedTeams(prev => prev.filter(t => t.id !== team.id));
                                // If no teams left, remove TEAM from selected types
                                if (selectedTeams.length === 1) {
                                  setAssignedSelectedAssigneeTypes(prev => prev.filter(type => type !== 'TEAM'));
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="close" size={14} color="white" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Assignee Type Options Grid */}
                <View style={styles.assigneeTypeMultiSelectContainer}>
                  {assigneeTypeOptions.map((assigneeType) => {
                    const isSelected = assignedSelectedAssigneeTypes.includes(assigneeType.value);
                    const selectedCount = getSelectedCountForType(assigneeType.value);
                    return (
                      <TouchableOpacity
                        key={assigneeType.value}
                        style={[
                          styles.assigneeTypeMultiSelectButton,
                          {
                            backgroundColor: isSelected ? assigneeType.color : '#FFFFFF',
                            borderColor: isSelected ? assigneeType.color : '#E2E8F0',
                            shadowColor: isSelected ? assigneeType.color : '#64748B',
                            shadowOpacity: isSelected ? 0.2 : 0.1,
                            elevation: isSelected ? 4 : 2,
                            transform: [{ scale: isSelected ? 1.02 : 1 }],
                          }
                        ]}
                        onPress={() => toggleAssignedAssigneeType(assigneeType.value)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.assigneeTypeButtonContent}>
                          <View style={styles.assigneeTypeButtonLeft}>
                            <View style={{
                              width: 24, // Giảm từ 36 xuống 24
                              height: 24, // Giảm từ 36 xuống 24
                              borderRadius: 12, // Giảm từ 18 xuống 12
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : assigneeType.lightColor,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 8, // Giảm từ 12 xuống 8
                              borderWidth: 1,
                              borderColor: isSelected ? 'rgba(255,255,255,0.3)' : assigneeType.color + '30',
                            }}>
                              <MaterialCommunityIcons 
                                name={assigneeType.icon} 
                                size={14} // Giảm từ 20 xuống 14
                                color={isSelected ? '#FFFFFF' : assigneeType.color}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[
                                styles.assigneeTypeMultiSelectText,
                                {
                                  color: isSelected ? '#FFFFFF' : assigneeType.color,
                                  fontWeight: isSelected ? '700' : '600',
                                  fontSize: 13, // Giảm từ 18 xuống 13 (phù hợp với style)
                                }
                              ]}>
                                {assigneeType.label}
                              </Text>
                              {selectedCount > 0 && (
                                <Text style={{
                                  fontSize: 11, // Giảm từ 14 xuống 11
                                  color: isSelected ? 'rgba(255,255,255,0.8)' : assigneeType.color + 'AA',
                                  fontWeight: '500', // Giảm từ 600 xuống 500
                                  marginTop: 2, // Giảm từ 3 xuống 2
                                }}>
                                  {selectedCount} đã chọn
                                </Text>
                              )}
                            </View>
                          </View>
                          {selectedCount > 0 && (
                            <View style={[
                              styles.assigneeTypeCountBadge, 
                              { 
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : assigneeType.color,
                                borderColor: isSelected ? 'rgba(255,255,255,0.4)' : assigneeType.color,
                                minWidth: 20, // Giảm từ 32 xuống 20
                                height: 20, // Giảm từ 32 xuống 20
                                borderRadius: 10, // Giảm từ 16 xuống 10
                              }
                            ]}>
                              <Text style={[
                                styles.assigneeTypeCountText,
                                { 
                                  color: isSelected ? '#FFFFFF' : '#FFFFFF',
                                  fontSize: 10, // Giảm từ 14 xuống 10
                                  fontWeight: '700',
                                }
                              ]}>
                                {selectedCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Inline Assignee Selection Container */}
              {showInlineAssigneeSelection && (
                <View style={[
                  styles.filterSection,
                  {
                    backgroundColor: '#FEFCE8',
                    borderColor: '#FDE68A',
                    borderWidth: 2,
                    marginTop: -1,
                    borderTopWidth: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    shadowColor: '#F59E0B',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }
                ]}>
                  <View style={[styles.filterSectionTitleContainer, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#FEF3C7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}>
                        <MaterialCommunityIcons 
                          name={currentAssigneeType === 'USER' ? 'account' : 
                                currentAssigneeType === 'UNIT' ? 'office-building' : 'account-group'} 
                          size={18} 
                          color="#D97706" 
                        />
                      </View>
                      <View>
                        <Text style={[styles.filterSectionTitle, { color: '#92400E', fontWeight: '700', marginBottom: 2 }]}>
                          Chọn {currentAssigneeType === 'USER' ? 'Cá nhân' : 
                                 currentAssigneeType === 'UNIT' ? 'Tổ' : 'Đội'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#A16207', fontWeight: '500' }}>
                          Tìm và chọn từ danh sách bên dưới
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setShowInlineAssigneeSelection(false);
                        setCurrentAssigneeType(null);
                        setAssigneeData([]);
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#FEE2E2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#FECACA',
                      }}
                    >
                      <MaterialCommunityIcons name="close" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Search Box */}
                  <View style={[styles.assigneeSearchContainer, { 
                    backgroundColor: '#FFFBEB',
                    borderColor: '#FDE68A',
                    borderWidth: 1,
                    shadowColor: '#F59E0B',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }]}>
                    <View style={[styles.assigneeSearchInputContainer, { backgroundColor: 'transparent' }]}>
                      <MaterialCommunityIcons name="magnify" size={18} color="#92400E" />
                      <TextInput
                        style={[styles.assigneeSearchInput, { color: '#92400E' }]}
                        placeholder={`🔍 Tìm kiếm ${currentAssigneeType === 'USER' ? 'người dùng' : 
                                                      currentAssigneeType === 'UNIT' ? 'tổ' : 'đội'}...`}
                        value={assigneeSearchText}
                        onChangeText={setAssigneeSearchText}
                        placeholderTextColor="#A16207"
                      />
                      {assigneeSearchText.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setAssigneeSearchText('')}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: '#FED7AA',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MaterialCommunityIcons name="close" size={12} color="#C2410C" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {/* Content */}
                  <View style={{ paddingHorizontal: 8, paddingBottom: 16 }}>
                    {isLoadingAssignees ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                        <Text style={{ marginTop: 12, fontSize: 14, color: '#92400E', fontWeight: '500' }}>
                          Đang tải dữ liệu...
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: 14,
                          paddingHorizontal: 2,
                        }}>
                          <Text style={{ fontSize: 13, color: '#A16207', fontWeight: '600' }}>
                            📋 Tìm thấy: {assigneeData.filter(assignee => {
                              const searchLower = assigneeSearchText.toLowerCase();
                              const displayName = getAssigneeDisplayName(assignee, currentAssigneeType).toLowerCase();
                              return displayName.includes(searchLower);
                            }).length} kết quả
                          </Text>
                          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>
                            ✅ Đã chọn: {selectedAssignees.length}
                          </Text>
                        </View>
                        
                        <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={true}>
                          {assigneeData
                            .filter(assignee => {
                              const searchLower = assigneeSearchText.toLowerCase();
                              const displayName = getAssigneeDisplayName(assignee, currentAssigneeType).toLowerCase();
                              return displayName.includes(searchLower);
                            })
                            .map((assignee, index) => {
                              const isSelected = selectedAssignees.some(selected => selected.id === assignee.id);
                              return (
                                <TouchableOpacity 
                                  key={assignee.id || index} 
                                  style={{
                                    padding: 14,
                                    borderWidth: 2,
                                    borderColor: isSelected ? '#F59E0B' : '#FDE68A',
                                    borderRadius: 12,
                                    marginBottom: 10,
                                    backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    shadowColor: isSelected ? '#F59E0B' : '#E5E7EB',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isSelected ? 0.15 : 0.05,
                                    shadowRadius: 4,
                                    elevation: isSelected ? 3 : 1,
                                    transform: [{ scale: isSelected ? 1.02 : 1 }],
                                  }}
                                  onPress={() => toggleAssigneeSelection(assignee)}
                                  activeOpacity={0.8}
                                >
                                  <View style={{ flex: 1, marginRight: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                      <MaterialCommunityIcons 
                                        name={currentAssigneeType === 'USER' ? 'account' : 
                                              currentAssigneeType === 'UNIT' ? 'office-building' : 'account-group'} 
                                        size={16} 
                                        color={isSelected ? '#D97706' : '#A16207'}
                                        style={{ marginRight: 6 }}
                                      />
                                      <Text style={{ 
                                        fontSize: 15, 
                                        fontWeight: '700', 
                                        color: isSelected ? '#92400E' : '#374151',
                                        flex: 1,
                                      }} numberOfLines={1}>
                                        {getAssigneeDisplayName(assignee, currentAssigneeType)}
                                      </Text>
                                    </View>
                                    {currentAssigneeType === 'USER' && assignee.email && (
                                      <Text style={{ 
                                        fontSize: 12, 
                                        color: isSelected ? '#A16207' : '#6B7280',
                                        fontWeight: '500',
                                        marginLeft: 22,
                                      }} numberOfLines={1}>
                                        📧 {assignee.email}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: isSelected ? '#F59E0B' : '#F3F4F6',
                                    borderWidth: 2,
                                    borderColor: isSelected ? '#D97706' : '#D1D5DB',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                    {isSelected && (
                                      <MaterialCommunityIcons name="check" size={14} color="white" />
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                        </ScrollView>
                        
                        {/* Action Buttons */}
                        <View style={{
                          flexDirection: 'row',
                          marginTop: 18,
                          gap: 12,
                        }}>
                          <TouchableOpacity 
                            style={{
                              flex: 1,
                              height: 44,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F8FAFC',
                              borderWidth: 2,
                              borderColor: '#E2E8F0',
                            }}
                            onPress={() => {
                              setShowInlineAssigneeSelection(false);
                              setCurrentAssigneeType(null);
                              setAssigneeData([]);
                              setSelectedAssignees([]);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>❌ Hủy</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={{
                              flex: 2,
                              height: 44,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F59E0B',
                              borderWidth: 2,
                              borderColor: '#D97706',
                              shadowColor: '#F59E0B',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.2,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                            onPress={() => {
                              applyAssigneeSelections();
                              setShowInlineAssigneeSelection(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                              ✅ Áp dụng ({selectedAssignees.length})
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Date Range Filter Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionTitleContainer}>
                  <MaterialCommunityIcons 
                    name="calendar-range" 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.filterSectionTitle}>Thời gian giao việc</Text>
                </View>
                <View style={styles.dateRangeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.dateModalButton,
                      assignedDateFromFilter && styles.dateModalButtonActive
                    ]}
                    onPress={() => {
                      console.log('🗓️ [BUTTON] Assigned Date From button pressed');
                      showAssignedDateFromPicker();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={18} 
                      color={assignedDateFromFilter ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[
                      styles.dateModalButtonText,
                      assignedDateFromFilter && styles.dateModalButtonTextActive
                    ]}>
                      {assignedDateFromFilter ? formatDateForDisplay(assignedDateFromFilter) : 'Từ ngày'}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.dateSeparatorContainer}>
                    <Text style={styles.dateSeparator}>đến</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[
                      styles.dateModalButton,
                      assignedDateToFilter && styles.dateModalButtonActive
                    ]}
                    onPress={() => {
                      console.log('🗓️ [BUTTON] Assigned Date To button pressed');
                      showAssignedDateToPicker();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={18} 
                      color={assignedDateToFilter ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[
                      styles.dateModalButtonText,
                      assignedDateToFilter && styles.dateModalButtonTextActive
                    ]}>
                      {assignedDateToFilter ? formatDateForDisplay(assignedDateToFilter) : 'Đến ngày'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Date Validation Error */}
                {assignedDateValidationError ? (
                  <View style={styles.dateValidationError}>
                    <MaterialCommunityIcons 
                      name="alert-circle" 
                      size={16} 
                      color="#DC2626" 
                      style={styles.dateValidationErrorIcon}
                    />
                    <Text style={styles.dateValidationErrorText}>
                      {assignedDateValidationError}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Date Picker - Integrated into modal */}
              {assignedShowDatePicker && (
                <View style={[
                  styles.datePickerSection,
                  assignedIsDatePickerFocused && styles.datePickerSectionFocused
                ]}>
                  <Text style={styles.datePickerTitle}>
                    {assignedShowDatePicker === 'from' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                  </Text>
                  <DateTimePicker
                    value={
                      assignedShowDatePicker === 'from' 
                        ? (assignedDateFromFilter ? new Date(assignedDateFromFilter) : new Date())
                        : (assignedDateToFilter ? new Date(assignedDateToFilter) : new Date())
                    }
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={handleAssignedDateChange}
                    minimumDate={new Date(2020, 0, 1)} // Có thể chọn từ năm 2020
                    maximumDate={new Date(2030, 11, 31)} // Có thể chọn đến cuối năm 2030
                    locale="vi-VN"
                    style={styles.datePicker}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={hideAssignedDatePicker}
                    >
                      <Text style={styles.datePickerDoneText}>Xong</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Filter Modal Actions */}
            <View style={styles.filterModalActions}>
              <TouchableOpacity 
                style={styles.clearAllFiltersButton}
                onPress={() => {
                  console.log('🧹 [BUTTON] Clear all assigned filters button pressed');
                  clearAssignedFilters();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F8FAFC', '#F1F5F9']}
                  style={styles.clearAllFiltersButtonGradient}
                />
                <MaterialCommunityIcons name="refresh" size={18} color="#64748B" />
                <Text style={styles.clearAllFiltersText}>Xóa tất cả</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={() => setShowAssignedFilterModal(false)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.applyFiltersButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <MaterialCommunityIcons 
                  name="check" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.applyFiltersButtonIcon}
                />
                <Text style={styles.applyFiltersText}>Áp dụng bộ lọc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assignee Selection Modal - Fixed Version */}
      <Modal
        visible={showAssigneeSelectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelAssigneeSelection}
        statusBarTranslucent={true}
      >
        {console.log('🎨 MODAL RENDER - showAssigneeSelectionModal:', showAssigneeSelectionModal)}
        {console.log('🎨 MODAL RENDER - currentAssigneeType:', currentAssigneeType)}
        {console.log('🎨 MODAL RENDER - assigneeData length:', assigneeData.length)}
        {console.log('🎨 MODAL RENDER - isLoadingAssignees:', isLoadingAssignees)}
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
            minHeight: 300,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
              backgroundColor: '#FAFBFC',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
              }}>
                Chọn {currentAssigneeType === 'USER' ? 'Cá nhân' : 
                        currentAssigneeType === 'UNIT' ? 'Tổ' : 'Đội'}
              </Text>
              <TouchableOpacity 
                onPress={cancelAssigneeSelection}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#F9FAFB',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {/* Content */}
            <View style={{ flex: 1, padding: 20 }}>
              {isLoadingAssignees ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={{ marginTop: 12, fontSize: 16, color: '#6B7280' }}>Đang tải...</Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: '#1F2937', marginBottom: 10 }}>
                    Tìm thấy: {assigneeData.length} {currentAssigneeType === 'USER' ? 'người dùng' : 
                                                    currentAssigneeType === 'UNIT' ? 'tổ' : 'đội'}
                  </Text>
                  {assigneeData.length === 0 ? (
                    <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 40 }}>
                      Không có dữ liệu
                    </Text>
                  ) : (
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                      {assigneeData.map((assignee, index) => {
                        const isSelected = selectedAssignees.some(selected => selected.id === assignee.id);
                        return (
                          <TouchableOpacity 
                            key={assignee.id || index} 
                            style={{
                              padding: 16,
                              borderWidth: 1,
                              borderColor: isSelected ? '#3B82F6' : '#E2E8F0',
                              borderRadius: 8,
                              marginBottom: 8,
                              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onPress={() => toggleAssigneeSelection(assignee)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                                {getAssigneeDisplayName(assignee, currentAssigneeType)}
                              </Text>
                              {currentAssigneeType === 'USER' && assignee.email && (
                                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{assignee.email}</Text>
                              )}
                            </View>
                            {isSelected && (
                              <View style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: '#3B82F6',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}>
                                <Ionicons name="checkmark" size={12} color="white" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
            
            {/* Actions */}
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
              gap: 12,
            }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
                onPress={cancelAssigneeSelection}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#64748B' }}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  flex: 2,
                  height: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#3B82F6',
                }}
                onPress={applyAssigneeSelections}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  Chọn ({selectedAssignees.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Quick View Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTaskModal}
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.taskModalOverlay}>
          <View style={styles.taskModalContainer}>
            <View style={styles.taskModalHeader}>
              <Text style={styles.taskModalTitle}>Chi tiết công việc</Text>
              <TouchableOpacity
                style={styles.taskModalCloseButton}
                onPress={() => setShowTaskModal(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.taskModalBody} showsVerticalScrollIndicator={false}>
              {selectedTask && (
                <TaskQuickView 
                  task={selectedTask}
                  onViewFullDetail={() => navigateToTaskDetail(selectedTask)}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Detail Modal */}
      <Modal
        visible={showFullDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeFullDetailModal}
      >
        <View style={styles.fullDetailContainer}>
          <View style={styles.fullDetailHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeFullDetailModal}
            >
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.fullDetailTitle}>Chi tiết Task</Text>
          </View>
          
          <ScrollView style={styles.fullDetailContent}>
            {selectedTaskForDetail && (
              <View style={styles.fullDetailBody}>
                {/* Task Overview */}
                <View style={styles.fullDetailSection}>
                  <Text style={styles.sectionTitle}>Thông tin chung</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tên task:</Text>
                    <Text style={styles.infoValue}>{selectedTaskForDetail.task_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mô tả:</Text>
                    <Text style={styles.infoValue}>{selectedTaskForDetail.description || 'Không có mô tả'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Loại task:</Text>
                    <Text style={styles.infoValue}>{selectedTaskForDetail.task_type || 'Không xác định'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trạng thái:</Text>
                    <Text style={[styles.infoValue, styles.statusValue, 
                      selectedTaskForDetail.status === 'completed' ? styles.statusCompleted :
                      selectedTaskForDetail.status === 'in_progress' ? styles.statusInProgress : 
                      styles.statusPending]}>
                      {selectedTaskForDetail.status === 'completed' ? 'Hoàn thành' :
                       selectedTaskForDetail.status === 'in_progress' ? 'Đang thực hiện' : 'Chờ xử lý'}
                    </Text>
                  </View>
                </View>

                {/* Creator Information */}
                <View style={styles.fullDetailSection}>
                  <Text style={styles.sectionTitle}>Người tạo</Text>
                  {extractUserInfo(selectedTaskForDetail.created_by) && (
                    <View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tên:</Text>
                        <Text style={styles.infoValue}>{extractUserInfo(selectedTaskForDetail.created_by).name}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Chức vụ:</Text>
                        <Text style={styles.infoValue}>{extractUserInfo(selectedTaskForDetail.created_by).role}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Đơn vị:</Text>
                        <Text style={styles.infoValue}>{extractUserInfo(selectedTaskForDetail.created_by).department}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Assigned Users */}
                {selectedTaskForDetail.assigned_users && selectedTaskForDetail.assigned_users.length > 0 && (
                  <View style={styles.fullDetailSection}>
                    <Text style={styles.sectionTitle}>Người được giao ({selectedTaskForDetail.assigned_users.length})</Text>
                    {selectedTaskForDetail.assigned_users.map((user, index) => {
                      const userInfo = extractUserInfo(user);
                      return userInfo ? (
                        <View key={index} style={styles.assignedUserCard}>
                          <Text style={styles.assignedUserName}>{userInfo.name}</Text>
                          <Text style={styles.assignedUserRole}>{userInfo.role}</Text>
                          <Text style={styles.assignedUserDept}>{userInfo.department}</Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* Time Information */}
                <View style={styles.fullDetailSection}>
                  <Text style={styles.sectionTitle}>Thông tin thời gian</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày tạo:</Text>
                    <Text style={styles.infoValue}>
                      {selectedTaskForDetail.created_at ? 
                        new Date(selectedTaskForDetail.created_at).toLocaleString('vi-VN') : 
                        'Không xác định'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày bắt đầu:</Text>
                    <Text style={styles.infoValue}>
                      {selectedTaskForDetail.start_date ? 
                        new Date(selectedTaskForDetail.start_date).toLocaleString('vi-VN') : 
                        'Chưa xác định'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày kết thúc:</Text>
                    <Text style={styles.infoValue}>
                      {selectedTaskForDetail.end_date ? 
                        new Date(selectedTaskForDetail.end_date).toLocaleString('vi-VN') : 
                        'Chưa xác định'}
                    </Text>
                  </View>
                </View>

                {/* Attachments */}
                {selectedTaskForDetail.attachments && selectedTaskForDetail.attachments.length > 0 && (
                  <View style={styles.fullDetailSection}>
                    <Text style={styles.sectionTitle}>File đính kèm ({selectedTaskForDetail.attachments.length})</Text>
                    {selectedTaskForDetail.attachments.map((attachment, index) => (
                      <View key={index} style={styles.attachmentItem}>
                        <MaterialCommunityIcons name="file-document" size={20} color="#666" />
                        <Text style={styles.attachmentName}>{attachment.name || `File ${index + 1}`}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Tree View Modal */}
      <Modal
        visible={showTreeViewModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeTreeViewModal}
      >
        <View style={styles.treeViewContainer}>
          <View style={styles.treeViewHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeTreeViewModal}
            >
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.treeViewTitle}>Cây Task</Text>
          </View>
          
          <ScrollView style={styles.treeViewContent}>
            {selectedTaskForTree && (
              <View style={styles.treeViewBody}>
                {/* Tree Statistics */}
                <View style={styles.treeStatsSection}>
                  <Text style={styles.sectionTitle}>Thống kê</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{flattenTaskTree(selectedTaskForTree).length}</Text>
                      <Text style={styles.statLabel}>Tổng task</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {flattenTaskTree(selectedTaskForTree).filter(t => t.status === 'completed').length}
                      </Text>
                      <Text style={styles.statLabel}>Hoàn thành</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {flattenTaskTree(selectedTaskForTree).filter(t => t.status === 'in_progress').length}
                      </Text>
                      <Text style={styles.statLabel}>Đang làm</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {flattenTaskTree(selectedTaskForTree).filter(t => !t.status || t.status === 'pending').length}
                      </Text>
                      <Text style={styles.statLabel}>Chờ xử lý</Text>
                    </View>
                  </View>
                </View>

                {/* Tree Visualization */}
                <View style={styles.treeVisualizationSection}>
                  <Text style={styles.sectionTitle}>Cây phân cấp</Text>
                  {renderTaskTree(selectedTaskForTree, 0)}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

    </Layout>
  );
};

const styles = StyleSheet.create({
  // Header Styles - Ultra compact design to maximize job list space
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,         // Giảm từ 4 xuống 2
    paddingBottom: 2,      // Giảm từ 4 xuống 2
    paddingHorizontal: 6,  // Giảm từ 8 xuống 6
    position: 'relative',
    shadowColor: '#7B1FA2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,    // Giảm từ 0.15 xuống 0.1
    shadowRadius: 1,       // Giảm từ 2 xuống 1
    elevation: 1,          // Giảm từ 2 xuống 1
    minHeight: 36,         // Giảm từ 40 xuống 36
  },
  backButton: {
    position: 'absolute',
    top: 2,                // Giảm từ 4 xuống 2
    left: 12,              // Giảm từ 16 xuống 12
    zIndex: 10,
    width: 28,             // Giảm từ 32 xuống 28
    height: 28,            // Giảm từ 32 xuống 28
    borderRadius: 14,      // Cập nhật border radius
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Giảm shadow
    shadowOpacity: 0.15,   // Giảm shadow opacity
    shadowRadius: 2,       // Giảm shadow radius
    elevation: 2,          // Giảm elevation
  },
  headerTitle: {
    fontSize: 16,          // Giảm từ 18 xuống 16
    fontWeight: '600',     // Giảm từ 700 xuống 600
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.2)', // Giảm từ 0.3 xuống 0.2
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,   // Giảm từ 2 xuống 1
    letterSpacing: 0.2,    // Giảm từ 0.3 xuống 0.2
  },

  // Job Type Tabs - Ultra compact để tối đa hóa không gian
  jobTypeContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 1,    // Giảm từ 2 xuống 1
    paddingHorizontal: 3,  // Giảm từ 4 xuống 3
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  jobTypeTabs: {
    flexDirection: 'row',
    gap: 4, // Giảm từ 6 xuống 4
  },
  jobTypeTab: {
    flex: 1,
    borderRadius: 12, // Cập nhật từ 8 lên 12
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFBFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  jobTypeTabActive: {
    borderColor: 'transparent',
    elevation: 2,
    shadowOpacity: 0.06,
    shadowRadius: 3,
    transform: [{ scale: 1.01 }],
  },
  jobTypeTabGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3, // Giảm từ 4 xuống 3
    paddingHorizontal: 2, // Giảm từ 3 xuống 2
    minHeight: 34, // Giảm từ 38 xuống 34
  },
  tabIconContainer: {
    marginBottom: 0, // Giảm từ 1 xuống 0
    padding: 0.5, // Giảm từ 1 xuống 0.5
    borderRadius: 3, // Giảm từ 4 xuống 3
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0, // Giảm từ 1 xuống 0
  },
  tabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0, // Giảm từ 1 xuống 0
  },
  tabCountBadge: {
    minWidth: 12, // Giảm từ 14 xuống 12
    height: 12, // Giảm từ 14 xuống 12
    borderRadius: 6, // Giảm từ 7 xuống 6
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1, // Giảm từ 2 xuống 1
    paddingHorizontal: 1, // Giảm từ 2 xuống 1
  },
  tabCountText: {
    fontSize: 8, // Giảm từ 9 xuống 8
    fontWeight: '700',
    lineHeight: 10, // Giảm từ 11 xuống 10
  },
  jobTypeTabText: {
    fontSize: 10, // Giảm từ 11 xuống 10
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2, // Giảm từ 3 xuống 2
    letterSpacing: 0.1,
    lineHeight: 13, // Giảm từ 14 xuống 13
  },
  tabDescriptionInline: {
    fontSize: 8, // Giảm từ 9 xuống 8
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 9, // Giảm từ 10 xuống 9
    paddingHorizontal: 1, // Giảm từ 2 xuống 1
    opacity: 0.85,
    fontWeight: '500',
    marginTop: 1, // Giảm từ 2 xuống 1
  },
  jobTypeTabTextActive: {
    color: 'white',
  },

  // Filter Section - Ultra compact
  filterContainer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 2, // Giảm từ 4 xuống 2
    paddingTop: 3, // Giảm từ 6 xuống 3
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
  },
  filterButton: {
    paddingHorizontal: 8, // Giảm từ 10 xuống 8
    paddingVertical: 4, // Giảm từ 6 xuống 4
    marginRight: 4, // Giảm từ 6 xuống 4
    borderRadius: 12, // Giảm từ 14 xuống 12
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 28, // Giảm từ 32 xuống 28
  },
  filterButtonActive: {
    backgroundColor: '#7B1FA2',
    borderColor: '#7B1FA2',
    shadowColor: '#7B1FA2',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    transform: [{ scale: 1.02 }],
  },
  filterText: {
    fontSize: 10, // Giảm từ 11 xuống 10
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '700',
  },

  // Total Count Display - Ultra compact
  totalCountContainer: {
    marginHorizontal: 4, // Giảm từ 6 xuống 4
    marginVertical: 2, // Giảm từ 3 xuống 2
    borderRadius: 4, // Giảm từ 6 xuống 4
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  totalCountGradient: {
    paddingHorizontal: 8, // Giảm từ 10 xuống 8
    paddingVertical: 4, // Giảm từ 6 xuống 4
    borderRadius: 4, // Giảm từ 6 xuống 4
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalCountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  totalCountIcon: {
    width: 18, // Giảm từ 22 xuống 18
    height: 18, // Giảm từ 22 xuống 18
    borderRadius: 9, // Giảm từ 11 xuống 9
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4, // Giảm từ 6 xuống 4
  },
  totalCountTextContainer: {
    flex: 1,
  },
  totalCountLabel: {
    fontSize: 9, // Giảm từ 10 xuống 9
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.1,
    marginBottom: 0, // Giảm từ 1 xuống 0
  },
  totalCountText: {
    fontSize: 10, // Giảm từ 11 xuống 10
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: 0.1,
  },
  totalCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
    paddingVertical: 2, // Giảm từ 3 xuống 2
    borderRadius: 8, // Giảm từ 10 xuống 8
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 18, // Giảm từ 22 xuống 18
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCountNumber: {
    fontSize: 10, // Giảm từ 11 xuống 10
    fontWeight: '700',
    color: '#475569',
  },

  // Main Container
  jobsContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Loading & Empty States - Within container only
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  noJobsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  noJobsTitle: {
    fontSize: 20, // Giảm từ 24 xuống 20
    fontWeight: '700',
    color: '#475569',
    marginTop: 16, // Giảm từ 24 xuống 16
    marginBottom: 12, // Giảm từ 16 xuống 12
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  noJobsDescription: {
    fontSize: 15, // Giảm từ 18 xuống 15
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22, // Giảm từ 26 xuống 22
    marginBottom: 32, // Giảm từ 40 xuống 32
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 32, // Tăng padding từ 24 lên 32
    paddingVertical: 18, // Tăng padding từ 14 lên 18
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#7B1FA2',
    shadowColor: '#7B1FA2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 56, // Đảm bảo chiều cao tối thiểu
  },
  refreshButtonText: {
    fontSize: 18, // Tăng font size từ 15 lên 18
    fontWeight: '700',
    color: '#7B1FA2',
    marginLeft: 10, // Tăng margin từ 8 lên 10
    letterSpacing: 0.3,
  },

  // Jobs List - Ultra compact
  jobsList: {
    padding: 8, // Giảm từ 12 xuống 8
    paddingBottom: 16, // Giảm từ 20 xuống 16
    backgroundColor: '#F8FAFC',
    minHeight: '100%',
  },
  jobCardContainer: {
    marginBottom: 2, // Giảm từ 4 xuống 2
    marginHorizontal: 0, // Giảm từ 1 xuống 0
    overflow: 'visible',
    position: 'relative', // Thêm để absolute positioning hoạt động
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 16, // Tăng từ 6 lên 16 để bo tròn nhiều hơn
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, // Giảm shadow từ 0.04 xuống 0.03
    shadowRadius: 2,     // Giảm từ 3 xuống 2
    elevation: 1,        
    overflow: 'hidden', // Đổi từ 'visible' thành 'hidden' để bo góc đúng cách
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 35, // Thêm padding bottom để có không gian cho action buttons
    minHeight: 60, // Giảm từ 90 xuống 60 (33% reduction)
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  priorityStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    zIndex: 2,
    borderTopLeftRadius: 16, // Bo góc trên trái theo jobCard
    borderBottomLeftRadius: 16, // Bo góc dưới trái theo jobCard
  },
  overdueCard: {
    borderWidth: 1,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.2,
  },
  cardHeader: {
    padding: 2, // Giảm từ 3 xuống 2
    paddingBottom: 1, // Giảm từ 2 xuống 1
    paddingLeft: 12, // Giảm từ 20 xuống 12
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderLeftWidth: 2,
    borderLeftColor: '#3B82F6',
    borderTopLeftRadius: 16, // Bo góc trên trái theo jobCard
    borderTopRightRadius: 16, // Bo góc trên phải theo jobCard
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0, // Giảm từ 1 xuống 0
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 2, // Giảm từ 3 xuống 2
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 80,
  },
  expandButton: {
    padding: 3, // Giảm từ 4 xuống 3
    marginRight: 3, // Giảm từ 4 xuống 3
    backgroundColor: '#FFFFFF',
    borderRadius: 5, // Giảm từ 6 xuống 5
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 20, // Giảm từ 24 xuống 20
    minHeight: 20, // Giảm từ 24 xuống 20
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseButton: {
    position: 'absolute',
    top: 3, // Giảm từ 6 xuống 3
    left: 4, // Giảm từ 8 xuống 4
    borderRadius: 8, // Giảm từ 10 xuống 8
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  
  collapseButtonGradient: {
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
    paddingVertical: 2, // Giảm từ 4 xuống 2
    borderRadius: 8, // Giảm từ 10 xuống 8
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18, // Giảm từ 24 xuống 18
    minHeight: 18, // Giảm từ 24 xuống 18
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Action Buttons Styles - Modern Glass Morphism Design (DEPRECATED - Not used anymore)
  // actionButtonsContainer: {
  //   position: 'absolute',
  //   top: 6,
  //   right: 6,
  //   flexDirection: 'row',
  //   zIndex: 20,
  //   gap: 6,
  // },
  // actionButton: {
  //   borderRadius: 10,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 3 },
  //   shadowOpacity: 0.18,
  //   shadowRadius: 4,
  //   elevation: 4,
  //   backgroundColor: 'rgba(255, 255, 255, 0.15)',
  //   backdropFilter: 'blur(10px)',
  // },
  // actionButtonGradient: {
  //   paddingHorizontal: 9,
  //   paddingVertical: 9,
  //   borderRadius: 10,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   minWidth: 34,
  //   minHeight: 34,
  //   borderWidth: 1,
  //   borderColor: 'rgba(255, 255, 255, 0.25)',
  // },

  // List View Action Buttons Styles - Modern Compact Design (DEPRECATED - Not used anymore)
  // listActionButtonsContainer: {
  //   position: 'absolute',
  //   top: 4,
  //   right: 4,
  //   flexDirection: 'row',
  //   zIndex: 15,
  //   gap: 4,
  // },
  // listActionButton: {
  //   borderRadius: 8,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.15,
  //   shadowRadius: 3,
  //   elevation: 3,
  //   backgroundColor: 'rgba(255, 255, 255, 0.12)',
  // },
  // listActionButtonGradient: {
  //   paddingHorizontal: 7,
  //   paddingVertical: 7,
  //   borderRadius: 8,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   minWidth: 28,
  //   minHeight: 28,
  //   borderWidth: 0.8,
  //   borderColor: 'rgba(255, 255, 255, 0.25)',
  // },

  // Bottom Action Buttons Styles - Redesigned with text at bottom corner
  bottomActionButtonsContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 3, // Giảm gap để 3 nút vừa trên 1 hàng
    zIndex: 1000, // Tăng z-index cao hơn mọi element khác (collapse button có z-index: 10)
    elevation: 25, // Tăng elevation cao cho Android
    pointerEvents: 'box-none', // Để các touch event hoạt động đúng
  },
  bottomActionButton: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Tăng shadow height
    shadowOpacity: 0.4, // Tăng shadow opacity
    shadowRadius: 6, // Tăng shadow radius
    elevation: 18, // Tăng elevation cao hơn
    backgroundColor: 'transparent', // Đảm bảo không có background xung đột
  },
  bottomActionButtonGradient: {
    paddingHorizontal: 4, // Giảm padding để 3 nút vừa trên 1 hàng
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2, // Giảm gap giữa icon và text
    minWidth: 48, // Giảm width để 3 nút vừa trên 1 hàng
    borderWidth: 2, // Tăng border width để nổi bật hơn
    borderColor: 'rgba(255, 255, 255, 0.7)', // Tăng opacity của border
  },
  bottomActionButtonText: {
    color: '#FFFFFF',
    fontSize: 9, // Giảm font size để vừa với button nhỏ hơn
    fontWeight: '700',
    textAlign: 'center',
  },

  // NEW: Inline Action Buttons Styles - Nằm trong card, cùng hàng với ngày tạo
  jobListBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4, // Giảm từ 8 xuống 4
    paddingTop: 4, // Giảm từ 8 xuống 4
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inlineActionButtonsContainer: {
    flexDirection: 'row',
    gap: 2, // Giảm từ 4 xuống 2
    alignItems: 'center',
  },
  inlineActionButton: {
    borderRadius: 12, // Tăng từ 6 lên 12 để bo tròn nhiều hơn
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    backgroundColor: 'transparent',
  },
  inlineActionButtonGradient: {
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
    paddingVertical: 2, // Giảm từ 3 xuống 2
    borderRadius: 12, // Tăng từ 6 lên 12 để bo tròn nhiều hơn
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1, // Giảm từ 2 xuống 1
    minWidth: 32, // Giảm từ 40 xuống 32
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  inlineActionButtonText: {
    color: '#FFFFFF',
    fontSize: 7, // Giảm từ 8 xuống 7
    fontWeight: '600',
    textAlign: 'center',
  },

  // Expanded Action Buttons Styles - Cho expanded view
  expandedActionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedActionButton: {
    borderRadius: 16, // Tăng từ 8 lên 16 để bo tròn nhiều hơn
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: 'transparent',
  },
  expandedActionButtonGradient: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16, // Tăng từ 8 lên 16 để bo tròn nhiều hơn
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  expandedActionButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // In-Card Action Buttons Styles - DEPRECATED - No longer used
  // inCardActionButtons: {
  //   position: 'absolute',
  //   top: 4,
  //   right: 4,
  //   flexDirection: 'row',
  //   gap: 3,
  //   zIndex: 25,
  //   elevation: 12,
  // },
  // inCardActionButton: {
  //   borderRadius: 5,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.3,
  //   shadowRadius: 3,
  //   elevation: 10,
  //   backgroundColor: 'transparent',
  // },
  // inCardActionButtonGradient: {
  //   width: 22,
  //   height: 22,
  //   borderRadius: 5,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   borderWidth: 0.5,
  //   borderColor: 'rgba(255, 255, 255, 0.5)',
  // },
  taskIdContainer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 4,
  },
  taskIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  // Task/Assignment separation styles
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  taskTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  taskCreatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
    maxWidth: 200,
  },
  taskCreatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
  },
  // Assignment section styles
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,  // Giảm từ 12 xuống 8
    paddingBottom: 6, // Giảm từ 10 xuống 6
    paddingHorizontal: 6, // Giảm từ 8 xuống 6
    borderBottomWidth: 2,
    borderBottomColor: '#FED7AA',
    backgroundColor: '#FEF9F3',
    borderRadius: 6,  // Giảm từ 8 xuống 6
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
  },
  assignmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C', // Màu cam đậm cho label
    marginLeft: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  assignmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  assignmentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  assignmentStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // No assignment styles - Made more compact
  noAssignmentContainer: {
    alignItems: 'center',
    paddingVertical: 8, // Reduced from 16
    backgroundColor: '#F8FAFC',
  },
  noAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Reduced from 10
  },
  noAssignmentLabel: {
    fontSize: 10, // Reduced from 12
    fontWeight: '600', // Reduced from 700
    color: '#9CA3AF',
    marginLeft: 6, // Reduced from 8
    letterSpacing: 0.3, // Reduced from 0.5
  },
  taskCreationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8, // Reduced from 12
    paddingVertical: 5, // Reduced from 8
    borderRadius: 8, // Reduced from 10
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6, // Reduced from 8
  },
  createdTextContainer: {
    alignItems: 'center',
  },
  createdLabel: {
    fontSize: 8, // Reduced from 10
    fontWeight: '500', // Reduced from 600
    color: '#9CA3AF',
    marginBottom: 1, // Reduced from 2
    textTransform: 'uppercase',
    letterSpacing: 0.3, // Reduced from 0.5
  },
  createdTime: {
    fontSize: 10, // Reduced from 12
    fontWeight: '600', // Reduced from 700
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, // Giảm từ 14 xuống 10
    paddingVertical: 6, // Giảm từ 8 xuống 6
    borderRadius: 16,
    gap: 4, // Giảm từ 6 xuống 4
    minHeight: 28, // Giảm từ 36 xuống 28
  },
  statusText: {
    fontSize: 12, // Giảm từ 14 xuống 12
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.2,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, // Giảm từ 14 xuống 10
    paddingVertical: 5, // Giảm từ 8 xuống 5
    borderRadius: 10,
    gap: 4, // Giảm từ 6 xuống 4
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 70, // Giảm từ 90 xuống 70
    flexShrink: 0,
    minHeight: 28, // Giảm từ 36 xuống 28
  },
  priorityEmoji: {
    fontSize: 10, // Giảm từ 12 xuống 10
  },
  priorityLabel: {
    fontSize: 10, // Giảm từ 12 xuống 10
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.2,
  },
  contentSection: {
    paddingHorizontal: 4, // Giảm từ 8 xuống 4
    paddingVertical: 3,   // Giảm từ 6 xuống 3
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  jobTitle: {
    fontSize: 12, // Giảm từ 14 xuống 12
    fontWeight: '700',
    color: '#111827',
    lineHeight: 14, // Giảm từ 16 xuống 14
    marginBottom: 2, // Giảm từ 3 xuống 2
  },
  jobDescription: {
    fontSize: 10, // Giảm từ 12 xuống 10
    color: '#6B7280',
    lineHeight: 12, // Giảm từ 14 xuống 12
  },
  progressSection: {
    paddingHorizontal: 10, // Giảm từ 12 xuống 10
    paddingVertical: 8,    // Giảm từ 12 xuống 8
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Giảm từ 12 xuống 8
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressIconContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10, // Tăng border radius từ 8 lên 10
    padding: 8, // Tăng padding từ 6 lên 8
    marginRight: 12, // Tăng margin từ 10 lên 12
  },
  progressTextContainer: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 12, // Tăng font size từ 10 lên 12
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4, // Tăng margin từ 3 lên 4
  },
  progressText: {
    fontSize: 16, // Tăng font size từ 12 lên 16
    fontWeight: '600',
    color: '#374151',
    lineHeight: 20, // Tăng line height từ 16 lên 20
  },
  progressPercentageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    position: 'relative',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressStartLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  progressEndLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  
  // Section Separator styles
  sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4, // Giảm từ 8 xuống 4
    paddingHorizontal: 6, // Giảm từ 12 xuống 6
    backgroundColor: '#FAFAFA',
  },
  
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  
  separatorTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6, // Giảm từ 12 xuống 6
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Giảm từ 12 xuống 8
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 3, // Giảm từ 6 xuống 3
  },
  
  separatorText: {
    fontSize: 8, // Giảm từ 10 xuống 8
    fontWeight: '700',
    color: '#C2410C',
    letterSpacing: 0.5, // Giảm từ 1 xuống 0.5
  },
  
  cardFooter: {
    paddingHorizontal: 4, // Giảm từ 8 xuống 4
    paddingVertical: 3,   // Giảm từ 6 xuống 3
    backgroundColor: '#F0FDF4', // Màu xanh lá nhạt cho Creation section
    borderTopWidth: 1,     
    borderTopColor: '#BBF7D0',
    borderLeftWidth: 2,    // Giảm từ 3 xuống 2
    borderLeftColor: '#22C55E',
    marginTop: 1,          // Giảm từ 2 xuống 1
  },
  roleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  userAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  roleTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  userFullName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  userPosition: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 1,
  },
  userDepartment: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8B5CF6',
    marginBottom: 1,
  },
  userEmail: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  userPhone: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '500',
    marginBottom: 1,
  },
  userUsername: {
    fontSize: 9,
    color: '#6B7280',
    fontStyle: 'italic',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  timeSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  deadlineTextContainer: {
    alignItems: 'flex-end',
  },
  deadlineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  assignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  assignedTextContainer: {
    alignItems: 'flex-end',
  },
  assignedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignedTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  subtasksContainer: {
    marginTop: 12, // Giảm từ 20 xuống 12
    marginHorizontal: 6, // Giảm từ 8 xuống 6
    backgroundColor: '#FFFFFF',
    borderRadius: 14, // Giảm từ 18 xuống 14
    borderWidth: 1, // Giảm từ 2 xuống 1
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Giảm shadow
    shadowOpacity: 0.06, // Giảm opacity
    shadowRadius: 8, // Giảm radius
    elevation: 3, // Giảm elevation
    overflow: 'hidden',
  },
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12, // Giảm từ 16 xuống 12
    paddingVertical: 8, // Giảm từ 12 xuống 8
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subtasksHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subtasksHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    marginRight: 8,
  },
  subtasksCountBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  subtasksCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  subtasksHeaderRight: {
    alignItems: 'flex-end',
  },
  subtasksCompletionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  subtasksRecursiveNote: {
    fontSize: 10,
    fontWeight: '400',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  subtasksContent: {
    paddingHorizontal: 16, // Tăng padding ngang
    paddingVertical: 12, // Tăng padding dọc
    backgroundColor: '#FAFBFC', // Thêm màu nền nhẹ để phân biệt
  },
  subtaskContainer: {
    marginBottom: 12, // Tăng margin giữa subtasks
    marginHorizontal: 4, // Thêm margin ngang
  },
  subtaskCard: {
    backgroundColor: 'white',
    borderRadius: 14, // Tăng border radius
    borderWidth: 2, // Tăng border width
    borderColor: '#D1D5DB', // Border rõ ràng hơn
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Tăng shadow
    shadowOpacity: 0.1, // Tăng độ mờ shadow
    shadowRadius: 6, // Tăng radius shadow
    elevation: 4, // Tăng elevation
    overflow: 'hidden',
  },
  priorityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    zIndex: 2,
  },
  hierarchyLevelIndicator: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 5,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hierarchyLevelText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#333',
  },
  hierarchyIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hierarchyLevelBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    textAlign: 'center',
    minWidth: 22,
    overflow: 'hidden',
  },
  subtaskContent: {
    flex: 1,
  },
  // Subtask Header - Task Information (similar to main task)
  subtaskHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F0F9FF', // Màu xanh nhạt cho Subtask header
    borderBottomWidth: 2,
    borderBottomColor: '#BFDBFE',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  subtaskHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtaskHeaderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  subtaskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  subtaskHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtaskIdContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  subtaskId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  subtaskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  subtaskTypeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 3,
    letterSpacing: 0.3,
  },
  subtaskCreatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
    maxWidth: 150,
  },
  subtaskCreatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
    flex: 1,
  },
  subtaskPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  subtaskPriorityEmoji: {
    fontSize: 8,
  },
  subtaskPriorityLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.2,
  },
  subtaskStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    gap: 3,
  },
  subtaskStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  // Subtask Content Section
  subtaskContentSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  subtaskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 18,
  },
  subtaskDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  // Subtask Footer - Assignment Information (similar to main task)
  subtaskFooter: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFBF0', // Màu vàng nhạt cho Subtask assignment
    borderTopWidth: 2,
    borderTopColor: '#FDE68A',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  subtaskAssignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#FDE68A',
    backgroundColor: '#FEF3C7', // Màu vàng nhạt cho subtask assignment header
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B',
  },
  subtaskAssignmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtaskAssignmentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtaskAssignmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  subtaskAssignmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  subtaskRoleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subtaskUserAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  subtaskUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subtaskUserAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subtaskRoleTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subtaskRoleLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtaskRoleName: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  subtaskTimeSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtaskDeadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  subtaskDeadlineTextContainer: {
    alignItems: 'flex-end',
  },
  subtaskDeadlineLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtaskDeadlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  subtaskAssignmentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  subtaskAssignmentStatusText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // No assignment styles for subtask - Made more compact
  subtaskNoAssignmentContainer: {
    alignItems: 'center',
    paddingVertical: 8, // Reduced from 12
    backgroundColor: '#FCFCFD',
  },
  subtaskNoAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5, // Reduced from 8
  },
  subtaskNoAssignmentLabel: {
    fontSize: 9, // Reduced from 10
    fontWeight: '600', // Reduced from 700
    color: '#9CA3AF',
    marginLeft: 5, // Reduced from 6
    letterSpacing: 0.3, // Reduced from 0.5
  },
  subtaskCreationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8, // Reduced from 10
    paddingVertical: 4, // Reduced from 6
    borderRadius: 6, // Reduced from 8
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 5, // Reduced from 6
  },
  subtaskCreatedTextContainer: {
    alignItems: 'center',
  },
  subtaskCreatedLabel: {
    fontSize: 7, // Reduced from 8
    fontWeight: '500', // Reduced from 600
    color: '#9CA3AF',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3, // Reduced from 0.5
  },
  subtaskCreatedTime: {
    fontSize: 9, // Reduced from 10
    fontWeight: '600', // Reduced from 700
    color: '#6B7280',
  },
  // Enhanced user container styles for subtask
  subtaskUserAvatarWrapper: {
    position: 'relative',
    marginRight: 2,
  },
  // Enhanced user container styles
  userAvatarWrapper: {
    position: 'relative',
    marginRight: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  assignmentRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assignmentRoleLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  departmentSeparator: {
    fontSize: 8,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  userDepartmentMini: {
    fontSize: 9,
    fontWeight: '500',
    color: '#8B5CF6',
    fontStyle: 'italic',
    flex: 1,
  },
  subtaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 6,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nestedSubtasks: {
    marginTop: 8,
  },

  // New styles for "created" tab filters
  createdTabFilters: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,    // Giảm từ 12 xuống 8
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Search & Filter trong cùng một dòng
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // New styles for "assigned" tab filters
  assignedTabFilters: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,    // Giảm từ 12 xuống 8 (thống nhất với createdTabFilters)
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,                // Giảm từ 12 xuống 8
  },
  searchContainer: {
    flex: 1,  // Chiếm phần lớn không gian
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    height: 32, // Giảm từ 36 xuống 32
  },
  searchIcon: {
    marginRight: 6, // Giảm từ 8 xuống 6
  },
  searchInput: {
    flex: 1,
    fontSize: 13, // Giảm từ 14 xuống 13
    color: '#374151',
    fontWeight: '400',
  },
  clearSearchButton: {
    padding: 3, // Giảm từ 4 xuống 3
    marginLeft: 1, // Giảm từ 2 xuống 1
  },
  
  // Filter button styles - Compact với active state rõ ràng
  filterButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,           // Giảm từ 10 xuống 8
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 10,     // Giảm từ 12 xuống 10
    paddingVertical: 6,        // Giảm từ 8 xuống 6
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 32,             // Đảm bảo cùng chiều cao với search
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6', // Nền xanh đậm khi active
    borderColor: '#2563EB',     // Viền xanh đậm hơn
    shadowColor: '#3B82F6',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 1.02 }],
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,                     // Giảm gap
  },
  filterButtonText: {
    fontSize: 13,               // Giảm từ 14 xuống 13
    fontWeight: '600',
    color: '#3B82F6',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',           // Text trắng khi active
  },
  filterActiveBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterActiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  
  createdFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersRow: {
    gap: 12,
  },
  priorityFilterContainer: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  priorityScroll: {
    flexDirection: 'row',
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  priorityTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateFilterContainer: {
    marginBottom: 8,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  dateButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Modal styles for filter - Modern and beautiful design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Darker, more elegant overlay
    justifyContent: 'flex-end',
    backdropFilter: 'blur(8px)',
  },
  
  // Filter Modal Styles - Larger size for assigned tab
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    minHeight: '60%',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    overflow: 'hidden',
  },
  
  filterModalHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  
  filterModalHeaderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  filterModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  
  filterModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  
  filterModalIcon: {
    marginRight: 6,
  },
  
  filterModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.1,
  },
  
  filterModalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  
  // Modal Handle Bar - Smaller
  modalHandleBar: {
    width: 28,
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  
  filterModalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flex: 1,
  },
  
  filterModalScrollContent: {
    paddingBottom: 20,
  },
  
  filterSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  
  filterSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 5,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  
  // Date button active states
  dateModalButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  
  dateModalButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  
  dateSeparatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  
  // Enhanced date validation error
  dateValidationErrorIcon: {
    marginRight: 8,
  },
  
  // Priority Multi-Select - Enhanced with dynamic colors and larger buttons
  priorityMultiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  
  priorityMultiSelectButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  
  priorityMultiSelectText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  
  // Assignee Type Multi-Select - Compact design
  assigneeTypeMultiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Giảm từ 14 xuống 8
    marginBottom: 12, // Giảm từ 16 xuống 12
  },
  
  assigneeTypeMultiSelectButton: {
    flex: 1,
    minWidth: '30%', // Allow 3 buttons per row (30% x 3 = 90% + gaps)
    paddingVertical: 12, // Giảm từ 22 xuống 12
    paddingHorizontal: 12, // Giảm từ 20 xuống 12
    borderRadius: 12, // Giảm từ 20 xuống 12
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 }, // Giảm từ 6 xuống 2
    shadowOpacity: 0.08, // Giảm từ 0.12 xuống 0.08
    shadowRadius: 4, // Giảm từ 8 xuống 4
    elevation: 2, // Giảm từ 6 xuống 2
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row', // Icon and text in a row
    minHeight: 50, // Giảm từ 88 xuống 50
    borderTopWidth: 2, // Giảm từ 3 xuống 2
    borderTopColor: 'transparent', // Sẽ được override bởi màu dynamic
  },
  
  assigneeTypeMultiSelectText: {
    fontSize: 13, // Giảm từ 17 xuống 13
    fontWeight: '700', // Giảm từ 800 xuống 700
    letterSpacing: 0.2, // Giảm từ 0.4 xuống 0.2
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.08)', // Giảm từ 0.1 xuống 0.08
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1, // Giảm từ 2 xuống 1
  },
  
  // Assignee type button content layout
  assigneeTypeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  
  assigneeTypeButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  assigneeTypeButtonBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  
  assigneeTypeButtonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  
  // Count badge for assignee type buttons
  assigneeTypeCountBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  
  assigneeTypeCountText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  
  // Selected priorities display - Larger for better visibility
  selectedPrioritiesContainer: {
    marginBottom: 18, // Add space below selected chips
    flexDirection: 'column',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  
  // Selected priorities label
  selectedPrioritiesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  selectedPrioritiesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  
  selectedPriorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  selectedPriorityChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  selectedPriorityRemoveButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Selected assignees display - Compact design
  selectedAssigneesContainer: {
    marginBottom: 16, // Giảm từ 28 xuống 16
    flexDirection: 'column',
    paddingVertical: 12, // Giảm từ 24 xuống 12
    paddingHorizontal: 16, // Giảm từ 24 xuống 16
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // Giảm từ 24 xuống 16
    borderWidth: 0,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 }, // Giảm từ 8 xuống 4
    shadowOpacity: 0.12, // Giảm từ 0.15 xuống 0.12
    shadowRadius: 8, // Giảm từ 16 xuống 8
    elevation: 4, // Giảm từ 8 xuống 4
    borderTopWidth: 2, // Giảm từ 3 xuống 2
    borderTopColor: '#3B82F6',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E7FF',
    borderRightWidth: 1,
    borderRightColor: '#E0E7FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  
  selectedAssigneesLabel: {
    fontSize: 14, // Giảm từ 20 xuống 14
    fontWeight: '700', // Giảm từ 800 xuống 700
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5, // Giảm từ 1.2 xuống 0.5
    marginBottom: 4, // Giảm từ 6 xuống 4
    textShadowColor: 'rgba(30, 64, 175, 0.2)', // Giảm từ 0.3 xuống 0.2
    textShadowOffset: { width: 0, height: 1 }, // Giảm từ 2 xuống 1
    textShadowRadius: 2, // Giảm từ 4 xuống 2
  },
  
  selectedAssigneesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Giảm từ 16 xuống 8
    marginTop: 4, // Giảm từ 8 xuống 4
    alignItems: 'flex-start',
  },
  
  selectedAssigneeChip: {
    flexDirection: 'row',
    alignItems: 'center', // Quay lại center cho compact hơn
    paddingVertical: 10, // Giảm từ 18 xuống 10
    paddingHorizontal: 14, // Giảm từ 22 xuống 14
    borderRadius: 20, // Giảm từ 28 xuống 20
    maxWidth: '100%',
    minWidth: 120, // Giảm từ 160 xuống 120
    minHeight: 40, // Giảm từ 64 xuống 40
    shadowOffset: { width: 0, height: 3 }, // Giảm từ 6 xuống 3
    shadowOpacity: 0.15, // Giảm từ 0.25 xuống 0.15
    shadowRadius: 6, // Giảm từ 12 xuống 6
    elevation: 3, // Giảm từ 10 xuống 3
    borderWidth: 0,
    marginBottom: 6, // Giảm từ 10 xuống 6
    flexShrink: 0,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  
  selectedAssigneeChipContent: {
    flexDirection: 'row',
    alignItems: 'center', // Quay lại center cho compact hơn
    flex: 1,
    marginRight: 8, // Giảm từ 12 xuống 8
    minWidth: 0,
  },
  
  selectedAssigneeChipText: {
    color: '#FFFFFF',
    fontSize: 14, // Giảm từ 19 xuống 14
    fontWeight: '700',
    letterSpacing: 0.3, // Giảm từ 0.5 xuống 0.3
    marginLeft: 8, // Giảm từ 12 xuống 8
    textShadowColor: 'rgba(0,0,0,0.3)', // Giảm từ 0.4 xuống 0.3
    textShadowOffset: { width: 0, height: 1 }, // Giảm từ 2 xuống 1
    textShadowRadius: 4, // Tăng shadow radius từ 3 lên 4
    flex: 1,
    textAlign: 'left',
    includeFontPadding: false, // Android specific - reduces extra padding
    lineHeight: 26, // Tăng line height từ 24 lên 26
    flexWrap: 'wrap', // Cho phép text xuống dòng
    minHeight: 26, // Tăng chiều cao tối thiểu từ 24 lên 26
  },
  
  selectedAssigneeRemoveButton: {
    width: 20, // Giảm từ 32 xuống 20 (đã có inline override)
    height: 20, // Giảm từ 32 xuống 20 (đã có inline override)
    borderRadius: 10, // Giảm từ 16 xuống 10 (đã có inline override)
    backgroundColor: 'rgba(255,255,255,0.3)', // Tăng opacity lên 0.3 để dễ thấy hơn
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 0, // Giảm từ 2 xuống 0
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 }, // Giảm từ 2 xuống 1
    shadowOpacity: 0.1, // Giảm từ 0.15 xuống 0.1
    shadowRadius: 2, // Giảm từ 4 xuống 2
    elevation: 1, // Giảm từ 3 xuống 1
  },

  // Assignee search container styles
  assigneeSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  assigneeSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  
  assigneeSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '400',
  },
  
  // Date Range Filter - Larger buttons for better UX
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  
  dateModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    gap: 8,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  
  dateModalButtonText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  
  dateSeparator: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    minWidth: 32,
  },
  
  // Priority option button styles
  priorityOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityOptionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  priorityOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Filter Modal Actions - More spacious bottom bar
  filterModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
    gap: 14,
  },
  
  clearAllFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 7,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  
  clearAllFiltersButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  clearAllFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.1,
    zIndex: 1,
  },
  
  applyFiltersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    marginLeft: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
    gap: 7,
  },
  
  applyFiltersButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  applyFiltersButtonIcon: {
    zIndex: 1,
  },
  
  applyFiltersText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 1,
  },

  // Date Picker Section - Elegant design
  datePickerSection: {
    marginTop: 18,
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Focused state for date picker section
  datePickerSectionFocused: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  
  datePicker: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  
  datePickerDoneButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Date validation error styles - Improved design
  dateValidationError: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  
  dateValidationErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  
  // Multi-select priority styles
  priorityMultiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityMultiSelectButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityMultiSelectButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityMultiSelectText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  priorityMultiSelectTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Compact job list styles
  jobListItemContainer: {
    marginBottom: 4, // Giảm từ 12 xuống 4 để thu gọn khoảng cách
    paddingHorizontal: 16,
    overflow: 'visible', // Đảm bảo priority không bị cắt
    position: 'relative', // Thêm để absolute positioning hoạt động
  },
  
  jobListItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Tăng từ 16 lên 20 để bo tròn nhiều hơn
    padding: 8, // Giảm từ 14 xuống 8 để thu gọn
    paddingBottom: 32, // Giảm từ 40 xuống 32 cho action buttons
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden', // Đổi từ 'visible' thành 'hidden' để bo góc đúng cách
    minHeight: 80,
    transform: [{ scale: 1 }], // Thêm để chuẩn bị cho animation
  },
  
  jobListItemOverdue: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFB',
  },
  
  jobListPriorityStripe: {
    width: 4,
    height: '100%',
    borderRadius: 6, // Tăng từ 2 lên 6 để bo tròn nhiều hơn
    marginRight: 12,
  },
  
  jobListContent: {
    flex: 1,
  },
  
  jobListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4, // Giảm từ 6 xuống 4
    minHeight: 20, // Giảm từ 24 xuống 20
  },
  
  jobListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  
  jobListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Căn đều để priority có chỗ
    marginBottom: 2, // Giảm từ 4 xuống 2
    minHeight: 20, // Giảm từ 24 xuống 20
  },
  
  jobListRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    minWidth: 120, // Tăng để có đủ chỗ cho priority badge
    gap: 6, // Thêm gap để các element không dính nhau
  },
  
  jobListIdContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4, // Giảm margin
    flexShrink: 0, // Không cho phép thu nhỏ
  },
  
  jobListIdText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  jobListPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
    maxWidth: 55,
    minWidth: 40,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  
  jobListPriorityEmoji: {
    fontSize: 9,
    marginRight: 3,
  },
  
  jobListPriorityText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  jobListSubtasksBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4, // Giảm margin để tiết kiệm không gian
    flexShrink: 0, // Không cho phép thu nhỏ
  },
  
  jobListSubtasksText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 2,
  },
  
  jobListDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginRight: 4,
  },
  
  expandIconContainer: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 16,
  },
  
  expandIconGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  jobListExpandIcon: {
    opacity: 0.6,
  },
  
  jobListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 3, // Giảm từ 6 xuống 3
    lineHeight: 16, // Giảm từ 18 xuống 16
  },
  
  jobListFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 2, // Thêm margin top nhỏ
    paddingTop: 2, // Thêm padding top nhỏ
  },
  
  jobListStatusBadge: {
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
    paddingVertical: 1, // Giảm từ 2 xuống 1
    borderRadius: 12, // Tăng từ 4 lên 12 để bo tròn nhiều hơn
    marginRight: 4, // Giảm từ 6 xuống 4
  },
  
  jobListStatusText: {
    fontSize: 8, // Giảm từ 9 xuống 8
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  jobListDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4, // Giảm từ 6 xuống 4
  },
  
  jobListDeadlineText: {
    fontSize: 8, // Giảm từ 9 xuống 8
    color: '#F59E0B',
    marginLeft: 1, // Giảm từ 2 xuống 1
    fontWeight: '500',
  },
  
  jobListDeadlineOverdue: {
    color: '#EF4444',
    fontWeight: '600',
  },
  
  jobListCreatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
    paddingVertical: 1, // Giảm từ 2 xuống 1
    borderRadius: 6, // Giảm từ 8 xuống 6
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  
  jobListCreatedText: {
    fontSize: 8, // Giảm từ 10 xuống 8
    color: '#22C55E',
    fontWeight: '500',
    marginLeft: 2, // Giảm từ 3 xuống 2
  },

  // Assignee Type Button Styles
  assigneeTypeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  assigneeTypeButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assigneeTypeCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  assigneeTypeCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Assignee Selection Modal Styles
  assigneeSelectionModal: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 50,
    borderRadius: 20,
    maxHeight: '85%',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  assigneeSelectionModalHeader: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  assigneeSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  assigneeSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  selectedAssigneesCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectedAssigneesCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  assigneeListContainer: {
    flex: 1,
    minHeight: 300,
  },
  assigneeLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  assigneeLoadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  assigneeScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  assigneeItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.1,
  },
  assigneeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assigneeItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  assigneeItemTextContainer: {
    flex: 1,
  },
  assigneeItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  assigneeItemNameSelected: {
    color: '#3B82F6',
  },
  assigneeItemEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 1,
  },
  assigneeItemId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  assigneeItemTeam: {
    fontSize: 13,
    color: '#6B7280',
  },
  assigneeItemMemberCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  assigneeItemRight: {
    marginLeft: 12,
  },
  noAssigneesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noAssigneesText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  assigneeSelectionModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  assigneeCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  assigneeApplyButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  assigneeApplyButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeApplyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Task Quick View Modal Styles
  taskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  taskModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '50%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  taskModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  taskModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  taskModalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // TaskQuickView Component Styles
  taskQuickView: {
    paddingVertical: 20,
  },
  quickViewHeader: {
    marginBottom: 16,
  },
  quickViewHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickViewIdContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickViewIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  quickViewPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickViewPriorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickViewHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickViewStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickViewStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  quickViewCreatedAt: {
    fontSize: 12,
    color: '#64748B',
  },
  quickViewContent: {
    marginBottom: 20,
  },
  quickViewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 24,
  },
  quickViewDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  quickViewCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  quickViewCreatorIcon: {
    marginRight: 10,
  },
  quickViewCreatorInfo: {
    flex: 1,
  },
  quickViewCreatorLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  quickViewCreatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  quickViewAssignment: {
    backgroundColor: '#FEF3E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  quickViewAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickViewAssignmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
    marginLeft: 8,
    flex: 1,
  },
  quickViewAssignmentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickViewAssignmentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickViewAssignmentDetails: {
    gap: 8,
  },
  quickViewAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quickViewAssignmentKey: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    minWidth: 80,
  },
  quickViewAssignmentValue: {
    fontSize: 13,
    color: '#451A03',
    fontWeight: '500',
    flex: 1,
  },
  quickViewOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  quickViewSubtasks: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  quickViewSubtasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickViewSubtasksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginLeft: 8,
    flex: 1,
  },
  quickViewSubtasksBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  quickViewSubtasksBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickViewSubtasksList: {
    gap: 8,
  },
  quickViewSubtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  quickViewSubtaskPriority: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  quickViewSubtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  quickViewSubtaskStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickViewSubtaskStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickViewSubtasksMore: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  quickViewAttachments: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  quickViewAttachmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickViewAttachmentsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginLeft: 8,
    flex: 1,
  },
  quickViewAttachmentsBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  quickViewAttachmentsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickViewAttachmentsList: {
    gap: 6,
  },
  quickViewAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
  },
  quickViewAttachmentName: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 6,
    flex: 1,
  },
  quickViewAttachmentsMore: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  quickViewActions: {
    marginTop: 20,
  },
  quickViewFullDetailButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  quickViewFullDetailGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  quickViewFullDetailText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Creation Info Styles for Full Card
  creationInfoContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6, // Giảm từ 12 xuống 6
    padding: 6, // Giảm từ 12 xuống 6
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  creationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2, // Giảm từ 10 xuống 2
  },
  
  creationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creationLabel: {
    fontSize: 9, // Giảm từ 11 xuống 9
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 3, // Giảm từ 6 xuống 3
    letterSpacing: 0.3, // Giảm từ 0.5 xuống 0.3
  },
  
  creationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 4, // Giảm từ 6 xuống 4
    paddingVertical: 1, // Giảm từ 2 xuống 1
    borderRadius: 4, // Giảm từ 6 xuống 4
    gap: 2, // Giảm từ 3 xuống 2
  },
  
  creationBadgeText: {
    fontSize: 8, // Giảm từ 9 xuống 8
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  creationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  creationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  creationIconContainer: {
    marginRight: 6, // Giảm từ 10 xuống 6
  },
  
  creationIconFallback: {
    width: 20, // Giảm từ 32 xuống 20
    height: 20, // Giảm từ 32 xuống 20
    borderRadius: 10, // Giảm từ 16 xuống 10
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  creationTextContainer: {
    flex: 1,
  },
  
  creationInfoLabel: {
    fontSize: 9, // Giảm từ 11 xuống 9
    color: '#6B7280',
    fontWeight: '500',
  },
  
  creationDate: {
    fontSize: 10, // Giảm từ 13 xuống 10
    color: '#22C55E',
    fontWeight: '600',
    marginTop: 1,
  },
  
  creatorSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creatorTextContainer: {
    marginLeft: 3, // Giảm từ 6 xuống 3
    alignItems: 'flex-end',
  },
  
  creatorLabel: {
    fontSize: 8, // Giảm từ 10 xuống 8
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  creatorName: {
    fontSize: 9, // Giảm từ 12 xuống 9
    color: '#374151',
    fontWeight: '600',
    marginTop: 1,
  },

  // Creation Info Styles (compact design)
  creationInfoContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  
  creationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  creationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  
  creationBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creationBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'white',
    marginLeft: 2,
    letterSpacing: 0.3,
  },
  
  creationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  creationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  creationIconContainer: {
    marginRight: 8,
  },
  
  creationIconFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  creationTextContainer: {
    flex: 1,
  },
  
  creationInfoLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  creationDate: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
    marginTop: 1,
  },
  
  creatorSection: {
    alignItems: 'flex-end',
    maxWidth: 120,
  },
  
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  creatorTextContainer: {
    marginLeft: 4,
    alignItems: 'flex-end',
  },

  // Full Detail Modal Styles
  fullDetailContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fullDetailHeader: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fullDetailTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  closeButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullDetailContent: {
    flex: 1,
    padding: 15,
  },
  fullDetailBody: {
    flex: 1,
  },
  fullDetailSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 120,
    marginRight: 10,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '400',
  },
  statusValue: {
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: 'center',
    minWidth: 80,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E8',
    color: '#2E7D32',
  },
  statusInProgress: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  statusPending: {
    backgroundColor: '#F3E5F5',
    color: '#7B1FA2',
  },
  assignedUserCard: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  assignedUserName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  assignedUserRole: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  assignedUserDept: {
    fontSize: 12,
    color: '#888',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },

  // Tree View Modal Styles
  treeViewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  treeViewHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  treeViewTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  treeViewContent: {
    flex: 1,
    padding: 15,
  },
  treeViewBody: {
    flex: 1,
  },
  treeStatsSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  treeVisualizationSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  treeTaskContainer: {
    marginBottom: 5,
  },
  treeTaskItem: {
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  treeLevelLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ddd',
  },
  treeTaskContent: {
    flex: 1,
  },
  treeTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  treeTaskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  treeIcon: {
    marginRight: 5,
  },
  treeTaskName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  treeTaskStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  treeStatusCompleted: {
    backgroundColor: '#E8F5E8',
  },
  treeStatusInProgress: {
    backgroundColor: '#FFF3E0',
  },
  treeStatusPending: {
    backgroundColor: '#F3E5F5',
  },
  treeStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  treeTaskDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
    lineHeight: 16,
  },
  treeTaskAssigned: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '500',
  },
  treeSubtasks: {
    marginLeft: 15,
  },
});

// Job utility functions for future use
export const JobUtils = {
  // Get job by ID with subtasks
  getJobById: async (jobId) => {
    try {
      const response = await httpApiClient.get(`tasks/${jobId}?includeSubtasks=true`);
      if (response.ok) {
        const responseData = await response.json();
        return responseData.data || responseData;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Error fetching job:', error);
      throw error;
    }
  },

  // Update job status
  updateJobStatus: async (jobId, status) => {
    try {
      const response = await httpApiClient.patch(`tasks/${jobId}/status`, {
        json: { status }
      });
      if (response.ok) {
        const responseData = await response.json();
        return responseData.data || responseData;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  },

  // Create new job with subtasks
  createJob: async (jobData) => {
    try {
      const response = await httpApiClient.post('tasks', {
        json: jobData
      });
      if (response.ok) {
        const responseData = await response.json();
        return responseData.data || responseData;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  },

  // Create subtask
  createSubtask: async (parentTaskId, subtaskData) => {
    try {
      const response = await httpApiClient.post('tasks', {
        json: { ...subtaskData, parentTaskId }
      });
      if (response.ok) {
        const responseData = await response.json();
        return responseData.data || responseData;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Error creating subtask:', error);
      throw error;
    }
  },
};

export default MyJobsScreen;
