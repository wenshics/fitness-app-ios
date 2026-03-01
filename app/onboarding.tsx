import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useUser } from "@/lib/user-store";
import * as Haptics from "expo-haptics";

export default function OnboardingScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { updateUserProfile, userProfile } = useUser();
  const router = useRouter();

  const [dateOfBirth, setDateOfBirth] = useState(userProfile?.dateOfBirth || "");
  const [height, setHeight] = useState(userProfile?.height?.toString() || "");
  const [weight, setWeight] = useState(userProfile?.weight?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = useCallback(() => {
    if (!dateOfBirth.trim()) {
      Alert.alert("Missing Information", "Please enter your date of birth (YYYY-MM-DD)");
      return false;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format (e.g., 1990-05-15)");
      return false;
    }

    // Validate date is valid
    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) {
      Alert.alert("Invalid Date", "Please enter a valid date");
      return false;
    }

    // Check if date is not in the future
    if (date > new Date()) {
      Alert.alert("Invalid Date", "Date of birth cannot be in the future");
      return false;
    }

    if (!height.trim()) {
      Alert.alert("Missing Information", "Please enter your height in cm");
      return false;
    }

    const heightNum = parseFloat(height);
    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      Alert.alert("Invalid Height", "Please enter a height between 100-250 cm");
      return false;
    }

    if (!weight.trim()) {
      Alert.alert("Missing Information", "Please enter your weight in kg");
      return false;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      Alert.alert("Invalid Weight", "Please enter a weight between 30-300 kg");
      return false;
    }

    return true;
  }, [dateOfBirth, height, weight]);

  const handleSave = useCallback(async () => {
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Update profile
      await updateUserProfile({
        dateOfBirth,
        height: parseFloat(height),
        weight: parseFloat(weight),
        onboardingCompleted: true,
      });

      // Add a small delay to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      Alert.alert("Success", "Your profile has been updated!", [
        {
          text: "OK",
          onPress: () => {
            router.replace("/(tabs)");
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
      setIsLoading(false);
    }
  }, [dateOfBirth, height, weight, validateInputs, updateUserProfile, router]);

  const handleSkip = useCallback(() => {
    Alert.alert("Skip Onboarding?", "You can update this information later in your profile.", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Skip",
        onPress: () => {
          router.replace("/(tabs)");
        },
      },
    ]);
  }, [router]);

  return (
    <ScreenContainer containerClassName={`bg-background`}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Welcome to Pulse!</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Let's get to know you better
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Date of Birth */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Date of Birth</Text>
              <Text style={[styles.hint, { color: colors.muted }]}>Format: YYYY-MM-DD</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="1990-05-15"
                placeholderTextColor={colors.muted}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                editable={!isLoading}
              />
            </View>

            {/* Height */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Height</Text>
              <Text style={[styles.hint, { color: colors.muted }]}>In centimeters (cm)</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithUnitField,
                    {
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="170"
                  placeholderTextColor={colors.muted}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  editable={!isLoading}
                />
                <Text style={[styles.unit, { color: colors.muted }]}>cm</Text>
              </View>
            </View>

            {/* Weight */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Weight</Text>
              <Text style={[styles.hint, { color: colors.muted }]}>In kilograms (kg)</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithUnitField,
                    {
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="70"
                  placeholderTextColor={colors.muted}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  editable={!isLoading}
                />
                <Text style={[styles.unit, { color: colors.muted }]}>kg</Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {isLoading ? "Saving..." : "Continue"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.muted }]}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  form: {
    marginBottom: 40,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    fontWeight: "400",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWithUnitField: {
    flex: 1,
  },
  unit: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
