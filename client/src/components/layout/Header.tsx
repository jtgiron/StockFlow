import { useAuth } from "../../contexts/AuthContext";
import Badge from "../ui/Badge";

export default function Header() {
  const { isAdmin } = useAuth();

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="h-14 border-b border-surface-800 bg-surface-950/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-20">
      <p className="text-sm text-surface-600 capitalize tracking-wide">
        {today}
      </p>
      <div className="flex items-center gap-3">
        <Badge variant={isAdmin ? "warning" : "info"}>
          {isAdmin ? "Admin" : "Empleado"}
        </Badge>
      </div>
    </header>
  );
}
