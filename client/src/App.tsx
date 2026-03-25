import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import Router from "./router.tsx";

export default function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
          },
        }}
      />
    </AuthProvider>
  );
}
