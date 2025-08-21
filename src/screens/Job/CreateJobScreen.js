import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Layout from '../Common/Layout';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import httpApiClient from '../../services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import ImageViewing from 'react-native-image-viewing';  

const CreateJobScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    instructions: '',
    notes: '',
    priority: 'MEDIUM',
    assignments: [{
      recipientId: '',
      recipientType: 'USER',
      dueAt: new Date(),
      note: ''
    }],
    attachmentIds: [],
  });

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // File upload states
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedAttachmentIds, setUploadedAttachmentIds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [isTeamModalVisible, setTeamModalVisible] = useState(false);
  const [isUnitModalVisible, setUnitModalVisible] = useState(false);
  const [isUserModalVisible, setUserModalVisible] = useState(false);
  const [teams, setTeams] = useState([]);
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingButtonTeam, setLoadingButtonTeam] = useState(false);
  const [loadingButtonUnit, setLoadingButtonUnit] = useState(false);
  const [loadingButtonUser, setLoadingButtonUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);
  const [tempSelectedTeams, setTempSelectedTeams] = useState([]);
  const [tempSelectedUnits, setTempSelectedUnits] = useState([]);
  
  // Preview states
  const [isImageViewVisible, setImageViewVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState([]);
  const [isDocumentPreviewVisible, setDocumentPreviewVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);



  const priorities = [
    { label: 'Khẩn cấp 🔴', value: 'URGENT', color: '#F44336' },
    { label: 'Cao 🟡', value: 'HIGH', color: '#FF9800' },
    { label: 'Bình thường 🟢', value: 'NORMAL', color: '#4CAF50' },
    { label: 'Thấp 🔵', value: 'LOW', color: '#2196F3' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssignmentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      assignments: prev.assignments.map((assignment, i) => 
        i === index ? { ...assignment, [field]: value } : assignment
      )
    }));
  };

  const handleDateConfirm = (date) => {
    setFormData(prev => ({
      ...prev,
      assignments: prev.assignments.map((assignment, i) => 
        i === 0 ? { ...assignment, dueAt: date } : assignment
      )
    }));
    setDatePickerVisibility(false);
  };

  const handleFileUpload = () => {
    Alert.alert(
      '📎 Chọn file đính kèm',
      'Hỗ trợ: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), Ảnh (JPG/PNG/GIF), Text (.txt)',
      [
        {
          text: '📷 Chụp ảnh',
          onPress: openCamera,
        },
        {
          text: '🖼️ Thư viện ảnh',
          onPress: openImageGallery,
        },
        {
          text: '📁 Chọn file tài liệu',
          onPress: openDocumentPicker,
        },
        {
          text: '❌ Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const openCamera = async () => {
    try {
      console.log('📷 Opening camera...');
      
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '🚫 Quyền truy cập camera',
          'Ứng dụng cần quyền truy cập camera để chụp ảnh. Vui lòng cấp quyền trong Settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      console.log('📷 Camera result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processImageAssets(result.assets, 'Camera');
      }
    } catch (error) {
      console.error('🚨 Camera error:', error);
      Alert.alert('❌ Lỗi camera', `Không thể mở camera:\n\n${error.message}`);
    }
  };

  const openImageGallery = async () => {
    try {
      console.log('🖼️ Opening image gallery...');
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '🚫 Quyền truy cập thư viện ảnh',
          'Ứng dụng cần quyền truy cập thư viện ảnh. Vui lòng cấp quyền trong Settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
      });

      console.log('🖼️ Gallery result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processImageAssets(result.assets, 'Gallery');
      }
    } catch (error) {
      console.error('🚨 Gallery error:', error);
      Alert.alert('❌ Lỗi thư viện ảnh', `Không thể mở thư viện ảnh:\n\n${error.message}`);
    }
  };

  const openDocumentPicker = async () => {
    try {
      console.log('📁 Opening document picker...');
      
      // Hiển thị picker với những loại file được backend hỗ trợ
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',                    // PDF files
          'application/msword',                 // Word .doc files
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word .docx files
          'application/vnd.ms-excel',           // Excel .xls files
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // Excel .xlsx files
          'image/jpeg',                         // JPEG images
          'image/png',                          // PNG images
          'image/gif',                          // GIF images
          'text/plain'                          // Text files
        ],
        multiple: true, // Cho phép chọn nhiều file
        copyToCacheDirectory: true, // Copy vào cache để có thể đọc
      });

      console.log('📄 Document picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processDocumentAssets(result.assets, 'Documents');
      }
    } catch (error) {
      console.error('🚨 Document picker error:', error);
      Alert.alert('❌ Lỗi chọn file', `Không thể mở trình chọn file:\n\n${error.message}`);
    }
  };

  const processImageAssets = async (assets, source) => {
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    const validFiles = [];
    const invalidFiles = [];

    for (const asset of assets) {
      console.log(`🖼️ Processing image from ${source}: ${asset.fileName || 'image'}`);
      console.log(`  • Size: ${asset.fileSize ? (asset.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}`);
      console.log(`  • URI: ${asset.uri}`);

      // For images from camera/gallery, we need to estimate or get actual file size
      const fileSize = asset.fileSize || asset.size || 0;
      
      // Determine file name and extension properly
      let fileName = asset.fileName || asset.name;
      if (!fileName) {
        // Default to jpg for camera, but try to detect from URI for gallery
        const extension = asset.uri ? asset.uri.split('.').pop()?.toLowerCase() : 'jpg';
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        const finalExtension = validExtensions.includes(extension) ? extension : 'jpg';
        fileName = `image_${Date.now()}.${finalExtension}`;
      }
      
      // Determine correct MIME type based on file extension
      const getImageMimeType = (fileName) => {
        const extension = fileName.toLowerCase().split('.').pop();
        switch (extension) {
          case 'png': return 'image/png';
          case 'gif': return 'image/gif';
          case 'jpg':
          case 'jpeg':
          default: return 'image/jpeg';
        }
      };
      
      const mimeType = getImageMimeType(fileName);
      
      console.log(`📸 Processing image: ${fileName} → MIME: ${mimeType}, Size: ${fileSize}`);

      // For images with unknown size (fileSize = 0), we'll allow them but warn
      if (fileSize === 0) {
        console.warn(`⚠️ Image ${fileName} has unknown file size, allowing upload but may need size validation on server`);
      }

      if (fileSize === 0 || fileSize <= maxSizeInBytes) {
        // Validate that this is actually a supported image type
        const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!supportedImageTypes.includes(mimeType)) {
          console.warn(`⚠️ Unsupported image type: ${mimeType} for file ${fileName}`);
          invalidFiles.push({
            name: fileName,
            size: fileSize,
            sizeFormatted: formatFileSize(fileSize),
            reason: `Unsupported image type: ${mimeType}`
          });
          continue;
        }

        const fileInfo = {
          name: fileName,
          size: fileSize,
          mimeType: mimeType,
          uri: asset.uri,
          type: mimeType,
          sizeFormatted: fileSize > 0 ? formatFileSize(fileSize) : 'Không xác định',
          dateAdded: new Date().toISOString(),
          uploadProgress: 0,
          source: source,
        };
        validFiles.push(fileInfo);
        console.log(`✅ Added image to valid files: ${fileName}`);
      } else {
        invalidFiles.push({
          name: fileName,
          size: fileSize,
          sizeFormatted: formatFileSize(fileSize),
        });
      }
    }

    await addValidFilesToState(validFiles, invalidFiles, source);
  };

  const processDocumentAssets = async (assets, source) => {
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    const validFiles = [];
    const invalidFiles = [];
    const unsupportedFiles = [];

    // Supported file types
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];

    const supportedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt'];

    for (const asset of assets) {
      console.log(`📋 Processing document from ${source}: ${asset.name}`);
      console.log(`  • Size: ${(asset.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  • Type: ${asset.mimeType}`);
      console.log(`  • URI: ${asset.uri}`);

      // Check if file type is supported
      const extension = asset.name.toLowerCase().split('.').pop();
      const isTypeSupported = supportedTypes.includes(asset.mimeType) || supportedExtensions.includes(extension);

      if (!isTypeSupported) {
        unsupportedFiles.push({
          name: asset.name,
          type: asset.mimeType || `*.${extension}`,
        });
        continue;
      }

      if (asset.size <= maxSizeInBytes) {
        const fileInfo = {
          ...asset,
          sizeFormatted: formatFileSize(asset.size),
          dateAdded: new Date().toISOString(),
          uploadProgress: 0,
          source: source,
        };
        validFiles.push(fileInfo);
      } else {
        invalidFiles.push({
          name: asset.name,
          size: asset.size,
          sizeFormatted: formatFileSize(asset.size),
        });
      }
    }

    await addValidFilesToState(validFiles, invalidFiles, source, unsupportedFiles);
  };

  const addValidFilesToState = (validFiles, invalidFiles, source, unsupportedFiles = []) => {
    // Thêm files hợp lệ vào state
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      console.log(`✅ Added ${validFiles.length} files from ${source} successfully`);
      
      // Hiển thị thông báo thành công
      Alert.alert(
        `📎 ${source === 'Camera' ? 'Ảnh đã được chụp' : source === 'Gallery' ? 'Ảnh đã được chọn' : 'File đã được chọn'}`,
        `Đã thêm ${validFiles.length} file${validFiles.length > 1 ? 's' : ''} thành công!\n\n${validFiles.map(f => `• ${f.name} (${f.sizeFormatted})`).join('\n')}`,
        [{ text: 'OK', style: 'default' }]
      );
    }

    // Hiển thị cảnh báo cho files không được hỗ trợ
    if (unsupportedFiles.length > 0) {
      Alert.alert(
        '❌ File không được hỗ trợ',
        `Những file sau không được hỗ trợ:\n\n${unsupportedFiles.map(f => `• ${f.name} (${f.type})`).join('\n')}\n\nChỉ hỗ trợ: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), Ảnh (JPG/PNG/GIF), Text (.txt)`,
        [{ text: 'Đã hiểu', style: 'default' }]
      );
    }

    // Hiển thị cảnh báo cho files quá lớn
    if (invalidFiles.length > 0) {
      Alert.alert(
        '⚠️ File quá lớn',
        `Một số file vượt quá giới hạn 10MB:\n\n${invalidFiles.map(f => `• ${f.name} (${f.sizeFormatted})`).join('\n')}\n\nVui lòng chọn file nhỏ hơn 10MB.`,
        [{ text: 'Đã hiểu', style: 'default' }]
      );
    }
  };

  // Helper function để format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function để lấy icon cho file type
  const getFileIcon = (mimeType) => {
    if (!mimeType) return 'file-document';
    
    // Supported file types với icons tương ứng
    if (mimeType === 'application/pdf') return 'file-pdf-box';
    if (mimeType === 'application/msword' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'file-word-box';
    if (mimeType === 'application/vnd.ms-excel' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'file-excel-box';
    if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/gif') return 'file-image';
    if (mimeType === 'text/plain') return 'file-document-outline';
    
    // Fallback for unknown types
    return 'file-document';
  };

  // Helper function để lấy màu icon cho file type
  const getFileIconColor = (mimeType) => {
    if (!mimeType) return '#757575';
    
    // Supported file types với màu tương ứng
    if (mimeType === 'application/pdf') return '#FF5722';                    // Đỏ cam cho PDF
    if (mimeType === 'application/msword' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '#2196F3'; // Xanh dương cho Word
    if (mimeType === 'application/vnd.ms-excel' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '#4CAF50'; // Xanh lá cho Excel
    if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/gif') return '#FF9800'; // Cam cho images
    if (mimeType === 'text/plain') return '#9C27B0';                         // Tím cho text files
    
    // Fallback for unknown types
    return '#757575';
  };

  // Helper function để lấy label cho file type
  const getFileTypeLabel = (mimeType) => {
    if (!mimeType) return 'File';
    
    // Supported file types với labels tương ứng
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType === 'application/msword') return 'Word (doc)';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word (docx)';
    if (mimeType === 'application/vnd.ms-excel') return 'Excel (xls)';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel (xlsx)';
    if (mimeType === 'image/jpeg') return 'JPEG';
    if (mimeType === 'image/png') return 'PNG';
    if (mimeType === 'image/gif') return 'GIF';
    if (mimeType === 'text/plain') return 'Text';
    
    // Fallback for unknown types
    return 'File';
  };

  // Preview functions
  const handleFilePreview = (file, index) => {
    console.log('🔍 Preview file:', file.name, 'Type:', file.mimeType || file.type);
    
    if (isImageFile(file)) {
      // Preview image
      const imageFiles = selectedFiles.filter(f => isImageFile(f));
      const imageIndex = imageFiles.findIndex(f => f.uri === file.uri);
      
      setPreviewImages(imageFiles.map(f => ({ uri: f.uri })));
      setCurrentImageIndex(imageIndex);
      setImageViewVisible(true);
    } else if (isDocumentFile(file)) {
      // Preview document
      setPreviewDocument(file);
      setDocumentPreviewVisible(true);
    } else {
      // Fallback: Show file info
      Alert.alert(
        `📄 ${file.name}`,
        `📊 Thông tin file:\n\n• Tên: ${file.name}\n• Kích thước: ${file.sizeFormatted || formatFileSize(file.size || 0)}\n• Loại: ${getFileTypeLabel(file.mimeType || file.type)}\n• Nguồn: ${file.source || 'Không xác định'}\n\n💡 Loại file này không hỗ trợ xem trước.`,
        [{ text: 'OK' }]
      );
    }
  };

  const isImageFile = (file) => {
    const mimeType = file.mimeType || file.type || '';
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    return supportedImageTypes.includes(mimeType) || 
           file.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);
  };

  const isDocumentFile = (file) => {
    const mimeType = file.mimeType || file.type || '';
    const supportedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    return supportedDocTypes.includes(mimeType) ||
           file.name?.toLowerCase().match(/\.(pdf|txt|doc|docx)$/);
  };

  const closeImagePreview = () => {
    setImageViewVisible(false);
    setPreviewImages([]);
    setCurrentImageIndex(0);
  };

  const closeDocumentPreview = () => {
    setDocumentPreviewVisible(false);
    setPreviewDocument(null);
  };

  const renderDocumentPreview = () => {
    if (!previewDocument) return null;

    const { mimeType, type, name, uri, size, sizeFormatted } = previewDocument;
    const fileType = mimeType || type || '';

    if (fileType.includes('text') || name?.toLowerCase().endsWith('.txt')) {
      return <TextFilePreview file={previewDocument} />;
    } else if (fileType.includes('pdf')) {
      return <PDFPreview file={previewDocument} />;
    } else {
      return <GenericFilePreview file={previewDocument} />;
    }
  };

  const removeFile = async (index) => {
    const fileToRemove = selectedFiles[index];
    
    // If file has been uploaded, delete from server
    if (fileToRemove.attachmentId) {
      try {
        console.log('🗑️ Deleting file from server:', fileToRemove.attachmentId);
        const response = await httpApiClient.delete(`attachments/${fileToRemove.attachmentId}`);
        if (response.ok) {
          console.log('✅ File deleted from server:', fileToRemove.attachmentId);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn('⚠️ Failed to delete file from server:', fileToRemove.attachmentId, errorData);
        }
      } catch (error) {
        console.error('🚨 Error deleting file from server:', error);
      }
    }
    
    // Remove from local state
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Remove from uploaded IDs
    if (fileToRemove.attachmentId) {
      setUploadedAttachmentIds(prev => prev.filter(id => id !== fileToRemove.attachmentId));
    }
  };

  // Pre-signed URL upload functions
  const generatePresignedUrls = async (files) => {
    try {
      console.log('📁 Generating pre-signed URLs for', files.length, 'files...');
      
      const filesPayload = files.map(file => {
        // Determine correct content type based on file extension and mimeType
        const getCorrectContentType = (fileName, mimeType) => {
          // Use provided mimeType if it's in our supported list
          const supportedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain'
          ];
          
          if (mimeType && supportedTypes.includes(mimeType)) {
            return mimeType;
          }
          
          // Fallback: detect from file extension
          const extension = fileName.toLowerCase().split('.').pop();
          switch (extension) {
            case 'pdf': return 'application/pdf';
            case 'doc': return 'application/msword';
            case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'xls': return 'application/vnd.ms-excel';
            case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'txt': return 'text/plain';
            default: 
              console.warn(`⚠️ Unsupported file type for ${fileName}, falling back to original mimeType: ${mimeType}`);
              return mimeType || 'application/octet-stream';
          }
        };
        
        const correctContentType = getCorrectContentType(file.name, file.mimeType || file.type);
        
        console.log(`📄 File: ${file.name} → Content-Type: ${correctContentType}`);
        
        return {
          fileName: file.name,
          fileSize: file.size || 0,
          contentType: correctContentType
        };
      });

      const requestPayload = { files: filesPayload };
      
      console.log('📤 Request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('📤 Request payload type:', typeof requestPayload);
      console.log('📤 Request URL: attachments/generate-upload-urls');
      console.log('📤 Making POST request with ky library...');

      // Debug: Test if ky is working correctly
      console.log('🔧 KY Debug Info:');
      console.log('  • httpApiClient type:', typeof httpApiClient);
      console.log('  • httpApiClient post method:', typeof httpApiClient.post);
      
      const response = await httpApiClient.post('attachments/generate-upload-urls', {
        json: requestPayload,
        hooks: {
          beforeRequest: [
            async (request) => {
              console.log('🔍 Before request hook:');
              console.log('  • Request URL:', request.url);
              console.log('  • Request method:', request.method);
              console.log('  • Request headers:', Object.fromEntries(request.headers.entries()));
              console.log('  • Request body type:', typeof request.body);
              
              // Try to log request body if possible
              if (request.body) {
                try {
                  const bodyClone = await request.clone().text();
                  console.log('  • Request body content:', bodyClone);
                } catch (e) {
                  console.log('  • Request body (could not read):', e.message);
                }
              } else {
                console.log('  • Request body: null/undefined');
              }
            }
          ]
        }
      });
      
      console.log('📡 Response received, status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Pre-signed URLs generated:', responseData);
        
        // Validate response structure
        if (!responseData.success || !responseData.data || !responseData.data.files) {
          throw new Error('Invalid response structure from server');
        }
        
        // Check for errors in individual files
        const files = responseData.data.files;
        const hasErrors = files.some(file => file.error);
        if (hasErrors) {
          const errorFiles = files.filter(file => file.error).map(file => `${file.fileName}: ${file.error}`);
          throw new Error(`File upload URL generation failed:\n${errorFiles.join('\n')}`);
        }
        
        console.log('📋 Generated URLs for files:', files.map(f => ({
          fileName: f.fileName,
          attachmentId: f.attachmentId,
          hasUploadUrl: !!f.uploadUrl,
          expiryTime: f.expiryTime
        })));
        
        return files; // Array of {uploadUrl, attachmentId, fileName, uniqueFileName, expiryTime, fileUrl, instructions, error}
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to generate pre-signed URLs:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate upload URLs`);
      }
    } catch (error) {
      console.error('🚨 Error generating pre-signed URLs:', error);
      console.error('🚨 Error details:', {
        message: error.message,
        stack: error.stack,
        payloadSent: requestPayload
      });
      
      // Additional debug info for missing request body error
      if (error.message?.includes('Required request body is missing')) {
        console.error('❗ DIAGNOSIS: Backend did not receive the request body');
        console.error('❗ Possible causes:');
        console.error('  1. Request body not properly serialized');
        console.error('  2. Content-Type header missing/incorrect');
        console.error('  3. Network interceptor stripping body');
        console.error('  4. KY library configuration issue');
      }
      
      throw error;
    }
  };

  const uploadFileToAzure = async (file, uploadUrl, onProgress) => {
    try {
      console.log('📤 Uploading file to Azure:', file.name);
      console.log('  • File URI:', file.uri);
      console.log('  • File MIME Type:', file.mimeType || file.type);
      console.log('  • File Size:', file.size);
      console.log('  • Upload URL length:', uploadUrl?.length);
      
      // Validate inputs
      if (!file.uri) {
        throw new Error('No file URI available');
      }
      if (!uploadUrl) {
        throw new Error('No upload URL provided');
      }
      
      // Read file data
      console.log('📥 Reading file data from URI...');
      const fileResponse = await fetch(file.uri);
      if (!fileResponse.ok) {
        throw new Error(`Failed to read file: HTTP ${fileResponse.status}`);
      }
      
      const fileData = await fileResponse.blob();
      console.log('📊 File blob created, size:', fileData.size, 'type:', fileData.type);

      // Determine content type
      const contentType = file.mimeType || file.type || fileData.type || 'application/octet-stream';
      console.log('📋 Using Content-Type:', contentType);
      
      // Upload to Azure Blob Storage
      console.log('☁️ Uploading to Azure Blob Storage...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-ms-blob-type': 'BlockBlob',
        },
        body: fileData,
      });

      console.log('📡 Azure response status:', uploadResponse.status);
      console.log('📡 Azure response headers:', Object.fromEntries(uploadResponse.headers.entries()));

      if (uploadResponse.status === 201 || uploadResponse.status === 200) {
        console.log('✅ File uploaded successfully to Azure:', file.name);
        onProgress && onProgress(100);
        return true;
      } else {
        const responseText = await uploadResponse.text().catch(() => 'No response body');
        console.error('❌ Azure upload failed:');
        console.error('  • Status:', uploadResponse.status);
        console.error('  • Status Text:', uploadResponse.statusText);
        console.error('  • Response Body:', responseText);
        throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`);
      }
    } catch (error) {
      console.error('🚨 Error uploading file to Azure:', error);
      console.error('🚨 Error details:', {
        message: error.message,
        stack: error.stack,
        fileName: file.name,
        fileUri: file.uri,
        fileMimeType: file.mimeType || file.type
      });
      throw error;
    }
  };

  const confirmUploads = async (attachmentIds) => {
    try {
      console.log('✅ Confirming uploads with server:', attachmentIds);
      
      // Ensure attachment IDs are in the correct format (array of strings/numbers)
      const validAttachmentIds = attachmentIds.filter(id => id != null && id !== '');
      if (validAttachmentIds.length === 0) {
        throw new Error('No valid attachment IDs to confirm');
      }
      
      const confirmPayload = { attachmentIds: validAttachmentIds };
      console.log('📤 Confirm payload:', JSON.stringify(confirmPayload, null, 2));
      
      const response = await httpApiClient.post('attachments/confirm-upload', {
        json: confirmPayload
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Uploads confirmed successfully:', responseData);
        
        // Validate confirmation response
        if (!responseData.success) {
          throw new Error(responseData.message || 'Upload confirmation failed');
        }
        
        console.log(`🎉 Confirmed ${validAttachmentIds.length} attachments successfully`);
        return responseData;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to confirm uploads:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to confirm uploads`);
      }
    } catch (error) {
      console.error('🚨 Error confirming uploads:', error);
      throw error;
    }
  };

  const uploadAllFiles = async () => {
    if (selectedFiles.length === 0) {
      return [];
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      console.log('🚀 Starting upload process for', selectedFiles.length, 'files...');

      // Step 1: Generate pre-signed URLs
      const presignedData = await generatePresignedUrls(selectedFiles);
      
      // Step 2: Upload each file to Azure
      const uploadPromises = presignedData.map(async (presignedFile, index) => {
        const localFile = selectedFiles[index];
        
        const onProgress = (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [index]: progress
          }));
        };

        try {
          await uploadFileToAzure(localFile, presignedFile.uploadUrl, onProgress);
          
          // Update local file with attachment ID (ensure it's converted to string for consistency)
          const attachmentId = String(presignedFile.attachmentId);
          setSelectedFiles(prev => prev.map((file, i) => 
            i === index ? { 
              ...file, 
              attachmentId: attachmentId,
              uniqueFileName: presignedFile.uniqueFileName,
              fileUrl: presignedFile.fileUrl
            } : file
          ));
          
          console.log(`✅ File uploaded: ${localFile.name} → Attachment ID: ${attachmentId}`);
          
          return attachmentId;
        } catch (error) {
          console.error(`❌ Failed to upload ${localFile.name}:`, error);
          throw error;
        }
      });

      const attachmentIds = await Promise.all(uploadPromises);
      
      // Step 3: Confirm uploads with server
      await confirmUploads(attachmentIds);
      
      setUploadedAttachmentIds(attachmentIds);
      
      console.log('🎉 All files uploaded successfully:', attachmentIds);
      
      return attachmentIds;
      
    } catch (error) {
      console.error('🚨 Upload process failed:', error);
      Alert.alert(
        '❌ Lỗi upload file',
        `Không thể upload file:\n\n${error.message}\n\nVui lòng thử lại.`
      );
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const clearAllFiles = async () => {
    if (selectedFiles.length === 0) return;

    Alert.alert(
      '🗑️ Xóa tất cả file?',
      'Bạn có chắc muốn xóa tất cả file đã chọn? File đã upload sẽ bị xóa khỏi server.',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa tất cả', 
          style: 'destructive',
          onPress: async () => {
            // Delete uploaded files from server
            const uploadedFiles = selectedFiles.filter(file => file.attachmentId);
            if (uploadedFiles.length > 0) {
              try {
                const attachmentIds = uploadedFiles.map(file => file.attachmentId);
                console.log('🗑️ Bulk deleting files from server:', attachmentIds);
                const response = await httpApiClient.post('attachments/bulk-delete', {
                  json: { attachmentIds }
                });
                if (response.ok) {
                  console.log('✅ Bulk deleted files from server:', attachmentIds);
                } else {
                  const errorData = await response.json().catch(() => ({}));
                  console.warn('⚠️ Failed to bulk delete files from server:', errorData);
                }
              } catch (error) {
                console.error('🚨 Error bulk deleting files:', error);
              }
            }
            
            // Clear local state
            setSelectedFiles([]);
            setUploadedAttachmentIds([]);
            setUploadProgress({});
          }
        }
      ]
    );
  };

  // Debug function to test single file upload
  const testSingleFileUpload = async (fileIndex) => {
    if (!selectedFiles[fileIndex]) {
      Alert.alert('❌ Lỗi', 'File không tồn tại');
      return;
    }

    const file = selectedFiles[fileIndex];
    console.log('🧪 Testing single file upload:', file.name);
    
    try {
      // Generate pre-signed URL for this file only
      const presignedData = await generatePresignedUrls([file]);
      console.log('✅ Generated pre-signed URL for test:', presignedData[0]);
      
      // Upload to Azure
      await uploadFileToAzure(file, presignedData[0].uploadUrl, (progress) => {
        console.log(`📊 Upload progress: ${progress}%`);
      });
      
      // Confirm upload
      await confirmUploads([presignedData[0].attachmentId]);
      
      Alert.alert('✅ Thành công', `File ${file.name} đã được upload thành công!`);
      
    } catch (error) {
      console.error('❌ Test upload failed:', error);
      Alert.alert('❌ Lỗi upload', `Không thể upload ${file.name}:\n\n${error.message}`);
    }
  };

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      console.log('🔄 Fetching teams from: teams/assignable');
      const response = await httpApiClient.get('teams/assignable');
      console.log('📡 Teams response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Teams response received:', JSON.stringify(responseData, null, 2));
        
        // Extract actual data array from response - match the actual API structure
        const actualData = responseData.data || [];
        console.log('✅ Teams actual data:', JSON.stringify(actualData, null, 2));
        console.log('✅ Teams count:', actualData.length);
        
        // Validate and process teams data
        const teamsArray = Array.isArray(actualData) ? actualData.map(team => ({
          // Ensure we have proper id handling (convert to string to avoid 0 falsy issues)
          id: String(team.id !== undefined ? team.id : Date.now()),
          teamName: team.teamName || team.name || 'Đội không có tên',
          name: team.teamName || team.name || 'Đội không có tên', // fallback
          description: team.description || null,
          memberCount: team.memberCount || null,
          // Preserve original data for debugging
          _original: team
        })) : [];
        
        console.log('✅ Processed teams array:', JSON.stringify(teamsArray, null, 2));
        
        setTeams(teamsArray);
        setFilteredTeams(teamsArray);
      } else {
        console.error('❌ Failed to fetch teams - Status:', response.status);
        const errorBody = await response.text();
        console.error('❌ Teams error body:', errorBody);
        setTeams([]);
        setFilteredTeams([]);
      }
    } catch (error) {
      console.error('🚨 Error fetching teams:', error);
      setTeams([]);
      setFilteredTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      console.log('🔄 Fetching units from: units/assignable');
      const response = await httpApiClient.get('units/assignable');
      console.log('📡 Units response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Units response received:', JSON.stringify(responseData, null, 2));
        
        // Extract actual data array from response - match the actual API structure
        const actualData = responseData.data || [];
        console.log('✅ Units actual data:', JSON.stringify(actualData, null, 2));
        console.log('✅ Units count:', actualData.length);
        
        // Validate and process units data
        const unitsArray = Array.isArray(actualData) ? actualData.map(unit => ({
          // Ensure we have proper id handling (convert to string to avoid 0 falsy issues)
          id: String(unit.id !== undefined ? unit.id : Date.now()),
          unitName: unit.unitName || unit.name || 'Tổ không có tên',
          name: unit.unitName || unit.name || 'Tổ không có tên', // fallback
          teamId: unit.teamId,
          teamName: unit.teamName || null,
          description: unit.description || null,
          memberCount: unit.memberCount || null,
          // Preserve original data for debugging
          _original: unit
        })) : [];
        
        console.log('✅ Processed units array:', JSON.stringify(unitsArray, null, 2));
        
        setUnits(unitsArray);
        setFilteredUnits(unitsArray);
      } else {
        console.error('❌ Failed to fetch units - Status:', response.status);
        const errorBody = await response.text();
        console.error('❌ Units error body:', errorBody);
        setUnits([]);
        setFilteredUnits([]);
      }
    } catch (error) {
      console.error('🚨 Error fetching units:', error);
      setUnits([]);
      setFilteredUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('🔄 Fetching users from: users/assignable');
      const response = await httpApiClient.get('users/assignable');
      console.log('📡 Users response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Users response received:', responseData);
        console.log('✅ Users response type:', typeof responseData);
        
        // Extract actual data array from response
        const actualData = responseData.data || responseData || [];
        console.log('✅ Users actual data:', actualData);
        console.log('✅ Users is array:', Array.isArray(actualData));
        console.log('✅ Users count:', actualData.length);
        
        // Ensure data is always an array
        const usersArray = Array.isArray(actualData) ? actualData : [];
        setUsers(usersArray);
        setFilteredUsers(usersArray);
      } else {
        console.error('❌ Failed to fetch users - Status:', response.status);
        const errorBody = await response.text();
        console.error('❌ Users error body:', errorBody);
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('🚨 Error fetching users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRecipientTypeChange = async (type) => {
    // Mapping: Tổ = Unit, Đội = Team
    if (type === 'UNIT') { // Tổ
      setLoadingButtonUnit(true);
      console.log('🔄 Opening Unit modal - current units state:', units.length);
      await fetchUnits();
      console.log('🔄 After fetching units - state:', units.length);
      setTempSelectedUnits([...selectedUnits]);
      setUnitModalVisible(true);
      setLoadingButtonUnit(false);
    } else if (type === 'TEAM') { // Đội
      setLoadingButtonTeam(true);
      console.log('🔄 Opening Team modal - current teams state:', teams.length);
      await fetchTeams();
      console.log('🔄 After fetching teams - state:', teams.length);
      setTempSelectedTeams([...selectedTeams]);
      setTeamModalVisible(true);
      setLoadingButtonTeam(false);
    } else if (type === 'USER') { // Cá nhân
      setLoadingButtonUser(true);
      console.log('🔄 Opening User modal - current users state:', users.length);
      await fetchUsers();
      console.log('🔄 After fetching users - state:', users.length);
      setTempSelectedUsers([...selectedUsers]);
      setUserModalVisible(true);
      setLoadingButtonUser(false);
    }
  };

  const handleUserToggle = (user) => {
    setTempSelectedUsers(prev => {
      const isSelected = prev.find(u => (u.id || u.userId) === (user.id || user.userId));
      if (isSelected) {
        // Remove user if already selected
        return prev.filter(u => (u.id || u.userId) !== (user.id || user.userId));
      } else {
        // Add user if not selected
        return [...prev, user];
      }
    });
  };

  const handleConfirmUserSelection = () => {
    // Commit temp selection to actual selection
    setSelectedUsers([...tempSelectedUsers]);
    setUserModalVisible(false);
    setUserSearchQuery('');
  };

  const handleCancelUserSelection = () => {
    // Reset temp selection to original state
    setTempSelectedUsers([...selectedUsers]);
    setUserModalVisible(false);
    setUserSearchQuery('');
  };

  const handleUserRemove = (userId) => {
    setSelectedUsers(prev => prev.filter(u => (u.id || u.userId) !== userId));
  };

  const handleUserSearch = (query) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const filtered = users.filter(user => {
      const searchText = query.toLowerCase();
      const fullName = (user.fullName || user.name || '').toLowerCase();
      const username = (user.username || user.email || '').toLowerCase();
      const employeeId = (user.employeeId || user.id || '').toString().toLowerCase();
      
      return fullName.includes(searchText) || 
             username.includes(searchText) || 
             employeeId.includes(searchText);
    });
    
    setFilteredUsers(filtered);
  };

  const handleTeamToggle = (team) => {
    console.log('🔄 Toggling team:', team);
    setTempSelectedTeams(prev => {
      const isSelected = prev.find(t => String(t.id) === String(team.id));
      console.log('🔍 Team already selected:', !!isSelected);
      
      if (isSelected) {
        // Remove team if already selected
        const newSelection = prev.filter(t => String(t.id) !== String(team.id));
        console.log('➖ Removing team, new count:', newSelection.length);
        return newSelection;
      } else {
        // Add team if not selected
        const newSelection = [...prev, team];
        console.log('➕ Adding team, new count:', newSelection.length);
        return newSelection;
      }
    });
  };

  const handleConfirmTeamSelection = () => {
    // Commit temp selection to actual selection
    setSelectedTeams([...tempSelectedTeams]);
    setTeamModalVisible(false);
    setTeamSearchQuery('');
  };

  const handleCancelTeamSelection = () => {
    // Reset temp selection to original state
    setTempSelectedTeams([...selectedTeams]);
    setTeamModalVisible(false);
    setTeamSearchQuery('');
  };

  const handleTeamRemove = (teamId) => {
    console.log('🗑️ Removing team with ID:', teamId);
    setSelectedTeams(prev => prev.filter(t => String(t.id) !== String(teamId)));
  };

  const handleUnitToggle = (unit) => {
    console.log('🔄 Toggling unit:', unit);
    setTempSelectedUnits(prev => {
      const isSelected = prev.find(u => String(u.id) === String(unit.id));
      console.log('🔍 Unit already selected:', !!isSelected);
      
      if (isSelected) {
        // Remove unit if already selected
        const newSelection = prev.filter(u => String(u.id) !== String(unit.id));
        console.log('➖ Removing unit, new count:', newSelection.length);
        return newSelection;
      } else {
        // Add unit if not selected
        const newSelection = [...prev, unit];
        console.log('➕ Adding unit, new count:', newSelection.length);
        return newSelection;
      }
    });
  };

  const handleConfirmUnitSelection = () => {
    // Commit temp selection to actual selection
    setSelectedUnits([...tempSelectedUnits]);
    setUnitModalVisible(false);
    setUnitSearchQuery('');
  };

  const handleCancelUnitSelection = () => {
    // Reset temp selection to original state
    setTempSelectedUnits([...selectedUnits]);
    setUnitModalVisible(false);
    setUnitSearchQuery('');
  };

  const handleUnitRemove = (unitId) => {
    console.log('🗑️ Removing unit with ID:', unitId);
    setSelectedUnits(prev => prev.filter(u => String(u.id) !== String(unitId)));
  };

  const handleTeamSearch = (query) => {
    setTeamSearchQuery(query);
    if (!query.trim()) {
      setFilteredTeams(teams);
      return;
    }
    
    const filtered = teams.filter(team => {
      const searchText = query.toLowerCase();
      const teamName = (team.teamName || '').toLowerCase();
      const teamId = String(team.id || '').toLowerCase();
      
      return teamName.includes(searchText) || teamId.includes(searchText);
    });
    
    console.log(`🔍 Team search "${query}" found ${filtered.length} results`);
    setFilteredTeams(filtered);
  };

  const handleUnitSearch = (query) => {
    setUnitSearchQuery(query);
    if (!query.trim()) {
      setFilteredUnits(units);
      return;
    }
    
    const filtered = units.filter(unit => {
      const searchText = query.toLowerCase();
      const unitName = (unit.unitName || '').toLowerCase();
      const unitId = String(unit.id || '').toLowerCase();
      const teamName = (unit.teamName || '').toLowerCase();
      
      return unitName.includes(searchText) || 
             unitId.includes(searchText) || 
             teamName.includes(searchText);
    });
    
    console.log(`🔍 Unit search "${query}" found ${filtered.length} results`);
    setFilteredUnits(filtered);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề công việc');
      return false;
    }
    if (!formData.content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung công việc');
      return false;
    }
    
    // Assignment Recipients are now optional
    // No need to check for assignments - can create task without specific assignments
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log('🚀 Starting task creation...');

      // Step 1: Upload files if any
      let attachmentIds = [];
      if (selectedFiles.length > 0) {
        console.log('📁 Uploading files before creating task...');
        try {
          attachmentIds = await uploadAllFiles();
          console.log('✅ File upload completed, attachment IDs:', attachmentIds);
        } catch (uploadError) {
          console.error('❌ File upload failed:', uploadError);
          // Don't proceed with task creation if file upload fails
          return;
        }
      }
      
      // Log current form state
      console.log('📋 Current form data:');
      console.log(JSON.stringify({
        title: formData.title,
        content: formData.content,
        instructions: formData.instructions,
        notes: formData.notes,
        priority: formData.priority,
        assignments: formData.assignments,
        attachmentIds: formData.attachmentIds
      }, null, 2));
      
      // Log selected items
      console.log('👥 Selected Users:', JSON.stringify(selectedUsers, null, 2));
      console.log('🏢 Selected Units:', JSON.stringify(selectedUnits, null, 2));
      console.log('👥 Selected Teams:', JSON.stringify(selectedTeams, null, 2));
      
      // Build assignments array from all selected items
      const assignments = [];
      
      // Add user assignments
      console.log('🔄 Processing user assignments...');
      selectedUsers.forEach((user, index) => {
        const userAssignment = {
          recipientId: parseInt(user.id) || 0, // Convert string ID back to number
          recipientType: "USER",
          dueAt: formData.assignments[0].dueAt.toISOString(), // Convert to ISO string
          note: formData.assignments[0].note || ""
        };
        console.log(`  User ${index + 1}:`, JSON.stringify(userAssignment, null, 2));
        assignments.push(userAssignment);
      });
      
      // Add unit assignments  
      console.log('🔄 Processing unit assignments...');
      selectedUnits.forEach((unit, index) => {
        const unitAssignment = {
          recipientId: parseInt(unit.id) || 0, // Convert string ID back to number
          recipientType: "UNIT", 
          dueAt: formData.assignments[0].dueAt.toISOString(),
          note: formData.assignments[0].note || ""
        };
        console.log(`  Unit ${index + 1}:`, JSON.stringify(unitAssignment, null, 2));
        assignments.push(unitAssignment);
      });
      
      // Add team assignments
      console.log('🔄 Processing team assignments...');
      selectedTeams.forEach((team, index) => {
        const teamAssignment = {
          recipientId: parseInt(team.id) || 0, // Convert string ID back to number
          recipientType: "TEAM",
          dueAt: formData.assignments[0].dueAt.toISOString(),
          note: formData.assignments[0].note || ""
        };
        console.log(`  Team ${index + 1}:`, JSON.stringify(teamAssignment, null, 2));
        assignments.push(teamAssignment);
      });
      
      console.log('📝 Final assignments array:');
      console.log(JSON.stringify(assignments, null, 2));
      
      // Prepare final API request payload
      const taskPayload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        instructions: formData.instructions.trim() || "",
        notes: formData.notes.trim() || "",
        priority: formData.priority, // LOW, MEDIUM, HIGH, URGENT
        assignments: assignments,
        attachmentIds: attachmentIds.filter(id => id != null && id !== '') // Filter valid attachment IDs
      };
      
      console.log('📋 Task payload validation:');
      console.log('  • Attachment IDs count:', taskPayload.attachmentIds.length);
      console.log('  • Attachment IDs:', taskPayload.attachmentIds);
      console.log('  • Assignments count:', taskPayload.assignments.length);
      
      console.log('🎯 FINAL API PAYLOAD (SEND TO BACKEND):');
      console.log('==========================================');
      console.log(JSON.stringify(taskPayload, null, 2));
      console.log('==========================================');
      console.log('📤 Payload as single line:', JSON.stringify(taskPayload));
      console.log('📊 Assignment summary:', {
        totalAssignments: assignments.length,
        users: selectedUsers.length,
        units: selectedUnits.length, 
        teams: selectedTeams.length
      });
      
      // Log detailed request information
      console.log('🔍 Request details:');
      console.log('  • URL: tasks');
      console.log('  • Method: POST');
      console.log('  • Payload size:', JSON.stringify(taskPayload).length, 'characters');
      console.log('  • Payload type:', typeof taskPayload);
      console.log('  • Raw payload string:', JSON.stringify(taskPayload));
      
      // Get token for debugging
      const token = await AsyncStorage.getItem('userToken');
      console.log('  • Has token:', !!token);
      console.log('  • Token preview:', token ? token.substring(0, 30) + '...' : 'No token');
      
      // Make API call to create task with explicit JSON options
      console.log('🚀 Making API call (method 1 - explicit json)...');
      let response;
      try {
        response = await httpApiClient.post('tasks', {
          json: taskPayload,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('📡 Method 1 response status:', response.status);
        
        // If we get 400 error, try alternative method
        if (response.status === 400) {
          console.log('⚠️ Method 1 failed with 400, trying method 2...');
          const errorData = await response.json().catch(() => ({}));
          console.log('❌ Method 1 error details:', errorData);
          
          // Try alternative approach - with json option
          console.log('🔄 Making API call (method 2 - with json option)...');
          response = await httpApiClient.post('tasks', {
            json: taskPayload
          });
          console.log('📡 Method 2 response status:', response.status);
        }
        
      } catch (apiError) {
        console.error('🚨 API call error:', apiError);
        throw apiError;
      }
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Task created successfully:', responseData);
        
        Alert.alert(
          '🎉 Thành công!',
          `Công việc "${taskPayload.title}" đã được tạo thành công!\n\n📋 Chi tiết:\n• ${assignments.length} phân công\n• Mức độ: ${getCurrentPriority()?.label}\n• Hạn: ${moment(formData.assignments[0].dueAt).format('DD/MM/YYYY HH:mm')}`,
          [
            {
              text: '✅ OK',
              onPress: () => {
                // Reset form data
                setFormData({
                  title: '',
                  content: '',
                  instructions: '',
                  notes: '',
                  priority: 'MEDIUM',
                  assignments: [{
                    recipientId: '',
                    recipientType: 'USER',
                    dueAt: new Date(),
                    note: ''
                  }],
                  attachmentIds: [],
                });
                setSelectedUsers([]);
                setSelectedUnits([]);
                setSelectedTeams([]);
                setSelectedFiles([]);
                
                // Reset upload states
                setUploadProgress({});
                setUploadedAttachmentIds([]);
                setIsUploading(false);
                
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        console.error('❌ Failed to create task - Status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ FULL ERROR RESPONSE:');
        console.error('========================================');
        console.error(JSON.stringify(errorData, null, 2));
        console.error('========================================');
        
        const errorMessage = errorData.message || 'Không thể tạo công việc';
        Alert.alert(
          '❌ Lỗi tạo công việc', 
          `${errorMessage}\n\nMã lỗi: ${response.status}${errorData.statusCode ? ` (${errorData.statusCode})` : ''}`
        );
      }
      
    } catch (error) {
      console.error('🚨 Error creating task:', error);
      Alert.alert(
        '❌ Lỗi kết nối', 
        `Không thể kết nối tới server:\n\n${error.message}\n\nVui lòng kiểm tra kết nối mạng và thử lại.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentPriority = () => {
    return priorities.find(p => p.value === formData.priority);
  };

  const testGenerateUploadUrls = async () => {
    try {
      console.log('🧪 Testing generate upload URLs API...');
      
      const testPayload = {
        files: [
          {
            fileName: "test-file.jpg",
            fileSize: 1024000,
            contentType: "image/jpeg"
          }
        ]
      };
      
      console.log('📤 Test payload:', JSON.stringify(testPayload, null, 2));
      
      // Test with KY first
      console.log('🔄 Testing with KY library...');
      const response = await httpApiClient.post('attachments/generate-upload-urls', {
        json: testPayload
      });
      
      console.log('📡 Test response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Test response data:', responseData);
        Alert.alert('✅ API Test Success', `Generate upload URLs API working!\n\nResponse: ${JSON.stringify(responseData.data?.files?.[0] || {}, null, 2)}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ KY Test failed:', errorData);
        
        // If KY fails, try with fetch as backup
        console.log('🔄 KY failed, trying with fetch...');
        await testWithFetch(testPayload);
      }
      
    } catch (error) {
      console.error('🚨 KY Test error:', error);
      
      // Try with fetch as backup
      console.log('🔄 KY errored, trying with fetch...');
      try {
        await testWithFetch(testPayload);
      } catch (fetchError) {
        Alert.alert('❌ Both KY and Fetch Failed', `KY Error: ${error.message}\n\nFetch Error: ${fetchError.message}`);
      }
    }
  };
  
  const testWithFetch = async (testPayload) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch('http://192.168.0.110:8080/api/attachments/generate-upload-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testPayload)
      });
      
      console.log('📡 Fetch response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Fetch test response data:', responseData);
        Alert.alert('✅ Fetch Test Success', `API works with fetch!\n\nThis means KY library has an issue.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Fetch test failed:', errorData);
        Alert.alert('❌ Fetch Test Failed', `HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('🚨 Fetch test error:', error);
      throw error;
    }
  };

  const testBackendConnection = async () => {
    try {
      console.log('🔍 Testing backend connection...');
      
      // Check token
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token preview:', token ? token.substring(0, 50) + '...' : 'No token');
      
      // Test teams API specifically (Đội)
      console.log('🔄 Testing teams API (Đội)...');
      const teamsResponse = await httpApiClient.get('teams/assignable');
      console.log('📡 Teams API status:', teamsResponse.status);
      
      // Test units API specifically (Tổ)
      console.log('🔄 Testing units API (Tổ)...');
      const unitsResponse = await httpApiClient.get('units/assignable');
      console.log('📡 Units API status:', unitsResponse.status);
      
      // Test users API specifically (Cá nhân)
      console.log('🔄 Testing users API (Cá nhân)...');
      const usersResponse = await httpApiClient.get('users/assignable');
      console.log('📡 Users API status:', usersResponse.status);
      
      let message = '';
      if (teamsResponse.ok && unitsResponse.ok && usersResponse.ok) {
        const teamsResponseData = await teamsResponse.json();
        const unitsResponseData = await unitsResponse.json();
        const usersResponseData = await usersResponse.json();
        
        // Extract actual data arrays
        const teamsData = teamsResponseData.data || teamsResponseData || [];
        const unitsData = unitsResponseData.data || unitsResponseData || [];
        const usersData = usersResponseData.data || usersResponseData || [];
        
        console.log('✅ Teams (Đội) raw data:', teamsResponseData);
        console.log('✅ Teams (Đội) processed:', teamsData);
        console.log('✅ Units (Tổ) raw data:', unitsResponseData);  
        console.log('✅ Units (Tổ) processed:', unitsData);
        console.log('✅ Users (Cá nhân) raw data:', usersResponseData);
        console.log('✅ Users (Cá nhân) processed:', usersData);
        
        // Detailed information about first items
        if (teamsData.length > 0) {
          console.log('🔍 First team sample:', JSON.stringify(teamsData[0], null, 2));
        }
        if (unitsData.length > 0) {
          console.log('🔍 First unit sample:', JSON.stringify(unitsData[0], null, 2));
        }
        if (usersData.length > 0) {
          console.log('🔍 First user sample:', JSON.stringify(usersData[0], null, 2));
        }
        
        message = `🎉 Kết nối thành công!\n\n📊 Thống kê dữ liệu:\n• Đội (teams): ${Array.isArray(teamsData) ? teamsData.length : 0}\n• Tổ (units): ${Array.isArray(unitsData) ? unitsData.length : 0}\n• Cá nhân (users): ${Array.isArray(usersData) ? usersData.length : 0}\n\n🔧 Trạng thái hiện tại:\n• Teams state: ${teams.length}\n• FilteredTeams: ${filteredTeams.length}\n• Units state: ${units.length}\n• FilteredUnits: ${filteredUnits.length}\n• Users state: ${users.length}\n• FilteredUsers: ${filteredUsers.length}`;
        
        // Update states with fresh data for testing
        if (Array.isArray(teamsData)) {
          setTeams(teamsData);
          setFilteredTeams(teamsData);
        }
        if (Array.isArray(unitsData)) {
          setUnits(unitsData);
          setFilteredUnits(unitsData);
        }
        if (Array.isArray(usersData)) {
          setUsers(usersData);
          setFilteredUsers(usersData);
        }
        
      } else {
        const teamError = !teamsResponse.ok ? await teamsResponse.text() : 'OK';
        const unitError = !unitsResponse.ok ? await unitsResponse.text() : 'OK';
        const userError = !usersResponse.ok ? await usersResponse.text() : 'OK';
        
        message = `❌ Lỗi API:\n• Đội (teams): ${teamsResponse.status} - ${teamError}\n• Tổ (units): ${unitsResponse.status} - ${unitError}\n• Cá nhân (users): ${usersResponse.status} - ${userError}`;
      }
      
      Alert.alert('🔍 Debug Results', message);
      
    } catch (error) {
      console.error('🚨 Backend connection error:', error);
      Alert.alert('❌ Lỗi kết nối', `Không thể kết nối tới backend:\n\n${error.message}\n\nChi tiết: ${error.stack || 'No stack trace'}`);
    }
  };

  const forceRefreshAllData = async () => {
    console.log('🔄 Force refreshing all data...');
    setLoadingTeams(true);
    setLoadingUnits(true);
    setLoadingUsers(true);
    
    try {
      // Fetch all data in parallel
      await Promise.all([
        fetchTeams(),
        fetchUnits(),
        fetchUsers()
      ]);
      
      // Wait a bit for state to update
      setTimeout(() => {
        console.log('✅ Final state after refresh:', {
          teams: teams.length,
          units: units.length,
          users: users.length,
          filteredTeams: filteredTeams.length,
          filteredUnits: filteredUnits.length,
          filteredUsers: filteredUsers.length
        });
        
        const message = `🔄 Dữ liệu đã được cập nhật!\n\n📊 Kết quả:\n• Đội: ${teams.length} items\n• Tổ: ${units.length} items\n• Cá nhân: ${users.length} items\n\nBây giờ thử mở modal để kiểm tra!`;
        Alert.alert('✅ Refresh Complete', message);
      }, 1000);
      
    } catch (error) {
      console.error('🚨 Error refreshing data:', error);
      Alert.alert('❌ Lỗi', 'Không thể cập nhật dữ liệu');
    }
  };

  // Preview Components
  const TextFilePreview = ({ file }) => (
    <View style={styles.documentPreviewContent}>
      <View style={styles.documentPreviewHeader}>
        <MaterialCommunityIcons name="file-document-outline" size={24} color="#9C27B0" />
        <Text style={styles.documentPreviewTitle}>{file.name}</Text>
      </View>
      <Text style={styles.documentPreviewInfo}>
        📄 File text • {file.sizeFormatted || formatFileSize(file.size || 0)}
      </Text>
      <Text style={styles.documentPreviewNote}>
        💡 Đây là file văn bản. Bạn có thể mở bằng ứng dụng xem text để đọc nội dung.
      </Text>
    </View>
  );

  const PDFPreview = ({ file }) => (
    <View style={styles.documentPreviewContent}>
      <View style={styles.documentPreviewHeader}>
        <MaterialCommunityIcons name="file-pdf-box" size={24} color="#FF5722" />
        <Text style={styles.documentPreviewTitle}>{file.name}</Text>
      </View>
      <Text style={styles.documentPreviewInfo}>
        📑 File PDF • {file.sizeFormatted || formatFileSize(file.size || 0)}
      </Text>
      <Text style={styles.documentPreviewNote}>
        💡 Đây là file PDF. Bạn có thể mở bằng ứng dụng đọc PDF để xem nội dung.
      </Text>
    </View>
  );

  const GenericFilePreview = ({ file }) => (
    <View style={styles.documentPreviewContent}>
      <View style={styles.documentPreviewHeader}>
        <MaterialCommunityIcons 
          name={getFileIcon(file.mimeType || file.type)} 
          size={24} 
          color={getFileIconColor(file.mimeType || file.type)} 
        />
        <Text style={styles.documentPreviewTitle}>{file.name}</Text>
      </View>
      <Text style={styles.documentPreviewInfo}>
        📁 {getFileTypeLabel(file.mimeType || file.type)} • {file.sizeFormatted || formatFileSize(file.size || 0)}
      </Text>
      <Text style={styles.documentPreviewSource}>
        📂 Nguồn: {file.source || 'Không xác định'}
      </Text>
      <Text style={styles.documentPreviewNote}>
        💡 File đã được chọn và sẵn sàng để gửi cùng với công việc.
      </Text>
    </View>
  );

  return (
    <Layout>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <LinearGradient
          colors={['#059669', '#10B981']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="plus-circle" size={20} color="white" />
            <Text style={styles.headerTitle}>Tạo công việc mới</Text>
          </View>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={forceRefreshAllData}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={testBackendConnection}
            >
              <MaterialCommunityIcons name="bug" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={testGenerateUploadUrls}
            >
              <MaterialCommunityIcons name="cloud-upload-outline" size={16} color="white" />
            </TouchableOpacity>
            {__DEV__ && selectedFiles.length > 0 && (
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => {
                  console.log('📋 Current selected files:');
                  selectedFiles.forEach((file, index) => {
                    console.log(`File ${index}:`, {
                      name: file.name,
                      size: file.size,
                      mimeType: file.mimeType,
                      type: file.type,
                      uri: file.uri?.substring(0, 50) + '...',
                      attachmentId: file.attachmentId
                    });
                  });
                  Alert.alert('🧪 Debug Info', `Check console for ${selectedFiles.length} files info`);
                }}
              >
                <MaterialCommunityIcons name="information" size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Tiêu đề công việc */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tiêu đề công việc *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="briefcase" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập tiêu đề công việc..."
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                placeholderTextColor="#9E9E9E"
              />
            </View>
          </View>

          {/* Nội dung */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nội dung công việc *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="text" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả chi tiết nội dung công việc..."
                value={formData.content}
                onChangeText={(value) => handleInputChange('content', value)}
                placeholderTextColor="#9E9E9E"
                multiline={true}
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Hướng dẫn */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hướng dẫn thực hiện</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="clipboard-text" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Hướng dẫn cách thực hiện công việc..."
                value={formData.instructions}
                onChangeText={(value) => handleInputChange('instructions', value)}
                placeholderTextColor="#9E9E9E"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Ghi chú */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="note-text" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ghi chú thêm về công việc..."
                value={formData.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                placeholderTextColor="#9E9E9E"
                multiline={true}
                numberOfLines={2}
              />
            </View>
          </View>



          {/* Mức độ ưu tiên */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mức độ ưu tiên</Text>
            <View style={styles.priorityContainer}>
              {priorities.map((priority) => (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityButton,
                    formData.priority === priority.value && styles.priorityButtonActive,
                    { borderColor: priority.color }
                  ]}
                  onPress={() => handleInputChange('priority', priority.value)}
                >
                  <Text style={[
                    styles.priorityText,
                    formData.priority === priority.value && { color: priority.color, fontWeight: '700' }
                  ]}>
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Giao việc */}
          <View style={styles.assignmentSection}>
            <Text style={styles.assignmentSectionTitle}>🎯 Phân công công việc</Text>
            
            {/* Thành phần được giao việc */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chọn đối tượng giao việc (tùy chọn)</Text>
              <View style={styles.assignmentTypeButtons}>
                <TouchableOpacity 
                  style={[
                    styles.assignmentTypeButton,
                    loadingButtonUser && styles.assignmentTypeButtonLoading,
                    selectedUsers.length > 0 && styles.assignmentTypeButtonActive
                  ]}
                  onPress={() => handleRecipientTypeChange('USER')}
                  disabled={loadingButtonUser}
                >
                  {loadingButtonUser ? (
                    <MaterialCommunityIcons name="loading" size={20} color="#4CAF50" />
                  ) : (
                    <MaterialCommunityIcons 
                      name="account" 
                      size={20} 
                      color={selectedUsers.length > 0 ? "white" : "#4CAF50"} 
                    />
                  )}
                  <Text style={[
                    styles.assignmentTypeButtonText,
                    selectedUsers.length > 0 && styles.assignmentTypeButtonTextActive
                  ]}>
                    {loadingButtonUser ? 'Đang tải...' : `Cá nhân${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.assignmentTypeButton,
                    loadingButtonUnit && styles.assignmentTypeButtonLoading,
                    selectedUnits.length > 0 && styles.assignmentTypeButtonActive
                  ]}
                  onPress={() => handleRecipientTypeChange('UNIT')}
                  disabled={loadingButtonUnit}
                >
                  {loadingButtonUnit ? (
                    <MaterialCommunityIcons name="loading" size={20} color="#4CAF50" />
                  ) : (
                    <MaterialCommunityIcons 
                      name="office-building" 
                      size={20} 
                      color={selectedUnits.length > 0 ? "white" : "#4CAF50"} 
                    />
                  )}
                  <Text style={[
                    styles.assignmentTypeButtonText,
                    selectedUnits.length > 0 && styles.assignmentTypeButtonTextActive
                  ]}>
                    {loadingButtonUnit ? 'Đang tải...' : `Tổ${selectedUnits.length > 0 ? ` (${selectedUnits.length})` : ''}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.assignmentTypeButton,
                    loadingButtonTeam && styles.assignmentTypeButtonLoading,
                    selectedTeams.length > 0 && styles.assignmentTypeButtonActive
                  ]}
                  onPress={() => handleRecipientTypeChange('TEAM')}
                  disabled={loadingButtonTeam}
                >
                  {loadingButtonTeam ? (
                    <MaterialCommunityIcons name="loading" size={20} color="#4CAF50" />
                  ) : (
                    <MaterialCommunityIcons 
                      name="account-group" 
                      size={20} 
                      color={selectedTeams.length > 0 ? "white" : "#4CAF50"} 
                    />
                  )}
                  <Text style={[
                    styles.assignmentTypeButtonText,
                    selectedTeams.length > 0 && styles.assignmentTypeButtonTextActive
                  ]}>
                    {loadingButtonTeam ? 'Đang tải...' : `Đội${selectedTeams.length > 0 ? ` (${selectedTeams.length})` : ''}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* All Selections Display */}
            <View style={styles.selectedAssignmentsContainer}>
              <View style={styles.selectedHeader}>
                <Text style={styles.selectedLabel}>
                  Đã chọn: {selectedUsers.length + selectedUnits.length + selectedTeams.length} đối tượng
                </Text>
                {(selectedUsers.length + selectedUnits.length + selectedTeams.length) > 0 && (
                  <TouchableOpacity 
                    style={styles.clearAllButton}
                    onPress={() => {
                      setSelectedUsers([]);
                      setSelectedUnits([]);
                      setSelectedTeams([]);
                    }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={16} color="#F44336" />
                    <Text style={styles.clearAllText}>Xóa tất cả</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <View style={styles.selectedTypeContainer}>
                  <View style={styles.selectedTypeHeader}>
                    <MaterialCommunityIcons name="account" size={18} color="#4CAF50" />
                    <Text style={styles.selectedTypeTitle}>Cá nhân ({selectedUsers.length})</Text>
                  </View>
                  <View style={styles.selectedItemsList}>
                    {selectedUsers.map((user) => (
                      <View key={`selected-user-${user.id || user.userId}`} style={styles.selectedDetailedItem}>
                        <View style={styles.selectedItemIcon}>
                          <MaterialCommunityIcons name="account-circle" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.selectedItemInfo}>
                          <Text style={styles.selectedItemName} numberOfLines={1}>
                            {user.fullName || user.name}
                          </Text>
                          <Text style={styles.selectedItemDetails} numberOfLines={1}>
                            {user.employeeId || user.id} • {user.username || user.email}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleUserRemove(user.id || user.userId)}
                          style={styles.selectedItemRemoveButton}
                        >
                          <MaterialCommunityIcons name="close-circle" size={18} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Selected Units */}
              {selectedUnits.length > 0 && (
                <View style={styles.selectedTypeContainer}>
                  <View style={styles.selectedTypeHeader}>
                    <MaterialCommunityIcons name="office-building" size={18} color="#FF9800" />
                    <Text style={styles.selectedTypeTitle}>Tổ ({selectedUnits.length})</Text>
                  </View>
                  <View style={styles.selectedItemsList}>
                    {selectedUnits.map((unit) => (
                      <View key={`selected-unit-${unit.id}`} style={styles.selectedDetailedItem}>
                        <View style={styles.selectedItemIcon}>
                          <MaterialCommunityIcons name="office-building" size={20} color="#FF9800" />
                        </View>
                        <View style={styles.selectedItemInfo}>
                          <Text style={styles.selectedItemName} numberOfLines={1}>
                            {unit.unitName || unit.name || 'Tổ không có tên'}
                          </Text>
                          <Text style={styles.selectedItemDetails} numberOfLines={1}>
                            Mã tổ: {unit.id}
                            {unit.teamName && ` • Thuộc đội: ${unit.teamName}`}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleUnitRemove(unit.id)}
                          style={styles.selectedItemRemoveButton}
                        >
                          <MaterialCommunityIcons name="close-circle" size={18} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Selected Teams */}
              {selectedTeams.length > 0 && (
                <View style={styles.selectedTypeContainer}>
                  <View style={styles.selectedTypeHeader}>
                    <MaterialCommunityIcons name="account-group" size={18} color="#2196F3" />
                    <Text style={styles.selectedTypeTitle}>Đội ({selectedTeams.length})</Text>
                  </View>
                  <View style={styles.selectedItemsList}>
                    {selectedTeams.map((team) => (
                      <View key={`selected-team-${team.id}`} style={styles.selectedDetailedItem}>
                        <View style={styles.selectedItemIcon}>
                          <MaterialCommunityIcons name="account-group" size={20} color="#2196F3" />
                        </View>
                        <View style={styles.selectedItemInfo}>
                          <Text style={styles.selectedItemName} numberOfLines={1}>
                            {team.teamName || team.name || 'Đội không có tên'}
                          </Text>
                          <Text style={styles.selectedItemDetails} numberOfLines={1}>
                            Mã đội: {team.id}
                            {team.memberCount && ` • ${team.memberCount} thành viên`}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleTeamRemove(team.id)}
                          style={styles.selectedItemRemoveButton}
                        >
                          <MaterialCommunityIcons name="close-circle" size={18} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Empty State */}
              {selectedUsers.length === 0 && selectedUnits.length === 0 && selectedTeams.length === 0 && (
                <View style={styles.emptyAssignmentState}>
                  <MaterialCommunityIcons name="account-plus" size={48} color="#E0E0E0" />
                  <Text style={styles.emptyStateText}>Chưa chọn đối tượng nào</Text>
                  <Text style={styles.emptyStateSubtext}>Có thể chọn cá nhân, tổ hoặc đội để giao việc (tùy chọn)</Text>
                </View>
              )}
            </View>

            {/* Thời hạn hoàn thành */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Thời hạn hoàn thành</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setDatePickerVisibility(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color="#4CAF50" style={styles.inputIcon} />
                <Text style={styles.dateText}>
                  {moment(formData.assignments[0].dueAt).format('DD/MM/YYYY HH:mm')}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#757575" />
              </TouchableOpacity>
            </View>

            {/* Ghi chú phân công */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ghi chú phân công</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="message-text" size={20} color="#4CAF50" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ghi chú cho cá nhân/tổ/đội được giao..."
                  value={formData.assignments[0].note}
                  onChangeText={(value) => handleAssignmentChange(0, 'note', value)}
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>
          </View>

          {/* File đính kèm */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>File đính kèm</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleFileUpload}
            >
              <MaterialCommunityIcons name="paperclip" size={20} color="#4CAF50" style={styles.inputIcon} />
              <Text style={styles.uploadText}>Chọn file để đính kèm (PDF, Word, Excel, Ảnh, Text)</Text>
              <Ionicons name="cloud-upload" size={20} color="#757575" />
            </TouchableOpacity>
            
            {/* Hiển thị file đã chọn */}
            {selectedFiles.length > 0 && (
              <View style={styles.filesContainer}>
                <View style={styles.filesHeaderContainer}>
                  <Text style={styles.filesHeader}>
                    📎 File đã chọn ({selectedFiles.length})
                  </Text>
                  {uploadedAttachmentIds.length > 0 && (
                    <Text style={styles.uploadStatusSummary}>
                      ✅ {uploadedAttachmentIds.length}/{selectedFiles.length} đã upload
                    </Text>
                  )}
                  {isUploading && (
                    <Text style={styles.uploadStatusSummary}>
                      🔄 Đang upload...
                    </Text>
                  )}
                </View>
                {(selectedFiles || []).map((file, index) => {
                  const uploadProgressValue = uploadProgress[index] || 0;
                  const isUploaded = file.attachmentId;
                  const isCurrentlyUploading = isUploading && uploadProgressValue > 0 && uploadProgressValue < 100;
                  
                  return (
                    <View key={index} style={styles.fileItem}>
                      <TouchableOpacity 
                        style={styles.fileMainContent}
                        onPress={() => handleFilePreview(file, index)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.fileIconContainer}>
                          <MaterialCommunityIcons 
                            name={getFileIcon(file.mimeType || file.type)} 
                            size={20} 
                            color={getFileIconColor(file.mimeType || file.type)} 
                          />
                          {isUploaded && (
                            <View style={styles.uploadedBadge}>
                              <MaterialCommunityIcons name="check" size={10} color="white" />
                            </View>
                          )}
                        </View>
                        <View style={styles.fileDetails}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Text style={styles.fileInfo}>
                            {file.sizeFormatted || formatFileSize(file.size || 0)} • {getFileTypeLabel(file.mimeType || file.type)}
                          </Text>
                          
                          {/* Upload Status */}
                          {isCurrentlyUploading && (
                            <View style={styles.uploadProgressContainer}>
                              <View style={styles.uploadProgressBar}>
                                <View style={[styles.uploadProgressFill, { width: `${uploadProgressValue}%` }]} />
                              </View>
                              <Text style={styles.uploadProgressText}>{uploadProgressValue}%</Text>
                            </View>
                          )}
                          {isUploaded && (
                            <Text style={styles.uploadedStatus}>✅ Đã upload</Text>
                          )}
                          {!isUploaded && !isCurrentlyUploading && (
                            <Text style={styles.pendingUploadStatus}>⏳ Chờ upload</Text>
                          )}
                          
                          {(isImageFile(file) || isDocumentFile(file)) && !isCurrentlyUploading && (
                            <Text style={styles.previewHint}>👆 Tap để xem trước</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      
                      <View style={styles.fileActions}>
                        {/* Debug: Test upload button */}
                        {__DEV__ && !isUploaded && !isCurrentlyUploading && (
                          <TouchableOpacity 
                            style={styles.testUploadButton}
                            onPress={() => testSingleFileUpload(index)}
                          >
                            <MaterialCommunityIcons name="test-tube" size={16} color="#9C27B0" />
                          </TouchableOpacity>
                        )}
                        
                        {(isImageFile(file) || isDocumentFile(file)) && !isCurrentlyUploading && (
                          <TouchableOpacity 
                            style={styles.previewFileButton}
                            onPress={() => handleFilePreview(file, index)}
                          >
                            <MaterialCommunityIcons name="eye" size={18} color="#2196F3" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={styles.removeFileButton}
                          onPress={() => removeFile(index)}
                          disabled={isCurrentlyUploading}
                        >
                          <MaterialCommunityIcons 
                            name="close-circle" 
                            size={18} 
                            color={isCurrentlyUploading ? "#BDBDBD" : "#F44336"} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                {/* Clear all button */}
                <TouchableOpacity 
                  style={[styles.clearAllButton, isUploading && styles.clearAllButtonDisabled]}
                  onPress={clearAllFiles}
                  disabled={isUploading}
                >
                  <MaterialCommunityIcons 
                    name="delete-sweep" 
                    size={16} 
                    color={isUploading ? "#BDBDBD" : "#F44336"} 
                  />
                  <Text style={[styles.clearAllText, isUploading && styles.clearAllTextDisabled]}>
                    {isUploading ? 'Đang upload...' : 'Xóa tất cả'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting || isUploading}
          >
            <LinearGradient
              colors={(isSubmitting || isUploading) ? ['#9E9E9E', '#757575'] : ['#2E7D32', '#4CAF50']}
              style={styles.submitGradient}
            >
              {isUploading ? (
                <View style={styles.loadingContainer}>
                  <MaterialCommunityIcons name="cloud-upload" size={24} color="white" />
                  <Text style={styles.submitText}>Đang upload file...</Text>
                </View>
              ) : isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <MaterialCommunityIcons name="loading" size={24} color="white" />
                  <Text style={styles.submitText}>Đang tạo công việc...</Text>
                </View>
              ) : (
                <View style={styles.submitContainer}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="white" />
                  <Text style={styles.submitText}>
                    Tạo công việc{selectedFiles.length > 0 ? ` (${selectedFiles.length} file)` : ''}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>



        {/* Team Selection Modal */}
        <Modal
          visible={isTeamModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelTeamSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.improvedModalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
                  <Text style={styles.modalTitle}>Chọn đội</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleCancelTeamSelection}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>
              
              {/* Search Input for Teams */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#757575" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm đội theo tên..."
                    value={teamSearchQuery}
                    onChangeText={handleTeamSearch}
                    placeholderTextColor="#9E9E9E"
                  />
                  {teamSearchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => handleTeamSearch('')}
                      style={styles.clearSearchButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#757575" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Content Section */}
              <View style={styles.modalContentSection}>
                {/* Debug header to verify modal is rendering */}
                {__DEV__ && (
                  <View style={{ backgroundColor: '#E3F2FD', padding: 8, marginBottom: 8, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#1976D2', textAlign: 'center' }}>
                      🐛 MODAL DEBUG: Teams={teams.length}, FilteredTeams={filteredTeams.length}, Loading={loadingTeams}
                    </Text>
                  </View>
                )}
                
                {loadingTeams ? (
                  <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="loading" size={32} color="#2196F3" />
                    <Text style={styles.loadingText}>Đang tải danh sách đội...</Text>
                  </View>
                ) : (
                  <>
                    {/* Debug info */}
                    {__DEV__ && (
                      <Text style={{ fontSize: 10, color: 'red', marginBottom: 5 }}>
                        Debug: Teams={teams.length}, FilteredTeams={filteredTeams.length}, Loading={loadingTeams}
                      </Text>
                    )}
                    
                    {filteredTeams.length > 0 ? (
                      <ScrollView 
                        style={styles.optionsScrollView}
                        contentContainerStyle={styles.optionsScrollContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {filteredTeams.map((team) => {
                          const isSelected = tempSelectedTeams.find(t => String(t.id) === String(team.id));
                          console.log(`🔍 Rendering team ${team.id} (${team.teamName}), selected: ${!!isSelected}`);
                          
                          return (
                            <TouchableOpacity
                              key={`team-${team.id}`}
                              style={[
                                styles.improvedModalOption,
                                isSelected && styles.improvedModalOptionSelected
                              ]}
                              onPress={() => handleTeamToggle(team)}
                            >
                              <View style={styles.optionIconContainer}>
                                <MaterialCommunityIcons 
                                  name="account-group" 
                                  size={36} 
                                  color={isSelected ? "#2196F3" : "#9E9E9E"} 
                                />
                              </View>
                              <View style={styles.optionContentContainer}>
                                <View style={styles.optionMainInfo}>
                                  <Text style={[
                                    styles.optionTitle,
                                    isSelected && styles.optionTitleSelected
                                  ]}>
                                    {team.teamName || 'Đội không có tên'}
                                  </Text>
                                  <Text style={styles.optionSubtitle}>
                                    Mã đội: {team.id}
                                  </Text>
                                  {team.description && (
                                    <Text style={styles.optionDescription} numberOfLines={2}>
                                      {team.description}
                                    </Text>
                                  )}
                                  {team.memberCount && (
                                    <Text style={styles.optionMemberCount}>
                                      👥 {team.memberCount} thành viên
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.optionCheckboxContainer}>
                                <View style={[
                                  styles.customCheckbox,
                                  isSelected && styles.customCheckboxSelected
                                ]}>
                                  <MaterialCommunityIcons 
                                    name={isSelected ? "check" : ""} 
                                    size={16} 
                                    color={isSelected ? "white" : "transparent"} 
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <View style={styles.improvedEmptyState}>
                        <MaterialCommunityIcons name="account-group-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyStateTitle}>
                          {teamSearchQuery ? 'Không tìm thấy đội nào' : 'Không có đội nào khả dụng'}
                        </Text>
                        <Text style={styles.emptyStateDescription}>
                          {teamSearchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hiện tại chưa có đội nào để lựa chọn'}
                        </Text>
                        {__DEV__ && (
                          <Text style={{ fontSize: 10, color: 'blue', marginTop: 10 }}>
                            Debug: API Response Status - Teams Array Length: {teams.length}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
              
              {/* Bottom Action Bar */}
              <View style={styles.improvedModalBottomBar}>
                <View style={styles.selectionSummary}>
                  <MaterialCommunityIcons name="account-group" size={20} color="#2196F3" />
                  <Text style={styles.selectionSummaryText}>
                    {tempSelectedTeams.length} đội đã chọn
                  </Text>
                </View>
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity 
                    style={styles.modalSecondaryButton}
                    onPress={handleCancelTeamSelection}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.modalPrimaryButton,
                      tempSelectedTeams.length === 0 && styles.modalPrimaryButtonDisabled
                    ]}
                    onPress={handleConfirmTeamSelection}
                    disabled={tempSelectedTeams.length === 0}
                  >
                    <MaterialCommunityIcons 
                      name="check" 
                      size={16} 
                      color={tempSelectedTeams.length > 0 ? "white" : "#9E9E9E"} 
                    />
                    <Text style={[
                      styles.modalPrimaryButtonText,
                      tempSelectedTeams.length === 0 && styles.modalPrimaryButtonTextDisabled
                    ]}>
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Unit Selection Modal */}
        <Modal
          visible={isUnitModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelUnitSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.improvedModalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <MaterialCommunityIcons name="office-building" size={24} color="#FF9800" />
                  <Text style={styles.modalTitle}>Chọn tổ</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleCancelUnitSelection}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>
              
              {/* Search Input for Units */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#757575" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm tổ theo tên..."
                    value={unitSearchQuery}
                    onChangeText={handleUnitSearch}
                    placeholderTextColor="#9E9E9E"
                  />
                  {unitSearchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => handleUnitSearch('')}
                      style={styles.clearSearchButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#757575" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Content Section */}
              <View style={styles.modalContentSection}>
                {/* Debug header to verify modal is rendering */}
                {__DEV__ && (
                  <View style={{ backgroundColor: '#FFE4E1', padding: 8, marginBottom: 8, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#D32F2F', textAlign: 'center' }}>
                      🐛 MODAL DEBUG: Units={units.length}, FilteredUnits={filteredUnits.length}, Loading={loadingUnits}
                    </Text>
                  </View>
                )}
                
                {loadingUnits ? (
                  <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="loading" size={32} color="#FF9800" />
                    <Text style={styles.loadingText}>Đang tải danh sách tổ...</Text>
                  </View>
                ) : (
                  <>
                    {/* Debug info */}
                    {__DEV__ && (
                      <Text style={{ fontSize: 10, color: 'red', marginBottom: 5 }}>
                        Debug: Units={units.length}, FilteredUnits={filteredUnits.length}, Loading={loadingUnits}
                      </Text>
                    )}
                    
                    {filteredUnits.length > 0 ? (
                      <ScrollView 
                        style={styles.optionsScrollView}
                        contentContainerStyle={styles.optionsScrollContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {filteredUnits.map((unit) => {
                          const isSelected = tempSelectedUnits.find(u => String(u.id) === String(unit.id));
                          console.log(`🔍 Rendering unit ${unit.id} (${unit.unitName}), selected: ${!!isSelected}`);
                          
                          return (
                            <TouchableOpacity
                              key={`unit-${unit.id}`}
                              style={[
                                styles.improvedModalOption,
                                isSelected && styles.improvedModalOptionSelected
                              ]}
                              onPress={() => handleUnitToggle(unit)}
                            >
                              <View style={styles.optionIconContainer}>
                                <MaterialCommunityIcons 
                                  name="office-building" 
                                  size={36} 
                                  color={isSelected ? "#FF9800" : "#9E9E9E"} 
                                />
                              </View>
                              <View style={styles.optionContentContainer}>
                                <View style={styles.optionMainInfo}>
                                  <Text style={[
                                    styles.optionTitle,
                                    isSelected && styles.optionTitleSelected
                                  ]}>
                                    {unit.unitName || 'Tổ không có tên'}
                                  </Text>
                                  <Text style={styles.optionSubtitle}>
                                    Mã tổ: {unit.id}
                                  </Text>
                                  {unit.teamName && (
                                    <Text style={styles.optionDescription}>
                                      Thuộc đội: {unit.teamName}
                                    </Text>
                                  )}
                                  {unit.description && (
                                    <Text style={styles.optionDescription} numberOfLines={2}>
                                      {unit.description}
                                    </Text>
                                  )}
                                  {unit.memberCount && (
                                    <Text style={styles.optionMemberCount}>
                                      👥 {unit.memberCount} thành viên
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.optionCheckboxContainer}>
                                <View style={[
                                  styles.customCheckbox,
                                  isSelected && styles.customCheckboxSelected
                                ]}>
                                  <MaterialCommunityIcons 
                                    name={isSelected ? "check" : ""} 
                                    size={16} 
                                    color={isSelected ? "white" : "transparent"} 
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <View style={styles.improvedEmptyState}>
                        <MaterialCommunityIcons name="office-building-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyStateTitle}>
                          {unitSearchQuery ? 'Không tìm thấy tổ nào' : 'Không có tổ nào khả dụng'}
                        </Text>
                        <Text style={styles.emptyStateDescription}>
                          {unitSearchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hiện tại chưa có tổ nào để lựa chọn'}
                        </Text>
                        {__DEV__ && (
                          <Text style={{ fontSize: 10, color: 'blue', marginTop: 10 }}>
                            Debug: API Response Status - Units Array Length: {units.length}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
              
              {/* Bottom Action Bar */}
              <View style={styles.improvedModalBottomBar}>
                <View style={styles.selectionSummary}>
                  <MaterialCommunityIcons name="office-building" size={20} color="#FF9800" />
                  <Text style={styles.selectionSummaryText}>
                    {tempSelectedUnits.length} tổ đã chọn
                  </Text>
                </View>
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity 
                    style={styles.modalSecondaryButton}
                    onPress={handleCancelUnitSelection}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.modalPrimaryButton,
                      tempSelectedUnits.length === 0 && styles.modalPrimaryButtonDisabled
                    ]}
                    onPress={handleConfirmUnitSelection}
                    disabled={tempSelectedUnits.length === 0}
                  >
                    <MaterialCommunityIcons 
                      name="check" 
                      size={16} 
                      color={tempSelectedUnits.length > 0 ? "white" : "#9E9E9E"} 
                    />
                    <Text style={[
                      styles.modalPrimaryButtonText,
                      tempSelectedUnits.length === 0 && styles.modalPrimaryButtonTextDisabled
                    ]}>
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* User Selection Modal */}
        <Modal
          visible={isUserModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelUserSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.improvedModalContainer, styles.userModalContainer]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <MaterialCommunityIcons name="account" size={24} color="#4CAF50" />
                  <Text style={styles.modalTitle}>Chọn cá nhân</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleCancelUserSelection}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>
              
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#757575" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm theo tên, mã nhân viên, email..."
                    value={userSearchQuery}
                    onChangeText={handleUserSearch}
                    placeholderTextColor="#9E9E9E"
                  />
                  {userSearchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => handleUserSearch('')}
                      style={styles.clearSearchButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#757575" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Content Section */}
              <View style={styles.modalContentSection}>
                <ScrollView 
                  style={styles.optionsScrollView}
                  contentContainerStyle={styles.optionsScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                {loadingUsers ? (
                  <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="loading" size={32} color="#4CAF50" />
                    <Text style={styles.loadingText}>Đang tải danh sách cá nhân...</Text>
                  </View>
                ) : filteredUsers && filteredUsers.length > 0 ? (
                  <>
                                         {filteredUsers.map((user) => {
                       const isSelected = tempSelectedUsers.find(u => (u.id || u.userId) === (user.id || user.userId));
                      return (
                        <TouchableOpacity
                          key={user.id || user.userId}
                          style={[
                            styles.userModalOption,
                            isSelected && styles.userModalOptionSelected
                          ]}
                          onPress={() => handleUserToggle(user)}
                        >
                          <View style={styles.userOptionContent}>
                            <MaterialCommunityIcons 
                              name="account-circle" 
                              size={32} 
                              color={isSelected ? "#4CAF50" : "#757575"} 
                            />
                            <View style={styles.userDetails}>
                              <Text style={[
                                styles.userName,
                                isSelected && styles.userNameSelected
                              ]}>
                                {user.fullName || user.name}
                              </Text>
                              <Text style={styles.userSubInfo}>
                                Mã: {user.employeeId || user.id} • {user.username || user.email}
                              </Text>
                              {user.department && (
                                <Text style={styles.userDepartment}>{user.department}</Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.checkboxContainer}>
                            <MaterialCommunityIcons 
                              name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} 
                              size={22} 
                              color={isSelected ? "#4CAF50" : "#757575"} 
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.emptyStateModal}>
                    <MaterialCommunityIcons name="account-search" size={48} color="#9E9E9E" />
                    <Text style={styles.emptyStateText}>
                      {userSearchQuery ? 'Không tìm thấy cá nhân nào' : 'Không có cá nhân nào khả dụng'}
                    </Text>
                    {userSearchQuery && (
                      <Text style={styles.emptyStateSubtext}>Thử tìm kiếm với từ khóa khác</Text>
                    )}
                  </View>
                )}
                </ScrollView>
              </View>
              
              {/* Bottom Action Bar */}
              <View style={styles.improvedModalBottomBar}>
                <View style={styles.selectionSummary}>
                  <MaterialCommunityIcons name="account" size={20} color="#4CAF50" />
                  <Text style={styles.selectionSummaryText}>
                    {tempSelectedUsers.length} người đã chọn
                  </Text>
                </View>
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity 
                    style={styles.modalSecondaryButton}
                    onPress={handleCancelUserSelection}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.modalPrimaryButton,
                      tempSelectedUsers.length === 0 && styles.modalPrimaryButtonDisabled
                    ]}
                    onPress={handleConfirmUserSelection}
                    disabled={tempSelectedUsers.length === 0}
                  >
                    <MaterialCommunityIcons 
                      name="check" 
                      size={16} 
                      color={tempSelectedUsers.length > 0 ? "white" : "#9E9E9E"} 
                    />
                    <Text style={[
                      styles.modalPrimaryButtonText,
                      tempSelectedUsers.length === 0 && styles.modalPrimaryButtonTextDisabled
                    ]}>
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Date Picker Modal */}
        {/* Image Preview Modal */}
        <ImageViewing
          images={previewImages}
          imageIndex={currentImageIndex}
          visible={isImageViewVisible}
          onRequestClose={closeImagePreview}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
          HeaderComponent={({ imageIndex }) => (
            <View style={styles.imagePreviewHeader}>
              <TouchableOpacity onPress={closeImagePreview} style={styles.imagePreviewCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.imagePreviewTitle}>
                Ảnh {imageIndex + 1} / {previewImages.length}
              </Text>
            </View>
          )}
          FooterComponent={({ imageIndex }) => {
            const imageFiles = selectedFiles.filter(f => isImageFile(f));
            const currentFile = imageFiles[imageIndex];
            if (!currentFile) return null;
            
            return (
              <View style={styles.imagePreviewFooter}>
                <Text style={styles.imagePreviewFileName}>{currentFile.name}</Text>
                <Text style={styles.imagePreviewFileInfo}>
                  {currentFile.sizeFormatted || formatFileSize(currentFile.size || 0)} • {currentFile.source || 'Unknown'}
                </Text>
              </View>
            );
          }}
        />

        {/* Document Preview Modal */}
        <Modal
          visible={isDocumentPreviewVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeDocumentPreview}
        >
          <View style={styles.documentPreviewContainer}>
            <View style={styles.documentPreviewModalHeader}>
              <TouchableOpacity onPress={closeDocumentPreview} style={styles.documentPreviewCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.documentPreviewModalTitle}>Xem trước file</Text>
              <View style={styles.documentPreviewHeaderSpacer} />
            </View>
            
            <ScrollView style={styles.documentPreviewScrollView}>
              {renderDocumentPreview()}
            </ScrollView>
          </View>
        </Modal>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="datetime"
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisibility(false)}
          minimumDate={new Date()}
          locale="vi_VN"
        />
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightButtons: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2E2E2E',
    paddingVertical: 4,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  priorityButtonActive: {
    backgroundColor: '#F1F8E9',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#2E2E2E',
    marginLeft: 12,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
  assignmentSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  assignmentSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 12,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadText: {
    flex: 1,
    fontSize: 14,
    color: '#2E2E2E',
    marginLeft: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E2E2E',
    marginBottom: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: '#2E2E2E',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '95%',
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E2E2E',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flex: 1,
  },

  modalOptionDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  modalOptionTextDisabled: {
    color: '#9E9E9E',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  addButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  selectedContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  selectedItemText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  emptyStateModal: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#BDBDBD',
    marginTop: 4,
    textAlign: 'center',
  },
  userModalContainer: {
    height: '85%',
    maxHeight: 600,
    display: 'flex',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2E2E2E',
    paddingVertical: 4,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  userModalOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: 70,
  },
  userOptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 8,
    paddingTop: 4,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E2E2E',
    marginBottom: 2,
    flexWrap: 'wrap',
    flex: 1,
  },
  userSubInfo: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 2,
    flexWrap: 'wrap',
    flex: 1,
  },
  userDepartment: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flex: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
  selectedItemSubtext: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  userModalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userModalScrollContent: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  modalScrollContent: {
    paddingVertical: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  userModalOptionSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  userNameSelected: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  checkboxContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  modalBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  selectedCountContainer: {
    flex: 1,
  },
  selectedCountText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    gap: 6,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  modalConfirmButtonTextDisabled: {
    color: '#9E9E9E',
  },
  assignmentTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  assignmentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentTypeButtonText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '600',
    textAlign: 'center',
  },
  assignmentTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    elevation: 4,
  },
  assignmentTypeButtonTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  assignmentTypeButtonLoading: {
    opacity: 0.7,
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
  },
  selectedAssignmentsContainer: {
    marginTop: 16,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 14,
    color: '#2E2E2E',
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  clearAllText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 4,
  },
  selectedTypeContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  selectedTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  selectedTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E2E2E',
  },
     selectedItemsList: {
     flexDirection: 'column',
     gap: 8,
   },
   selectedDetailedItem: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: 'white',
     borderRadius: 12,
     paddingVertical: 12,
     paddingHorizontal: 12,
     borderWidth: 1,
     borderColor: '#E0E0E0',
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 2,
     elevation: 1,
   },
  selectedItemIcon: {
    marginRight: 8,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 14,
    color: '#2E2E2E',
    fontWeight: '500',
  },
  selectedItemDetails: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  selectedItemRemoveButton: {
    padding: 4,
  },
  emptyAssignmentState: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 16,
  },
     improvedModalContainer: {
     backgroundColor: 'white',
     borderRadius: 20,
     width: '95%',
     maxWidth: 450,
     height: '80%', // Changed from maxHeight to height for consistent sizing
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 10 },
     shadowOpacity: 0.25,
     shadowRadius: 20,
     elevation: 10,
     display: 'flex',
     flexDirection: 'column',
   },
   modalContentSection: {
     flex: 1,
     paddingHorizontal: 20,
     paddingVertical: 8,
     minHeight: 200, // Ensure minimum height
     backgroundColor: 'transparent', // Ensure no background conflicts
   },
  improvedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
     improvedModalOption: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingVertical: 16, // Increased padding for better touch area
     paddingHorizontal: 16,
     borderRadius: 12,
     marginBottom: 12, // Increased spacing
     backgroundColor: 'white', // Ensure white background
     borderWidth: 1,
     borderColor: '#E0E0E0',
     minHeight: 80, // Increased minimum height
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 2,
     elevation: 1,
   },
   improvedModalOptionSelected: {
     backgroundColor: '#F0F9FF', // Lighter blue background
     borderColor: '#4CAF50',
     borderWidth: 2,
     shadowColor: '#4CAF50',
     shadowOpacity: 0.2,
   },
  optionIconContainer: {
    padding: 10, // Increased padding
    borderRadius: 12,
    backgroundColor: '#F8F9FA', // Lighter background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, // Added margin
  },
  optionContentContainer: {
    flex: 1,
    marginLeft: 4, // Reduced margin since icon container has margin
  },
  optionMainInfo: {
    flexDirection: 'column',
  },
     optionTitle: {
     fontSize: 16,
     fontWeight: '700', // Increased font weight
     color: '#1F2937', // Darker color for better contrast
     marginBottom: 4, // Increased margin
     lineHeight: 20, // Added line height
   },
   optionTitleSelected: {
     color: '#059669', // Darker green for better readability
     fontWeight: '800', // Even bolder when selected
   },
  optionSubtitle: {
    fontSize: 14, // Increased font size
    color: '#6B7280', // Better contrast color
    marginBottom: 4, // Increased margin
    fontWeight: '500', // Added font weight
    lineHeight: 18, // Added line height
  },
  optionDescription: {
    fontSize: 13, // Increased font size
    color: '#9CA3AF', // Better contrast
    marginBottom: 2,
    fontWeight: '400', // Added font weight
    lineHeight: 16, // Added line height
  },
  optionMemberCount: {
    fontSize: 13, // Increased font size
    color: '#6B7280', // Better contrast
    marginTop: 4, // Increased margin
    fontWeight: '500', // Added font weight
    fontStyle: 'italic',
  },
  optionCheckboxContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#757575',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCheckboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  improvedEmptyState: {
    alignItems: 'center',
    paddingVertical: 40, // Increased padding
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA', // Light background to make it visible
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    marginVertical: 20,
  },
  emptyStateTitle: {
    fontSize: 18, // Increased font size
    color: '#4B5563', // Darker color for better visibility
    marginTop: 12,
    fontWeight: '600', // Added font weight
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14, // Increased font size
    color: '#6B7280', // Better contrast
    marginTop: 8, // Increased margin
    textAlign: 'center',
    fontWeight: '400', // Added font weight
    lineHeight: 18, // Added line height
  },
  improvedModalBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionSummaryText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    gap: 6,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  modalPrimaryButtonTextDisabled: {
    color: '#9E9E9E',
  },
  optionsScrollView: {
    flex: 1,
    backgroundColor: 'white', // Ensure white background
    minHeight: 150, // Minimum height to ensure content is visible
  },
  optionsScrollContent: {
    paddingVertical: 16,
    paddingBottom: 40,
    flexGrow: 1, // Ensure content expands
    backgroundColor: 'white', // Ensure white background
  },
  // File picker styles
  filesContainer: {
    marginTop: 12,
  },
  filesHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filesHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  uploadStatusSummary: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  
  // Upload progress styles
  uploadedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  uploadProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  uploadProgressText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    minWidth: 30,
  },
  uploadedStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  pendingUploadStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 2,
  },
  clearAllButtonDisabled: {
    opacity: 0.5,
  },
  clearAllTextDisabled: {
    color: '#BDBDBD',
  },
  fileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
    marginRight: 12,
  },
  fileInfo: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  removeFileButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  clearAllText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Preview styles
  fileMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewFileButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  testUploadButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  previewHint: {
    fontSize: 10,
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Image preview styles
  imagePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imagePreviewCloseButton: {
    padding: 5,
  },
  imagePreviewTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  imagePreviewFileName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  imagePreviewFileInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  // Document preview styles
  documentPreviewContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  documentPreviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  documentPreviewCloseButton: {
    padding: 8,
  },
  documentPreviewModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  documentPreviewHeaderSpacer: {
    width: 40,
  },
  documentPreviewScrollView: {
    flex: 1,
  },
  documentPreviewContent: {
    padding: 20,
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  documentPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  documentPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  documentPreviewInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  documentPreviewSource: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  documentPreviewNote: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
});

export default CreateJobScreen; 