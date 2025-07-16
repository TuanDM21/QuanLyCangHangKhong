import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, StatusBar, SafeAreaView, ScrollView, Animated, Dimensions } from "react-native";
import Layout from "../Common/Layout";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const ActivityScreen = () => {
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
            colors={['rgba(25,118,210,0.9)', 'rgba(13,71,161,0.95)']}
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
                <FontAwesome5 name="plane-departure" size={32} color="white" />
              </View>
              <Text style={styles.title}>Quản lý hoạt động</Text>
              <Text style={styles.subtitle}>Theo dõi và quản lý các hoạt động tại sân bay</Text>
            </Animated.View>



            <View style={styles.cardContainer}>
              {hasPermission("CAN_CREATE_ACTIVITY") && (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate("CreateActivityScreen")}
                >
                  <LinearGradient
                    colors={['#3949AB', '#1E88E5']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.cardGradient}
                  >
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons name="calendar-plus" size={32} color="white" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>Tạo hoạt động</Text>
                      <Text style={styles.cardDescription}>Tạo mới các hoạt động và sự kiện</Text>
                    </View>
                    <View style={styles.cardArrow}>
                      <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("MyActivitiesScreen")}
              >
                <LinearGradient
                  colors={['#00897B', '#26A69A']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.cardGradient}
                >
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="account-group" size={32} color="white" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Hoạt động của tôi</Text>
                    <Text style={styles.cardDescription}>Xem hoạt động đã đăng ký</Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("SearchActivityScreen")}
              >
                <LinearGradient
                  colors={['#F57C00', '#FFB74D']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.cardGradient}
                >
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="calendar-alt" size={28} color="white" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Lịch hoạt động</Text>
                    <Text style={styles.cardDescription}>Xem lịch hoạt động theo ngày hoặc tuần</Text>
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
    marginBottom: 10,
    maxWidth: '80%',
  },

  cardContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  card: {
    height: 100,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  cardArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default ActivityScreen;