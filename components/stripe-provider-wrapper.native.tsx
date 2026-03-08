/**
 * Native-only Stripe Provider wrapper.
 * This file is only bundled on iOS/Android by Metro's platform resolution.
 */
import { StripeProvider } from "@stripe/stripe-react-native";
import React, { type ReactNode } from "react";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

interface Props {
  children: ReactNode;
}

export function StripeProviderWrapper({ children }: Props) {
  return (
    <StripeProvider
      publishableKey={PUBLISHABLE_KEY}
      merchantIdentifier="merchant.space.manus.fitness.app.ios"
      urlScheme="manus20260212000221"
    >
      {children as React.ReactElement}
    </StripeProvider>
  );
}
