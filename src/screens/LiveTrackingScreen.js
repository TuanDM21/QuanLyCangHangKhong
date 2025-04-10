import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import Layout from "./Layout";

const LiveTrackingScreen = () => {
  const route = useRoute();
  const { flight } = route.params || {};

  // Kiểm tra thông tin chuyến bay
  if (!flight) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin chuyến bay.</Text>
      </View>
    );
  }
  if (!flight.actualDepartureTime || !flight.actualArrivalTime) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          Chưa có thông tin giờ thực tế để theo dõi chuyến bay.
        </Text>
      </View>
    );
  }

  // State cho danh sách sân bay và tọa độ
  const [airports, setAirports] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);

  // Lấy danh sách sân bay từ API
  useEffect(() => {
    const fetchAirports = async () => {
      setLoadingAirports(true);
      try {
        // Cập nhật URL API của bạn
        const res = await fetch("http://10.0.2.2:8080/api/airports");
        if (!res.ok) {
          throw new Error("Không thể lấy dữ liệu sân bay");
        }
        const data = await res.json();
        setAirports(data);
      } catch (error) {
        Alert.alert("Lỗi", error.message);
      } finally {
        setLoadingAirports(false);
      }
    };
    fetchAirports();
  }, []);

  // Lọc tọa độ dựa trên mã sân bay trong flight
  useEffect(() => {
    if (airports.length === 0) return;
    const depAirport = airports.find(
      (a) => a.airportCode === flight.departureAirport
    );
    const arrAirport = airports.find(
      (a) => a.airportCode === flight.arrivalAirport
    );
    if (!depAirport || !arrAirport) {
      Alert.alert("Lỗi", "Không tìm thấy tọa độ của sân bay được chọn.");
      return;
    }
    const depCoords = { latitude: depAirport.latitude, longitude: depAirport.longitude };
    const arrCoords = { latitude: arrAirport.latitude, longitude: arrAirport.longitude };
    setOrigin(depCoords);
    setDestination(arrCoords);
    setMarkerPosition(depCoords);
  }, [airports, flight]);

  // Hàm chuyển đổi thời gian (chuỗi "HH:mm" hoặc "HH:mm:ss") thành số giây kể từ nửa đêm
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  let depSeconds = parseTimeToSeconds(flight.actualDepartureTime);
  let arrSeconds = parseTimeToSeconds(flight.actualArrivalTime);

  // Xử lý trường hợp chuyến bay qua đêm: nếu arrSeconds <= depSeconds, cộng thêm 24 giờ (86400 giây)
  if (arrSeconds <= depSeconds) {
    arrSeconds += 24 * 3600;
  }

  // Hàm tính toán bearing (hướng) từ điểm start đến end
  const calculateBearing = (start, end) => {
    const lat1 = (start.latitude * Math.PI) / 180;
    const lon1 = (start.longitude * Math.PI) / 180;
    const lat2 = (end.latitude * Math.PI) / 180;
    const lon2 = (end.longitude * Math.PI) / 180;
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * (180 / Math.PI);
    brng = (brng + 360) % 360;
    return brng;
  };

  // Tính bearing của chuyến bay dựa trên origin và destination
  const bearing = (origin && destination) ? calculateBearing(origin, destination) : 0;

  // Cập nhật vị trí marker theo thời gian thực (cập nhật mỗi 1 giây)
  useEffect(() => {
    if (!origin || !destination) return;
    const intervalId = setInterval(() => {
      const now = new Date();
      let currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      // Nếu chuyến bay qua đêm và giờ hiện tại thuộc sáng (số giây thấp), cộng thêm 24 giờ
      if (currentSeconds < depSeconds) {
        currentSeconds += 24 * 3600;
      }
      let progress = 0;
      if (currentSeconds < depSeconds) {
        progress = 0;
      } else if (currentSeconds > arrSeconds) {
        progress = 1;
      } else {
        progress = (currentSeconds - depSeconds) / (arrSeconds - depSeconds);
      }
      const currentLatitude = origin.latitude + (destination.latitude - origin.latitude) * progress;
      const currentLongitude = origin.longitude + (destination.longitude - origin.longitude) * progress;
      setMarkerPosition({ latitude: currentLatitude, longitude: currentLongitude });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [depSeconds, arrSeconds, origin, destination]);

  if (loadingAirports || !origin || !destination || !markerPosition) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Tính toán region sao cho bao gồm cả 2 điểm
  const region = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
    latitudeDelta: Math.max(Math.abs(origin.latitude - destination.latitude) * 2, 8),
    longitudeDelta: Math.max(Math.abs(origin.longitude - destination.longitude) * 2, 8),
  };

  return (
    <Layout>
      <View style={styles.container}>
        <MapView style={styles.map} initialRegion={region}>
          {/* Vẽ đường bay nối origin và destination */}
          <Polyline coordinates={[origin, destination]} strokeColor="#007AFF" strokeWidth={3} />
          {/* Marker cho máy bay với rotation dựa trên bearing */}
          <Marker coordinate={markerPosition} rotation={bearing} anchor={{ x: 0.5, y: 0.5 }}>
            <Ionicons name="airplane" size={30} color="red" />
          </Marker>
          {/* Marker cho sân bay khởi hành */}
          <Marker coordinate={origin}>
            <Ionicons name="location" size={24} color="green" />
            <Text style={styles.markerLabel}>{flight.departureAirport}</Text>
          </Marker>
          {/* Marker cho sân bay đến */}
          <Marker coordinate={destination}>
            <Ionicons name="location" size={24} color="blue" />
            <Text style={styles.markerLabel}>{flight.arrivalAirport}</Text>
          </Marker>
        </MapView>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Live Tracking chuyến bay: {flight.flightNumber}</Text>
          <Text style={styles.infoText}>
            Từ {flight.departureAirport} đến {flight.arrivalAirport}
          </Text>
          <Text style={styles.infoText}>
            Thời gian thực: {flight.actualDepartureTime} - {flight.actualArrivalTime}
          </Text>
        </View>
      </View>
    </Layout>
  );
};

export default LiveTrackingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerLabel: {
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 2,
    borderRadius: 4,
    fontSize: 12,
    textAlign: "center",
  },
  infoContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
