import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, StatusBar, ScrollView, Animated, Dimensions } from "react-native";
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const JobScreen = () => {
  const navigation = useNavigation();
  const [permissions, setPermissions] = useState([]);
  const [scrollY] = useState(new Animated.Value(0));
  const windowWidth = Dimensions.get('window').width;

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setPermissions(user.permissions || []);
        }
      } catch (e) {
        setPermissions([]);
      }
    })();
  }, []);

  const hasPermission = (perm) => Array.isArray(permissions) && permissions.includes(perm);

  return (
    <Layout>
      <StatusBar barStyle="light-content" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <ImageBackground 
          source={require('../../../assets/plane.png')} 
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <LinearGradient
            colors={['rgba(30,58,138,0.9)', 'rgba(59,130,246,0.95)']}
            style={styles.gradientOverlay}
          >
            {/* Header Animation */}
            <Animated.View style={[
              styles.headerContainer,
              {
                transform: [{ 
                  translateY: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, -10],
                    extrapolate: 'clamp'
                  }) 
                }],
                opacity: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0.9],
                  extrapolate: 'clamp'
                })
              }
            ]}>
              <View style={styles.iconHeader}>
                <FontAwesome5 name="tools" size={32} color="white" />
              </View>
              <Text style={styles.title}>Quản lý Công việc</Text>
              <Text style={styles.subtitle}>Theo dõi và quản lý các công việc tại sân bay</Text>
            </Animated.View>

            <View style={styles.cardContainer}>
              {/* Tạo công việc mới */}
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("CreateJobScreen")}
              >
                                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.cardGradient}
                  >
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="plus-circle" size={32} color="white" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Tạo công việc mới</Text>
                    <Text style={styles.cardDescription}>Tạo mới các công việc và nhiệm vụ</Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Công việc của tôi */}
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("MyJobsScreen")}
              >
                <LinearGradient
                  colors={['#7C3AED', '#A78BFA']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.cardGradient}
                >
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="account-check" size={32} color="white" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Công việc của tôi</Text>
                    <Text style={styles.cardDescription}>Công việc được giao cho tôi</Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Tìm kiếm công việc */}
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("SearchJobScreen")}
              >
                <LinearGradient
                  colors={['#F59E0B', '#FBBF24']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.cardGradient}
                >
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="search" size={28} color="white" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Tìm kiếm công việc</Text>
                    <Text style={styles.cardDescription}>Tìm kiếm theo ngày, loại, trạng thái</Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Báo cáo và thống kê */}
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("JobReportsScreen")}
              >
                <LinearGradient
                  colors={['#DC2626', '#F87171']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.cardGradient}
                >
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="chart-line" size={32} color="white" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Báo cáo và thống kê</Text>
                    <Text style={styles.cardDescription}>Thống kê hiệu suất và báo cáo</Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Animated.ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
  },
  backgroundImageStyle: {
    opacity: 0.25,
  },
  gradientOverlay: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: "center",
  },
  iconHeader: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 90,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardArrow: {
    marginLeft: 12,
  },
});

export default JobScreen; 