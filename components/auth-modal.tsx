import { useColors } from "@/hooks/use-colors";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { notifyAuthChanged } from "@/hooks/use-auth";
import { establishSession } from "@/lib/_core/api";
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
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (isLoading) return;

    // Clear previous error
    setErrorMessage("");

    // Validation
    if (!email.trim()) {
      setErrorMessage("Please enter your email");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your password");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setErrorMessage("Please enter your name");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters");
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
      const fullUrl = `${apiUrl}${endpoint}`;

      const payload = mode === "login" 
        ? { email, password }
        : { email, password, name };

      console.log(`[AuthModal] ${mode} request to:`, fullUrl);
      console.log(`[AuthModal] ${mode} payload:`, payload);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log(`[AuthModal] ${mode} response status:`, response.status);
      const responseText = await response.text();
      console.log(`[AuthModal] ${mode} response text:`, responseText);

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          const errorMsg = errorData.error || errorData.message || `${mode} failed`;
          
          // Provide specific error messages
          if (mode === "login" && response.status === 401) {
            setErrorMessage("Invalid email or password. Please sign up with a new account if you don't have one.");
          } else if (mode === "signup" && response.status === 400 && errorMsg.includes("already")) {
            setErrorMessage("Email already registered. Please sign in instead.");
          } else {
            setErrorMessage(errorMsg);
          }
        } catch {
          setErrorMessage(`${mode} failed: ${response.status}`);
        }
        setIsLoading(false);
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("[AuthModal] Failed to parse response:", responseText);
        setErrorMessage("Invalid response from server");
        setIsLoading(false);
        return;
      }

      console.log(`[AuthModal] ${mode} response data:`, data);

      if (data.sessionToken) {
        console.log("[AuthModal] Setting session token and user info");
        await Auth.setSessionToken(data.sessionToken);
        
        // Establish session on backend for cookie-based auth
        console.log("[AuthModal] Establishing session on backend");
        await establishSession(data.sessionToken);
        
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
        
        console.log("[AuthModal] Notifying auth changed");
        notifyAuthChanged();
        
        console.log("[AuthModal] Resetting form and closing modal");
        // Reset form and close
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setName("");
        setMode("login");
        setErrorMessage("");
        setIsLoading(false);
        
        // Close modal after a brief delay to ensure state updates
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        console.error("[AuthModal] No session token in response");
        setErrorMessage("No session token in response");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(`[AuthModal] ${mode} error:`, err);
      const message = err instanceof Error ? err.message : `${mode} failed`;
      setErrorMessage(message);
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

          {/* Error Message */}
          {errorMessage && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + "20", borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          )}

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
                setErrorMessage("");
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
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
