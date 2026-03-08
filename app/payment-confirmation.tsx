import { useEffect } from "react";
import { useRouter } from "expo-router";

// This screen is no longer used — Apple IAP is handled in the paywall.
export default function PaymentConfirmationScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/paywall");
  }, [router]);
  return null;
}
