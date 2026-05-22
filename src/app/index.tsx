import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";

interface WeatherData {
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  weather_code: number;
}

interface WikiPlace {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
}

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [places, setPlaces] = useState<WikiPlace[]>([]);

  const [loading, setLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [placesError, setPlacesError] = useState("");
  const [locationError, setLocationError] = useState("");

  const fetchWeather = async (latitude: number, longitude: number) => {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Weather API error");
    }

    const data = await response.json();

    if (!data.current) {
      throw new Error("Weather data missing");
    }

    setWeather(data.current);
  };

  const fetchNearbyPlaces = async (latitude: number, longitude: number) => {
    const url =
      `https://pl.wikipedia.org/w/api.php` +
      `?action=query` +
      `&list=geosearch` +
      `&gscoord=${latitude}|${longitude}` +
      `&gsradius=10000` +
      `&gslimit=20` +
      `&format=json` +
      `&origin=*`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Wikipedia API error");
    }

    const data = await response.json();
    const results = data.query?.geosearch || [];

    setPlaces(results);
  };

  const loadLocationData = async () => {
    setLoading(true);
    setLocationError("");
    setWeatherError("");
    setPlacesError("");
    setLocation(null);
    setWeather(null);
    setPlaces([]);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocationError("Location permission was denied.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);

      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;

      try {
        await fetchWeather(latitude, longitude);
      } catch (error) {
        setWeatherError("Could not load weather data.");
      }

      try {
        await fetchNearbyPlaces(latitude, longitude);
      } catch (error) {
        setPlacesError("Could not load nearby Wikipedia articles.");
      }
    } catch (error) {
      setLocationError("Could not read device location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={places}
        keyExtractor={(item) => item.pageid.toString()}
        ListHeaderComponent={
          <View>
            <Text style={styles.header}>Location Weather & Nearby Places</Text>

            <Text style={styles.description}>
              Press the button to read your current location, fetch weather data,
              and display nearby Wikipedia articles.
            </Text>

            <Button title="Load Location Data" onPress={loadLocationData} />

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" />
                <Text style={styles.info}>Loading data...</Text>
              </View>
            )}

            {locationError ? (
              <Text style={styles.error}>{locationError}</Text>
            ) : null}

            {location && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Current Location</Text>
                <Text>Latitude: {location.coords.latitude}</Text>
                <Text>Longitude: {location.coords.longitude}</Text>
                <Text>Accuracy: {location.coords.accuracy} meters</Text>
                <Text>
                  Timestamp: {new Date(location.timestamp).toLocaleString()}
                </Text>
              </View>
            )}

            {weatherError ? (
              <Text style={styles.error}>{weatherError}</Text>
            ) : null}

            {weather && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Current Weather</Text>
                <Text>Temperature: {weather.temperature_2m} °C</Text>
                <Text>Humidity: {weather.relative_humidity_2m} %</Text>
                <Text>Wind Speed: {weather.wind_speed_10m} km/h</Text>
                <Text>Weather Code: {weather.weather_code}</Text>
              </View>
            )}

            {placesError ? <Text style={styles.error}>{placesError}</Text> : null}

            <Text style={styles.sectionTitle}>Nearby Wikipedia Articles</Text>

            {!loading && places.length === 0 && !placesError ? (
              <Text style={styles.info}>No nearby articles found.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.placeTitle}>{item.title}</Text>
            <Text>Distance: {item.dist} meters</Text>
            <Text>Latitude: {item.lat}</Text>
            <Text>Longitude: {item.lon}</Text>
            <Text>Page ID: {item.pageid}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 110,
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    marginBottom: 16,
  },
  loadingBox: {
    marginTop: 20,
    alignItems: "center",
  },
  info: {
    marginTop: 8,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#dddddd",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 10,
  },
  placeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  error: {
    color: "red",
    marginTop: 12,
    fontWeight: "bold",
  },
});