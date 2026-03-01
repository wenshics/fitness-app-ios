import { useColors } from "@/hooks/use-colors";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { notifyAuthChanged } from "@/hooks/use-auth";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { IconSymbol } from "./ui/icon-symbol";

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthModal({ visible, onClose }: AuthModalProps) {
  const colors = useColors();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (isLoading) return;

    // Validation
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        Alert.alert("Error", "Please enter your name");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }
      if (password.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters");
        return;
      }
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);
    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = mode === "login" ? "/api/auth/email-login" : "/api/auth/email-signup";

      const payload = mode === "login" 
        ? { email, password }
        : { email, password, name };

      console.log(`[AuthModal] ${mode} to:`, apiUrl + endpoint);

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `${mode} failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[AuthModal] ${mode} response:`, data);

      if (data.sessionToken) {
        await Auth.setSessionToken(data.sessionToken);
        if (data.user) {
          const userInfo: Auth.User = {
            id: data.user.id,
            openId: data.user.openId,
            name: data.user.name,
            email: data.user.email,
            loginMethod: data.user.loginMethod,
            lastSignedIn: new Date(data.user.lastSignedIn || Date.now()),
          };
          await Auth.setUserInfo(userInfo);
        }
        notifyAuthChanged();
        
        // Reset form and close
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setName("");
        setMode("login");
        onClose();
      } else {
        throw new Error("No session token in response");
      }
    } catch (err) {
      console.error(`[AuthModal] ${mode} error:`, err);
      const message = err instanceof Error ? err.message : `${mode} failed`;
      Alert.alert("Error", message);
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: colors.background + "CC" }]}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {mode === "login" ? "Sign In" : "Create Account"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {mode === "login"
                ? "Enter your email and password"
                : "Create a new account to get started"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === "signup" && (
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                editable={!isLoading}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />
            )}

            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
            />

            {mode === "signup" && (
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isLoading}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary },
              (pressed || isLoading) && { opacity: 0.8 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          {/* Toggle Mode */}
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleText, { color: colors.muted }]}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <Pressable
              onPress={() => {
                setMode(mode === "login" ? "signup" : "login");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setName("");
              }}
              disabled={isLoading}
            >
              <Text style={[styles.toggleLink, { color: colors.primary }]}>
                {mode === "login" ? "Sign Up" : "Sign In"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  form: {
    gap: 12,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
