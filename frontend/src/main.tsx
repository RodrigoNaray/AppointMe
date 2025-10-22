import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { BookingProvider } from "./context/BookingContext.tsx";
import { Toaster } from "@/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BookingProvider>
        <App />
        <Toaster />
      </BookingProvider>
    </AuthProvider>
  </StrictMode>
);
