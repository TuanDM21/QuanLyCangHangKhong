// API Performance Tracking Helper
// Tạo file này để theo dõi và phân tích hiệu suất API

class APIPerformanceHelper {
  static performanceData = [];
  
  // Thêm dữ liệu hiệu suất mới
  static addPerformanceData(data) {
    this.performanceData.push({
      ...data,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    });
  }
  
  // Lấy session ID (tạo mới nếu chưa có)
  static getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }
  
  // Xuất báo cáo chi tiết cho backend
  static generateDetailedReport() {
    if (this.performanceData.length === 0) {
      console.log("📊 No API performance data available");
      return null;
    }
    
    const report = {
      sessionId: this.getSessionId(),
      generatedAt: new Date().toISOString(),
      deviceInfo: {
        platform: require('react-native').Platform.OS,
        version: require('react-native').Platform.Version
      },
      totalAPICalls: this.performanceData.length,
      timeRange: {
        start: this.performanceData[0]?.startTime,
        end: this.performanceData[this.performanceData.length - 1]?.endTime
      },
      
      // Phân tích theo API endpoint
      byEndpoint: this.analyzeByEndpoint(),
      
      // Phân tích theo màn hình
      byScreen: this.analyzeByScreen(),
      
      // Phân tích hiệu suất tổng thể
      performanceSummary: this.getPerformanceSummary(),
      
      // Các API chậm nhất
      slowestAPIs: this.getSlowestAPIs(),
      
      // Tần suất gọi API
      apiFrequency: this.getAPIFrequency(),
      
      // Dữ liệu thô để backend phân tích chi tiết
      rawData: this.performanceData
    };
    
    console.log("📊 DETAILED API PERFORMANCE REPORT FOR BACKEND:", JSON.stringify(report, null, 2));
    
    // Có thể gửi báo cáo này lên server để phân tích
    this.logBackendOptimizationSuggestions(report);
    
    return report;
  }
  
  // Phân tích theo endpoint
  static analyzeByEndpoint() {
    const endpointStats = {};
    
    this.performanceData.forEach(call => {
      const endpoint = call.apiName;
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = {
          totalCalls: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errorCount: 0,
          successCount: 0,
          calls: []
        };
      }
      
      const stats = endpointStats[endpoint];
      stats.totalCalls++;
      stats.totalTime += call.durationMs;
      stats.minTime = Math.min(stats.minTime, call.durationMs);
      stats.maxTime = Math.max(stats.maxTime, call.durationMs);
      stats.calls.push(call);
      
      if (call.success) {
        stats.successCount++;
      } else {
        stats.errorCount++;
      }
    });
    
    // Tính average và sắp xếp theo thời gian chậm nhất
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      stats.avgTime = Math.round(stats.totalTime / stats.totalCalls);
      stats.successRate = (stats.successCount / stats.totalCalls * 100).toFixed(2);
    });
    
    // Sắp xếp theo avg time giảm dần
    const sortedEndpoints = Object.entries(endpointStats)
      .sort(([,a], [,b]) => b.avgTime - a.avgTime)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    return sortedEndpoints;
  }
  
  // Phân tích theo màn hình
  static analyzeByScreen() {
    const screenStats = {};
    
    this.performanceData.forEach(call => {
      const screen = call.screen;
      if (!screenStats[screen]) {
        screenStats[screen] = {
          totalCalls: 0,
          totalTime: 0,
          avgTime: 0,
          apiCount: {},
          slowCalls: []
        };
      }
      
      const stats = screenStats[screen];
      stats.totalCalls++;
      stats.totalTime += call.durationMs;
      
      // Đếm số lần gọi mỗi API
      stats.apiCount[call.apiName] = (stats.apiCount[call.apiName] || 0) + 1;
      
      // Lưu các call chậm (>1s)
      if (call.durationMs > 1000) {
        stats.slowCalls.push({
          api: call.apiName,
          duration: call.durationMs,
          params: call.params
        });
      }
    });
    
    // Tính average
    Object.keys(screenStats).forEach(screen => {
      const stats = screenStats[screen];
      stats.avgTime = Math.round(stats.totalTime / stats.totalCalls);
    });
    
    return screenStats;
  }
  
  // Tóm tắt hiệu suất tổng thể
  static getPerformanceSummary() {
    const durations = this.performanceData.map(call => call.durationMs);
    const successful = this.performanceData.filter(call => call.success);
    const failed = this.performanceData.filter(call => !call.success);
    
    const fastCalls = durations.filter(d => d <= 500).length;
    const mediumCalls = durations.filter(d => d > 500 && d <= 1000).length;
    const slowCalls = durations.filter(d => d > 1000 && d <= 3000).length;
    const verySlow = durations.filter(d => d > 3000).length;
    
    return {
      totalCalls: this.performanceData.length,
      successfulCalls: successful.length,
      failedCalls: failed.length,
      successRate: (successful.length / this.performanceData.length * 100).toFixed(2),
      
      averageResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      medianResponseTime: this.getMedian(durations),
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      
      performanceDistribution: {
        fast: { count: fastCalls, percentage: (fastCalls / durations.length * 100).toFixed(2), description: "≤500ms" },
        medium: { count: mediumCalls, percentage: (mediumCalls / durations.length * 100).toFixed(2), description: "501-1000ms" },
        slow: { count: slowCalls, percentage: (slowCalls / durations.length * 100).toFixed(2), description: "1001-3000ms" },
        verySlow: { count: verySlow, percentage: (verySlow / durations.length * 100).toFixed(2), description: ">3000ms" }
      }
    };
  }
  
  // Lấy các API chậm nhất
  static getSlowestAPIs(limit = 10) {
    return this.performanceData
      .filter(call => call.success) // Chỉ lấy successful calls
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, limit)
      .map(call => ({
        api: call.apiName,
        screen: call.screen,
        duration: call.durationMs,
        params: call.params,
        timestamp: call.startTime
      }));
  }
  
  // Tần suất gọi API
  static getAPIFrequency() {
    const frequency = {};
    
    this.performanceData.forEach(call => {
      const key = `${call.screen}:${call.apiName}`;
      frequency[key] = (frequency[key] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }
  
  // Tính median
  static getMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  // Gợi ý tối ưu hóa cho backend
  static logBackendOptimizationSuggestions(report) {
    console.log("\n🎯 BACKEND OPTIMIZATION SUGGESTIONS:");
    console.log("=====================================");
    
    // Phân tích các API chậm
    const slowAPIs = Object.entries(report.byEndpoint)
      .filter(([_, stats]) => stats.avgTime > 1000)
      .sort(([,a], [,b]) => b.avgTime - a.avgTime);
    
    if (slowAPIs.length > 0) {
      console.log("\n⚠️ SLOW APIs (>1s average):");
      slowAPIs.forEach(([api, stats]) => {
        console.log(`  • ${api}: ${stats.avgTime}ms avg (${stats.totalCalls} calls)`);
        console.log(`    - Max: ${stats.maxTime}ms, Min: ${stats.minTime}ms`);
        console.log(`    - Success rate: ${stats.successRate}%`);
        
        // Gợi ý cụ thể
        if (api.includes('search-by-date')) {
          console.log(`    💡 Suggestion: Add database index on startTime field`);
        } else if (api.includes('search-by-range')) {
          console.log(`    💡 Suggestion: Optimize date range queries, consider pagination`);
        } else if (api.includes('activities/my')) {
          console.log(`    💡 Suggestion: Implement caching, optimize joins with participants`);
        }
      });
    }
    
    // Phân tích tần suất cao
    const highFreq = Object.entries(report.apiFrequency)
      .filter(([_, count]) => count > 5)
      .sort(([,a], [,b]) => b - a);
    
    if (highFreq.length > 0) {
      console.log("\n🔄 HIGH FREQUENCY APIs (>5 calls):");
      highFreq.forEach(([api, count]) => {
        console.log(`  • ${api}: ${count} calls`);
        console.log(`    💡 Suggestion: Consider caching or reducing call frequency`);
      });
    }
    
    // Phân tích lỗi
    const errorAPIs = Object.entries(report.byEndpoint)
      .filter(([_, stats]) => stats.errorCount > 0)
      .sort(([,a], [,b]) => b.errorCount - a.errorCount);
    
    if (errorAPIs.length > 0) {
      console.log("\n❌ APIs WITH ERRORS:");
      errorAPIs.forEach(([api, stats]) => {
        console.log(`  • ${api}: ${stats.errorCount} errors out of ${stats.totalCalls} calls`);
      });
    }
    
    console.log("\n=====================================");
  }
  
  // Xóa dữ liệu cũ
  static clearData() {
    this.performanceData = [];
    console.log("🗑️ API performance data cleared");
  }
  
  // Export dữ liệu để gửi lên server
  static exportForServer() {
    return {
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      data: this.performanceData,
      summary: this.getPerformanceSummary()
    };
  }
}

export default APIPerformanceHelper; 