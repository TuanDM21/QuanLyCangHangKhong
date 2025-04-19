import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import Layout from "./Layout";
import httpApiClient from "../services";

const LiveTrackingScreen = () => {
  const route = useRoute();
  const { flight } = route.params || {};

  // 1) Kiểm tra dữ liệu chuyến bay
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

  // 2) Tách code sân bay (object hoặc string)
  const depCode =
    typeof flight.departureAirport === "object"
      ? flight.departureAirport.airportCode
      : flight.departureAirport;
  const arrCode =
    typeof flight.arrivalAirport === "object"
      ? flight.arrivalAirport.airportCode
      : flight.arrivalAirport;

  // 3) State lưu airports, tọa độ và vị trí marker
  const [airports, setAirports] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);

  // 4) Fetch danh sách airports
  useEffect(() => {
    const fetchAirports = async () => {
      setLoadingAirports(true);
      try {
        const res = await httpApiClient.get("airports");
        const json = await res.json();
        setAirports(json.data);
      } catch (err) {
        Alert.alert("Lỗi", err.message);
      } finally {
        setLoadingAirports(false);
      }
    };
    fetchAirports();
  }, []);

  // 5) Khi đã có airports, tìm tọa độ origin & destination
  useEffect(() => {
    if (!airports.length) return;
    const dep = airports.find((a) => a.airportCode === depCode);
    const arr = airports.find((a) => a.airportCode === arrCode);
    if (!dep || !arr) {
      Alert.alert("Lỗi", "Không tìm thấy tọa độ sân bay.");
      return;
    }
    const o = { latitude: dep.latitude, longitude: dep.longitude };
    const d = { latitude: arr.latitude, longitude: arr.longitude };
    setOrigin(o);
    setDestination(d);
    setMarkerPosition(o);
  }, [airports, depCode, arrCode]);

  // 6) Chuyển "HH:mm:ss" sang giây kể từ 00:00
  const parseTimeToSeconds = (t) => {
    if (!t) return 0;
    const [h, m, s = "0"] = t.split(":");
    return +h * 3600 + +m * 60 + +s;
  };
  const depSec = parseTimeToSeconds(flight.actualDepartureTime);
  let arrSec = parseTimeToSeconds(flight.actualArrivalTime);
  if (arrSec <= depSec) arrSec += 24 * 3600;
  const totalDuration = arrSec - depSec;

  // 7) Tính bearing để xoay icon
  const calcBearing = (S, E) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const y =
      Math.sin(toRad(E.longitude - S.longitude)) * Math.cos(toRad(E.latitude));
    const x =
      Math.cos(toRad(S.latitude)) * Math.sin(toRad(E.latitude)) -
      Math.sin(toRad(S.latitude)) *
        Math.cos(toRad(E.latitude)) *
        Math.cos(toRad(E.longitude - S.longitude));
    let b = (Math.atan2(y, x) * 180) / Math.PI;
    return (b + 360) % 360;
  };
  const bearing = origin && destination ? calcBearing(origin, destination) : 0;

  // ————————————————————————————
  // 8) Sinh routeCoords theo quadratic Bézier với offset động
  const makeBezier = (P0, P1, segments = 80, offsetLon = 1.5) => {
    const midLat = (P0.latitude + P1.latitude) / 2;
    const midLon = (P0.longitude + P1.longitude) / 2 + offsetLon;
    const C = { latitude: midLat, longitude: midLon };

    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const inv = 1 - t;
      const lat =
        inv * inv * P0.latitude +
        2 * inv * t * C.latitude +
        t * t * P1.latitude;
      const lon =
        inv * inv * P0.longitude +
        2 * inv * t * C.longitude +
        t * t * P1.longitude;
      pts.push({ latitude: lat, longitude: lon });
    }
    return pts;
  };

  // Xác định offsetLon nhỏ hơn nếu bay giữa hai sân bay miền Bắc
  const northernCodes = ["HAN", "VII", "DIN", "HPH", "THQ"];
  const isNorthern =
    northernCodes.includes(depCode) && northernCodes.includes(arrCode);
  const offsetLon = isNorthern ? 0.5 : 0.8;

  const [routeCoords, setRouteCoords] = useState([]);
  useEffect(() => {
    if (origin && destination) {
      setRouteCoords(makeBezier(origin, destination, 100, offsetLon));
    }
  }, [origin, destination, offsetLon]);

  // ————————————————————————————
  // 9) Interval mỗi giây update vị trí marker
  useEffect(() => {
    if (!origin || !destination) return;
    const iv = setInterval(() => {
      const now = new Date();
      let t = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      if (t < depSec) return setMarkerPosition(origin);
      if (t > arrSec) return setMarkerPosition(destination);
      const p = (t - depSec) / totalDuration;
      setMarkerPosition({
        latitude: origin.latitude + (destination.latitude - origin.latitude) * p,
        longitude:
          origin.longitude + (destination.longitude - origin.longitude) * p,
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [origin, destination, depSec, arrSec, totalDuration]);

  // 10) Nếu chưa sẵn sàng thì show loader
  if (loadingAirports || !origin || !destination || !markerPosition) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 11) Tính region cho bản đồ
  const region = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
    latitudeDelta:
      Math.abs(origin.latitude - destination.latitude) * 2 || 8,
    longitudeDelta:
      Math.abs(origin.longitude - destination.longitude) * 2 || 8,
  };

  // 12) Render map
  return (
    <Layout>
      <View style={styles.container}>
        <MapView style={styles.map} initialRegion={region}>
          {/* Bézier curve */}
          <Polyline
            coordinates={routeCoords}
            strokeColor="#007AFF"
            strokeWidth={3}
          />
          {/* Máy bay */}
          <Marker
            coordinate={markerPosition}
            rotation={bearing}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Ionicons name="airplane" size={30} color="red" />
          </Marker>
          {/* Sân bay */}
          <Marker coordinate={origin}>
            <Ionicons name="location" size={24} color="green" />
            <Text style={styles.markerLabel}>{depCode}</Text>
          </Marker>
          <Marker coordinate={destination}>
            <Ionicons name="location" size={24} color="blue" />
            <Text style={styles.markerLabel}>{arrCode}</Text>
          </Marker>
        </MapView>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Live Tracking chuyến bay: {flight.flightNumber}
          </Text>
          <Text style={styles.infoText}>
            Từ {depCode} → {arrCode}
          </Text>
          <Text style={styles.infoText}>
            {flight.actualDepartureTime} → {flight.actualArrivalTime}
          </Text>
        </View>
      </View>
    </Layout>
  );
};

export default LiveTrackingScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
  errorText: {
    fontSize: 16,
    color: "red",
  },
});
