/**
 * Web fallback for StripeProviderWrapper.
 * On web, Stripe React Native SDK is not available — render children directly.
 */
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function StripeProviderWrapper({ children }: Props) {
  return <>{children}</>;
}
