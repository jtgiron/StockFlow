import { z } from "zod/v4";

const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

const passwordSchema = z
  .string({ error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(PASSWORD_COMPLEXITY_RE, "La contraseña debe incluir al menos una mayúscula, una minúscula y un número");

export const createUserSchema = z.object({
  email: z.email("Email inválido"),
  password: passwordSchema,
  full_name: z.string({ error: "El nombre completo es obligatorio" }).trim().min(1, "El nombre completo es obligatorio"),
  fullName: z.string().trim().min(1).optional(),
  role: z.enum(["admin", "employee"], { error: "Rol inválido" }).default("employee"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "employee"], { error: "Rol inválido" }),
});
