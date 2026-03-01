import { createContext, useContext, useState, ReactNode } from "react";
import { AuthModal } from "@/components/auth-modal";

interface AuthModalContextType {
  showAuthModal: () => void;
  hideAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showAuthModal = () => setVisible(true);
  const hideAuthModal = () => setVisible(false);

  return (
    <AuthModalContext.Provider value={{ showAuthModal, hideAuthModal }}>
      {children}
      <AuthModal visible={visible} onClose={hideAuthModal} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}
