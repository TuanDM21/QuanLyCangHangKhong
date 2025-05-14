import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import Layout from "./Layout";
import httpApiClient from "../services";
import FlightInfoPanel from '../components/FlightInfoPanel';

const LiveTrackingMapScreen = () => {
  const [flights, setFlights] = useState([]);
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [flightRes, airportRes] = await Promise.all([
          httpApiClient.get("flights/live-tracking-group"),
          httpApiClient.get("airports"),
        ]);
        const flightJson = await flightRes.json();
        const airportJson = await airportRes.json();
        setFlights((flightJson.data || []).filter(f => f.actualDepartureTime && f.actualArrivalTime && !f.actualDepartureTimeAtArrival));
        setAirports(airportJson.data || []);
      } catch (e) {
        Alert.alert("Lỗi", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helper: chuyển time sang giây
  function parseTimeToSeconds(t) {
    if (!t) return 0;
    const [h, m, s = '0'] = t.split(':');
    return +h * 3600 + +m * 60 + +s;
  }

  // Lấy danh sách mã sân bay liên quan đến các chuyến bay
  const usedAirportCodes = useMemo(() => {
    if (!flights || flights.length === 0) return [];
    const codes = new Set();
    flights.forEach(f => {
      const dep = typeof f.departureAirport === 'object' ? f.departureAirport.airportCode : f.departureAirport;
      const arr = typeof f.arrivalAirport === 'object' ? f.arrivalAirport.airportCode : f.arrivalAirport;
      codes.add(dep);
      codes.add(arr);
    });
    return Array.from(codes); // Đảm bảo luôn là mảng
  }, [flights]);

  // Lấy thông tin sân bay theo code
  const getAirport = (code) => airports.find(a => a.airportCode === code || a.id === code);

  // Tính region trung tâm
  const region = useMemo(() => {
    const coords = Array.from(usedAirportCodes).map(code => {
      const a = getAirport(code);
      return a ? { latitude: a.latitude, longitude: a.longitude } : null;
    }).filter(Boolean);
    if (coords.length === 0) return { latitude: 16.0471, longitude: 108.2068, latitudeDelta: 7, longitudeDelta: 7 };
    const avgLat = coords.reduce((s, c) => s + c.latitude, 0) / coords.length;
    const avgLon = coords.reduce((s, c) => s + c.longitude, 0) / coords.length;
    return { latitude: avgLat, longitude: avgLon, latitudeDelta: 7, longitudeDelta: 7 };
  }, [usedAirportCodes, airports]);

  // Tính vị trí máy bay trên đường bay
  const getPlanePosition = (flight) => {
    const depCode = typeof flight.departureAirport === 'object' ? flight.departureAirport.airportCode : flight.departureAirport;
    const arrCode = typeof flight.arrivalAirport === 'object' ? flight.arrivalAirport.airportCode : flight.arrivalAirport;
    const dep = getAirport(depCode);
    const arr = getAirport(arrCode);
    if (!dep || !arr) return null;
    const depSec = parseTimeToSeconds(flight.actualDepartureTime);
    let arrSec = parseTimeToSeconds(flight.actualArrivalTime);
    if (arrSec <= depSec) arrSec += 24 * 3600;
    const totalDuration = arrSec - depSec;
    const now = new Date();
    let nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (nowSec < depSec) nowSec = depSec;
    if (nowSec > arrSec) nowSec = arrSec;
    const progress = (nowSec - depSec) / totalDuration;
    const lat = dep.latitude + (arr.latitude - dep.latitude) * progress;
    const lon = dep.longitude + (arr.longitude - dep.longitude) * progress;
    return progress >= 1 ? arr : (progress <= 0 ? dep : { latitude: lat, longitude: lon });
  };

  // Hàm makeBezier và getCurveBetween như LiveTrackingScreen
  function makeBezier(P0, P1, segments = 100, offsetLon = 1.5) {
    const midLat = (P0.latitude + P1.latitude) / 2;
    const midLon = (P0.longitude + P1.longitude) / 2 + offsetLon;
    const C = { latitude: midLat, longitude: midLon };
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const inv = 1 - t;
      const lat = inv * inv * P0.latitude + 2 * inv * t * C.latitude + t * t * P1.latitude;
      const lon = inv * inv * P0.longitude + 2 * inv * t * C.longitude + t * t * P1.longitude;
      pts.push({ latitude: lat, longitude: lon });
    }
    return pts;
  }
  const vietnamCurve = [
    { latitude: 23.393395, longitude: 105.390846 },
    { latitude: 22.396428, longitude: 104.008621 },
    { latitude: 21.028511, longitude: 105.804817 },
    { latitude: 20.320153, longitude: 105.784752 },
    { latitude: 19.8121, longitude: 105.7764 },
    { latitude: 18.6666, longitude: 105.6900 },
    { latitude: 17.5944, longitude: 106.5983 },
    { latitude: 16.0471, longitude: 108.2068 },
    { latitude: 15.2758, longitude: 108.8000 },
    { latitude: 14.4207, longitude: 109.1000 },
    { latitude: 13.7822, longitude: 109.2191 },
    { latitude: 12.2388, longitude: 109.1967 },
    { latitude: 11.9400, longitude: 108.4400 },
    { latitude: 10.7769, longitude: 106.7009 },
    { latitude: 9.7800, longitude: 105.6178 },
  ];
  function getCurveBetween(origin, destination) {
    if (!origin || !destination) return [];
    const lat1 = origin.latitude;
    const lat2 = destination.latitude;
    if (lat1 < lat2) {
      return vietnamCurve.filter(p => p.latitude > lat1 && p.latitude < lat2).sort((a, b) => a.latitude - b.latitude);
    } else {
      return vietnamCurve.filter(p => p.latitude < lat1 && p.latitude > lat2).sort((a, b) => b.latitude - a.latitude);
    }
  }

  return (
    <Layout>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Bản đồ Live Tracking chuyến bay</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : flights.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.infoText}>Không có chuyến bay nào đủ dữ liệu để hiển thị live tracking.</Text>
          </View>
        ) : (
          <MapView style={styles.map} initialRegion={region}>
            {/* Marker cho các sân bay duy nhất */}
            {usedAirportCodes.map((code, idx) => {
              const a = getAirport(code);
              if (!a) return null;
              return (
                <Marker
                  key={a.id || a.airportCode || idx}
                  coordinate={{ latitude: a.latitude, longitude: a.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.airportMarker}>
                    <Ionicons name="location" size={18} color="#007AFF" />
                    <Text style={styles.airportCode}>{a.airportCode}</Text>
                  </View>
                </Marker>
              );
            })}
            {/* Polyline & marker máy bay cho từng chuyến bay, line chỉ vẽ đến vị trí máy bay */}
            {flights.map((flight, idx) => {
              const depCode = typeof flight.departureAirport === 'object' ? flight.departureAirport.airportCode : flight.departureAirport;
              const arrCode = typeof flight.arrivalAirport === 'object' ? flight.arrivalAirport.airportCode : flight.arrivalAirport;
              const dep = getAirport(depCode);
              const arr = getAirport(arrCode);
              if (!dep || !arr) return null;
              // Polyline chữ S
              const curvePoints = [dep, ...getCurveBetween(dep, arr), arr];
              // Tính vị trí máy bay
              const depSec = parseTimeToSeconds(flight.actualDepartureTime);
              let arrSec = parseTimeToSeconds(flight.actualArrivalTime);
              if (arrSec <= depSec) arrSec += 24 * 3600;
              const totalDuration = arrSec - depSec;
              const now = new Date();
              let nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
              if (nowSec < depSec) return null;
              if (nowSec > arrSec) nowSec = arrSec;
              const progress = (nowSec - depSec) / totalDuration;
              const idxPlane = Math.floor(progress * (curvePoints.length - 1));
              let markerPosition = curvePoints[idxPlane];
              // Nếu marker máy bay trùng vị trí sân bay thì chỉ dịch khi chưa đến nơi, còn nếu đã đến thì đặt đúng vị trí sân bay
              const isSame = (a, b) => Math.abs(a.latitude - b.latitude) < 0.0002 && Math.abs(a.longitude - b.longitude) < 0.0002;
              if (progress < 1) {
                if (isSame(markerPosition, dep)) {
                  markerPosition = { ...markerPosition, latitude: markerPosition.latitude + 0.015, longitude: markerPosition.longitude + 0.015 };
                } else if (isSame(markerPosition, arr)) {
                  markerPosition = { ...markerPosition, latitude: markerPosition.latitude - 0.015, longitude: markerPosition.longitude - 0.015 };
                }
              } else {
                markerPosition = arr;
              }
              // Vẽ line đến vị trí máy bay
              return [
                <Polyline
                  key={`polyline-${flight.id || idx}`}
                  coordinates={curvePoints.slice(0, idxPlane + 1)}
                  strokeColor="#007AFF"
                  strokeWidth={4}
                />, 
                markerPosition && (
                  <Marker
                    key={`plane-${flight.id || idx}`}
                    coordinate={markerPosition}
                    anchor={{ x: 0.5, y: 0.7 }}
                    onPress={() => {
                      setSelectedFlight(flight);
                      setPanelVisible(true);
                    }}
                  >
                    <View style={styles.markerShadow}>
                      <Ionicons name="airplane" size={22} color="#ff3b30" />
                      <Text style={styles.markerFlightNumber}>{flight.flightNumber}</Text>
                    </View>
                  </Marker>
                )
              ];
            })}
          </MapView>
        )}
        <FlightInfoPanel
          flight={selectedFlight}
          origin={selectedFlight && getAirport(typeof selectedFlight.departureAirport === 'object' ? selectedFlight.departureAirport.airportCode : selectedFlight.departureAirport)}
          destination={selectedFlight && getAirport(typeof selectedFlight.arrivalAirport === 'object' ? selectedFlight.arrivalAirport.airportCode : selectedFlight.arrivalAirport)}
          progress={selectedFlight ? (() => {
            const depSec = parseTimeToSeconds(selectedFlight.actualDepartureTime);
            let arrSec = parseTimeToSeconds(selectedFlight.actualArrivalTime);
            if (arrSec <= depSec) arrSec += 24 * 3600;
            const totalDuration = arrSec - depSec;
            const now = new Date();
            let nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            if (nowSec < depSec) nowSec = depSec;
            if (nowSec > arrSec) nowSec = arrSec;
            return (nowSec - depSec) / totalDuration;
          })() : 0}
          visible={panelVisible && !!selectedFlight}
          onClose={() => setPanelVisible(false)}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  map: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
    marginTop: 20,
  },
  markerShadow: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
  },
  markerFlightNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#007AFF',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 0,
    overflow: 'hidden',
    textAlign: 'center',
  },
  airportMarker: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#007AFF',
    minWidth: 54,
    minHeight: 54,
    justifyContent: 'center',
  },
  airportCode: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#007AFF',
    letterSpacing: 1.2,
    marginTop: 2,
  },
});

export default LiveTrackingMapScreen;
