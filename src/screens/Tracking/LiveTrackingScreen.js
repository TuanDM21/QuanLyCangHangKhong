import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import Layout from "../Common/Layout";
import httpApiClient from "../../services";
import FlightInfoPanel from '../../components/FlightInfoPanel';

// Hàm makeBezier đã bị thiếu, cần bổ sung lại
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

const LiveTrackingScreen = () => {
  const route = useRoute();
  // Đảm bảo route.params luôn là object, tránh lỗi khi undefined
  const flight = route?.params?.flight;

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
  if (flight.actualDepartureTimeAtArrival) {
    return (
      <Layout>≈
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Chuyến bay đã rời sân bay đến, không còn theo dõi live tracking.</Text>
      </View>
      </Layout>
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

  // Bottom sheet animation state
  const [expanded, setExpanded] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0]; // 0: collapsed, 1: expanded

  const toggleSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded((v) => !v);
  };

  // Modal state for marker
  const [showMarkerModal, setShowMarkerModal] = useState(false);

  // State điều khiển hiển thị panel nhỏ
  const [showPanel, setShowPanel] = useState(false);

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

  // Slider state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);

  // Tính progress hiện tại (0-1)
  const now = new Date();
  let nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  if (nowSec < depSec) nowSec = depSec;
  if (nowSec > arrSec) nowSec = arrSec;
  const realProgress = (nowSec - depSec) / totalDuration;
  const progress = isSeeking ? seekProgress : realProgress;

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
  // 8) Đường cong hình chữ S của Việt Nam (nhiều điểm, mềm mại)
  const vietnamCurve = [
    { latitude: 23.393395, longitude: 105.390846 }, // Hà Giang (Bắc)
    { latitude: 22.396428, longitude: 104.008621 },
    { latitude: 21.028511, longitude: 105.804817 }, // Hà Nội
    { latitude: 20.320153, longitude: 105.784752 },
    { latitude: 19.8121, longitude: 105.7764 }, // Vinh
    { latitude: 18.6666, longitude: 105.6900 },
    { latitude: 17.5944, longitude: 106.5983 },
    { latitude: 16.0471, longitude: 108.2068 }, // Đà Nẵng
    { latitude: 15.2758, longitude: 108.8000 },
    { latitude: 14.4207, longitude: 109.1000 },
    { latitude: 13.7822, longitude: 109.2191 }, // Quy Nhơn
    { latitude: 12.2388, longitude: 109.1967 }, // Nha Trang
    { latitude: 11.9400, longitude: 108.4400 },
    { latitude: 10.7769, longitude: 106.7009 }, // TP.HCM
    { latitude: 9.7800, longitude: 105.6178 }, // Cà Mau (Nam)
  ];

  // Hàm lấy các điểm trung gian hình chữ S nằm giữa origin và destination
  function getCurveBetween(origin, destination) {
    if (!origin || !destination) return [];
    const lat1 = origin.latitude;
    const lat2 = destination.latitude;
    // Lấy các điểm nằm giữa hai sân bay (theo chiều Bắc-Nam hoặc Nam-Bắc)
    if (lat1 < lat2) {
      // Bay từ Nam ra Bắc
      return vietnamCurve.filter(p => p.latitude > lat1 && p.latitude < lat2).sort((a, b) => a.latitude - b.latitude);
    } else {
      // Bay từ Bắc vào Nam
      return vietnamCurve.filter(p => p.latitude < lat1 && p.latitude > lat2).sort((a, b) => b.latitude - a.latitude);
    }
  }

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

  // Đảm bảo polylineCoords luôn được khai báo trước khi dùng
  const polylineCoords = origin && destination ? [origin, ...getCurveBetween(origin, destination), destination] : [];

  // ————————————————————————————
  // 9) Interval mỗi giây update vị trí marker (bám theo đường cong Polyline)
  const [planeBearing, setPlaneBearing] = useState(0);
  useEffect(() => {
    if (!origin || !destination || !polylineCoords || polylineCoords.length === 0) return;
    // Không update markerPosition khi panel đang mở (tránh mất marker khi bấm vào)
    if (isSeeking || showPanel) return;
    const iv = setInterval(() => {
      const now = new Date();
      let t = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      if (t < depSec) {
        setMarkerPosition(polylineCoords[0]);
        setPlaneBearing(calcBearing(polylineCoords[0], polylineCoords[1]));
        return;
      }
      if (t >= arrSec) {
        setMarkerPosition(polylineCoords[polylineCoords.length - 1]);
        setPlaneBearing(calcBearing(polylineCoords[polylineCoords.length - 2], polylineCoords[polylineCoords.length - 1]));
        return;
      }
      const p = (t - depSec) / totalDuration;
      const idx = Math.floor(p * (polylineCoords.length - 2));
      setMarkerPosition(polylineCoords[idx]);
      setPlaneBearing(calcBearing(polylineCoords[idx], polylineCoords[idx + 1]));
    }, 1000);
    return () => clearInterval(iv);
  }, [origin, destination, depSec, arrSec, totalDuration, polylineCoords, isSeeking, showPanel]);

  // Khi kéo slider: cập nhật markerPosition theo progress
  const handleSeek = (val) => {
    setSeekProgress(val);
    if (!polylineCoords.length) return;
    if (val >= 1) {
      setMarkerPosition(polylineCoords[polylineCoords.length - 1]);
      setPlaneBearing(calcBearing(polylineCoords[polylineCoords.length - 2], polylineCoords[polylineCoords.length - 1]));
      return;
    }
    const idx = Math.floor(val * (polylineCoords.length - 2));
    setMarkerPosition(polylineCoords[idx]);
    setPlaneBearing(calcBearing(polylineCoords[idx], polylineCoords[idx + 1]));
  };
  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekEnd = () => setIsSeeking(false);

  // Helper: kiểm tra máy bay có gần sân bay không
  function isNearAirport(pos, airport, threshold = 0.08) {
    if (!pos || !airport) return false;
    const dLat = Math.abs(pos.latitude - airport.latitude);
    const dLon = Math.abs(pos.longitude - airport.longitude);
    return dLat < threshold && dLon < threshold;
  }

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
          {/* Đường cong nối hai sân bay qua các điểm hình chữ S */}
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor="#007AFF"
              strokeWidth={5}
              lineCap="round"
            />
          )}
          {/* Máy bay di chuyển theo đúng đường cong này */}
          {markerPosition && (
            <Marker
              coordinate={markerPosition}
              anchor={{ x: 0.5, y: 0.7 }}
              style={{ zIndex: 10 }}
              onPress={() => {
                // Chỉ mở panel, không thay đổi markerPosition
                setShowPanel(true);
              }}
            >
              <View style={styles.planeMarkerShadow}>
                <Ionicons name="airplane" size={22} color="#ff3b30" style={{ transform: [{ rotate: `${planeBearing}deg` }] }} />
                <Text style={styles.markerFlightNumber}>{flight.flightNumber}</Text>
              </View>
            </Marker>
          )}
          {/* Sân bay - marker tròn đẹp, label nổi */}
          <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.airportMarkerOrigin}>
              <Text style={styles.airportCode}>{depCode}</Text>
            </View>
          </Marker>
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.airportMarkerDest}>
              <Text style={styles.airportCode}>{arrCode}</Text>
            </View>
          </Marker>
        </MapView>
        <FlightInfoPanel
          flight={flight}
          origin={origin}
          destination={destination}
          progress={progress}
          onSeek={handleSeek}
          onSeekStart={handleSeekStart}
          onSeekEnd={handleSeekEnd}
          visible={showPanel}
          onClose={() => setShowPanel(false)}
        />
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
  planeMarkerShadow: {
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
    marginTop: 0,
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
  airportMarkerOrigin: {
    backgroundColor: '#38b000',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#38b000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  airportMarkerDest: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#007AFF',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  airportCode: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  infoCard: {
    position: 'absolute',
    bottom: 24,
    left: 18,
    right: 18,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22223b',
    marginBottom: 8,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  colInfo: {
    alignItems: 'center',
    minWidth: 80,
  },
  airportBig: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginVertical: 2,
  },
  label: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
  },
  timeBox: {
    alignItems: 'center',
    marginHorizontal: 16,
    minWidth: 80,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 2,
  },
  status: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  infoBar: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  infoBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22223b',
    marginRight: 12,
  },
  map: {
    flex: 1,
    borderRadius: 0,
    marginTop: 0,
  },
  infoSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginBottom: 2,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sheetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22223b',
    marginRight: 10,
  },
  sheetRowInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  sheetLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  sheetValue: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flightModalContainerModern: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    alignItems: 'flex-start',
    width: '90%',
    maxWidth: 400,
    marginBottom: 40, // Để không che footer
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  modalFlightNumberModern: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
  },
  closeBtnModern: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 4,
    marginLeft: 8,
  },
  modalInfoRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  modalLabelModern: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  modalValueModern: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  closeBtn: {
    marginTop: 18,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  closeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  flightInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 6,
    marginBottom: 6,
    alignSelf: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  flightInfoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
    marginRight: 10,
  },
});
