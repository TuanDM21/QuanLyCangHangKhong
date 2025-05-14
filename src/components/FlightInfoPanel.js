import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const FlightInfoPanel = ({ flight, origin, destination, progress, onSeek, onSeekStart, onSeekEnd, visible, onClose }) => {
  if (!visible) return null;
  if (!flight || !origin || !destination) return null;

  // Tính toán thời gian và tiến trình chuyến bay
  const parseTimeToSeconds = (t) => {
    if (!t) return 0;
    const [h, m, s = '0'] = t.split(':');
    return +h * 3600 + +m * 60 + +s;
  };
  const depSec = parseTimeToSeconds(flight.actualDepartureTime);
  let arrSec = parseTimeToSeconds(flight.actualArrivalTime);
  if (arrSec <= depSec) arrSec += 24 * 3600;
  const totalDuration = arrSec - depSec;
  const now = new Date();
  let nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  if (nowSec < depSec) nowSec = depSec;
  if (nowSec > arrSec) nowSec = arrSec;
  const progressValue = ((nowSec - depSec) / totalDuration) * 100;

  // Thông tin sân bay
  const depCode = typeof flight.departureAirport === 'object' ? flight.departureAirport.airportCode : flight.departureAirport;
  const arrCode = typeof flight.arrivalAirport === 'object' ? flight.arrivalAirport.airportCode : flight.arrivalAirport;

  // Ảnh máy bay mặc định
  const planeImg = require('../../assets/plane.png');

  return (
    <View style={styles.panelModern}>
      <View style={styles.headerRowModern}>
        <Ionicons name="airplane" size={22} color="#007AFF" style={{marginRight: 8}} />
        <Text style={styles.flightNumberModern}>{flight.flightNumber}</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeBtnModern} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.infoRowModern}>
        <View style={styles.airportColModern}>
          <Text style={styles.airportCodeModern}>{typeof flight.departureAirport === 'object' ? flight.departureAirport.airportCode : flight.departureAirport}</Text>
          <Text style={styles.timeModern}>{flight.actualDepartureTime || '--:--'}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#007AFF" style={{marginHorizontal: 8}} />
        <View style={styles.airportColModern}>
          <Text style={styles.airportCodeModern}>{typeof flight.arrivalAirport === 'object' ? flight.arrivalAirport.airportCode : flight.arrivalAirport}</Text>
          <Text style={styles.timeModern}>{flight.actualArrivalTime || '--:--'}</Text>
        </View>
      </View>
      <View style={styles.airlineRowModern}>
        <Ionicons name="business" size={16} color="#888" style={{marginRight: 4}} />
        <Text style={styles.airlineModern}>{flight.airline || 'Hãng không xác định'}</Text>
      </View>
      <View style={styles.sliderRowModern}>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={progress}
          onValueChange={onSeek}
          onSlidingStart={onSeekStart}
          onSlidingComplete={onSeekEnd}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#e0e0e0"
          thumbTintColor="#007AFF"
        />
      </View>
      <View style={styles.infoFooterModern}>
        <Text style={styles.infoTextModern}>Tổng: {Math.floor((parseTimeToSeconds(flight.actualArrivalTime)-parseTimeToSeconds(flight.actualDepartureTime))/60)} phút</Text>
        <Text style={styles.infoTextModern}>Đã bay: {Math.floor((nowSec-parseTimeToSeconds(flight.actualDepartureTime))/60)} phút</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 24,
    top: 60,
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 30,
    minWidth: 180,
    maxWidth: 260,
  },
  closeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  planeImg: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  flightNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  airline: {
    fontSize: 11,
    color: '#222',
    fontWeight: '600',
  },
  rowAirports: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  airportCol: {
    alignItems: 'center',
    minWidth: 40,
  },
  airportCode: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  time: {
    fontSize: 10,
    color: '#222',
    fontWeight: '500',
  },
  rowInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  infoText: {
    fontSize: 10,
    color: '#444',
    fontWeight: '500',
  },
  panelModern: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 60,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 30,
    minWidth: 180,
    maxWidth: 340,
  },
  headerRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flightNumberModern: {
    fontSize: 18,
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
  infoRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  airportColModern: {
    alignItems: 'center',
    minWidth: 54,
  },
  airportCodeModern: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 1.2,
  },
  timeModern: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    marginTop: 2,
  },
  airlineRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  airlineModern: {
    fontSize: 13,
    color: '#222',
    fontWeight: '600',
  },
  sliderRowModern: {
    marginVertical: 6,
  },
  infoFooterModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  infoTextModern: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },
});

export default FlightInfoPanel;
