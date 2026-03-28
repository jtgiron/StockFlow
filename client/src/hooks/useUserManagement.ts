import { useState, useCallback } from "react";
import { api } from "../services/api";
import type { UserRole } from "../types";
import toast from "react-hot-toast";

export function useUserManagement() {
  const [loading, setLoading] = useState(false);

  const createUser = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole,
    ) => {
      setLoading(true);
      try {
        await api.post("/users", {
          email,
          password,
          full_name: fullName,
          role,
        });
        toast.success("Usuario creado exitosamente");
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al crear usuario",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteUser = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      await api.delete(`/users/${userId}`);
      toast.success("Usuario eliminado exitosamente");
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar usuario",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateResetCode = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = await api.post<{
        reset_code: string;
        expires_at: string;
        expires_in_minutes: number;
      }>(`/users/${userId}/reset-code`);
      return data;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al generar código",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createUser, deleteUser, generateResetCode, loading };
}
