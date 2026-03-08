import { useEffect } from "react";
import { useRouter } from "expo-router";

// This screen is no longer used — Apple IAP is handled in the paywall.
// Redirect any lingering navigation to paywall.
export default function PaymentInfoScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/paywall");
  }, [router]);
  return null;
}
