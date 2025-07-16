/**
 * API Performance Tracking Demo
 * 
 * Hướng dẫn sử dụng hệ thống đo thời gian API để tối ưu hóa backend
 * 
 * CÁC TÍNH NĂNG CHÍNH:
 * 1. Đo thời gian response của từng API call
 * 2. Phân tích hiệu suất theo endpoint và màn hình
 * 3. Tạo báo cáo chi tiết cho backend team
 * 4. Gợi ý tối ưu hóa cụ thể
 */

// CÁCH SỬ DỤNG:

// 1. Mở ứng dụng React Native
// 2. Truy cập MyActivitiesScreen hoặc SearchActivityScreen
// 3. Thực hiện các thao tác:
//    - Tải dữ liệu lần đầu
//    - Chuyển đổi giữa các ngày/tuần
//    - Làm mới dữ liệu (pull to refresh)
//    - Xóa, chỉnh sửa, ghim activities
// 4. Bấm nút biểu đồ (📊) trên header để tạo báo cáo
// 5. Xem console log để có báo cáo chi tiết

// VÍ DỤ KẾT QUẢ CONSOLE LOG:

console.log(`
📊 [API START] activities/my
{
  timestamp: "2024-01-15T10:30:45.123Z",
  screen: "MyActivitiesScreen",
  params: {
    isRefreshing: false,
    requestType: "GET",
    endpoint: "activities/my",
    description: "Fetch user's activities for MyActivitiesScreen"
  }
}

✅ [API FAST] activities/my
{
  apiName: "activities/my",
  screen: "MyActivitiesScreen",
  startTime: "2024-01-15T10:30:45.123Z",
  endTime: "2024-01-15T10:30:45.456Z",
  duration: "333.45ms",
  durationMs: 333,
  success: true,
  status: 200,
  statusText: "OK"
}

📋 [API DATA] activities/my
{
  totalActivities: 25,
  hasParticipants: 18,
  avgParticipantsPerActivity: "3.2",
  dataStructure: ["id", "name", "location", "startTime", "participants", "notes"],
  isRefreshing: false
}
`);

// PHÂN LOẠI HIỆU SUẤT:
const performanceCategories = {
  "✅ FAST": "≤ 500ms - Hiệu suất tốt",
  "🐌 MEDIUM": "501-1000ms - Chấp nhận được", 
  "⚠️ SLOW": "1001-3000ms - Cần tối ưu hóa",
  "🚨 CRITICAL": "> 3000ms - Cần tối ưu ngay lập tức"
};

// VÍ DỤ BÁO CÁO CHI TIẾT:
const sampleReport = {
  sessionId: "session_1705398645123_abc123def",
  generatedAt: "2024-01-15T10:35:00.000Z",
  totalAPICalls: 12,
  
  // Phân tích theo endpoint - Các API chậm nhất
  byEndpoint: {
    "activities/search-by-range": {
      totalCalls: 3,
      avgTime: 2150, // ms
      maxTime: 3200,
      minTime: 1800,
      successRate: "100.00",
      // 💡 Suggestion: Optimize date range queries, consider pagination
    },
    "activities/my": {
      totalCalls: 5,
      avgTime: 1200,
      maxTime: 1800,
      minTime: 800,
      successRate: "100.00",
      // 💡 Suggestion: Implement caching, optimize joins with participants
    },
    "activities/search-by-date": {
      totalCalls: 4,
      avgTime: 450,
      maxTime: 600,
      minTime: 350,
      successRate: "100.00",
      // ✅ Good performance
    }
  },
  
  // Phân tích tổng quan
  performanceSummary: {
    averageResponseTime: 1267, // ms
    successRate: "100.00",
    performanceDistribution: {
      fast: { count: 4, percentage: "33.33", description: "≤500ms" },
      medium: { count: 2, percentage: "16.67", description: "501-1000ms" },
      slow: { count: 5, percentage: "41.67", description: "1001-3000ms" },
      verySlow: { count: 1, percentage: "8.33", description: ">3000ms" }
    }
  },
  
  // API chậm nhất - cần ưu tiên tối ưu
  slowestAPIs: [
    {
      api: "activities/search-by-range",
      screen: "SearchActivityScreen", 
      duration: 3200,
      params: { startDate: "2024-01-08", endDate: "2024-01-14" }
    },
    {
      api: "activities/my",
      screen: "MyActivitiesScreen",
      duration: 1800, 
      params: { isRefreshing: true }
    }
  ]
};

// GỢI Ý TỐI ƯU HÓA CHO BACKEND:
const optimizationSuggestions = {
  
  // 1. Database Indexing
  database: {
    problem: "activities/search-by-date API chậm",
    solution: "CREATE INDEX idx_activities_start_time ON activities(start_time)",
    expectedImprovement: "50-70% faster queries"
  },
  
  // 2. Query Optimization  
  queries: {
    problem: "activities/my API load nhiều participants",
    solution: "Optimize JOIN queries, use eager loading",
    code: `
      // Thay vì N+1 queries:
      activities.forEach(act => act.participants = getParticipants(act.id))
      
      // Dùng JOIN:
      SELECT a.*, p.* FROM activities a 
      LEFT JOIN participants p ON a.id = p.activity_id 
      WHERE a.user_id = ?
    `
  },
  
  // 3. Caching
  caching: {
    problem: "Repeated calls to same endpoints",
    solution: "Implement Redis caching for frequent queries",
    ttl: "Cache activities/my for 5 minutes"
  },
  
  // 4. Pagination
  pagination: {
    problem: "search-by-range returns too much data",
    solution: "Add pagination for date ranges > 7 days",
    params: "?startDate=X&endDate=Y&page=1&limit=20"
  }
};

// CÁCH ĐỌC VÀ PHÂN TÍCH KẾT QUẢ:

console.log(`
🎯 HƯỚNG DẪN PHÂN TÍCH KẾT QUẢ:

1. 📊 CHECK SLOW APIs (>1000ms):
   - Ưu tiên tối ưu các API có avgTime > 1000ms
   - Xem params để hiểu context (date range, data size)
   
2. 🔄 CHECK HIGH FREQUENCY APIs:
   - API nào được gọi nhiều lần cần cache
   - Giảm số lần gọi API không cần thiết
   
3. ❌ CHECK ERROR RATE:
   - API nào có error rate cao cần fix
   - Xem error details để debug
   
4. 📈 CHECK PERFORMANCE DISTRIBUTION:
   - Nếu >50% calls là slow/verySlow thì cần tối ưu tổng thể
   - Nếu chỉ vài calls chậm thì tối ưu specific cases

5. 💡 APPLY SUGGESTIONS:
   - Database indexing cho date queries
   - Caching cho repeated calls  
   - Pagination cho large datasets
   - Query optimization cho complex joins
`);

// DEVELOPMENT WORKFLOW:

const developmentWorkflow = `
1. BEFORE OPTIMIZATION:
   - Chạy app và test các tình huống thực tế
   - Bấm nút 📊 để tạo baseline report
   - Copy log để lưu trữ

2. IMPLEMENT OPTIMIZATIONS:  
   - Áp dụng suggestions từ report
   - Deploy backend changes

3. AFTER OPTIMIZATION:
   - Test lại với cùng scenarios
   - So sánh performance trước/sau
   - Verify improvements

4. MONITORING:
   - Set up alerts cho APIs > 2000ms
   - Regular performance reviews
   - Track trends over time
`;

export default {
  performanceCategories,
  sampleReport,
  optimizationSuggestions,
  developmentWorkflow
}; 