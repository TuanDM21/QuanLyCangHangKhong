import ky from "ky";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const httpApiClient = ky.create({
  prefixUrl: "http://localhost:8080/api/",
  timeout: 10000,

  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (!response.ok) {
          const responseBody = await response.json();
          Alert.alert("Lỗi", responseBody.message || "Có lỗi xảy ra");
        } else if (response.status === 404) {
          Alert.alert("Not Found", "The requested resource was not found.");
        }
        return response;
      },
    ],
  },
});

export default httpApiClient;
