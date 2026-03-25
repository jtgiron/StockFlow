import { useState, useEffect, type FormEvent } from "react";
import { api } from "../services/api";
import { useUserManagement } from "../hooks/useUserManagement";
import type { Profile, UserRole } from "../types";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import toast from "react-hot-toast";

export default function UsersPage() {
  const {
    createUser,
    deleteUser,
    loading: userActionLoading,
  } = useUserManagement();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Create user form
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newRole, setNewRole] = useState("employee");
  const [deleteUserTarget, setDeleteUserTarget] = useState<Profile | null>(
    null,
  );

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await api.get<Profile[]>("/users");
      setUsers(data ?? []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function openEdit(u: Profile) {
    setEditUser(u);
    setRole(u.role);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      await api.patch(`/users/${editUser.id}`, { role });
      toast.success("Rol actualizado");
      setEditUser(null);
      fetchUsers();
    } catch {
      toast.error("Error actualizando usuario");
    }
    setSaving(false);
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    const ok = await createUser(email, password, fullName, newRole as UserRole);
    if (ok) {
      setCreateOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setNewRole("employee");
      fetchUsers();
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserTarget) return;

    const ok = await deleteUser(deleteUserTarget.id);
    if (ok) {
      fetchUsers();
      setDeleteUserTarget(null);
    }
  }

  const columns = [
    { header: "Nombre", accessor: (u: Profile) => u.full_name || "—" },
    {
      header: "Rol",
      accessor: (u: Profile) => (
        <Badge variant={u.role === "admin" ? "warning" : "default"}>
          {u.role === "admin" ? "Admin" : "Empleado"}
        </Badge>
      ),
    },
    {
      header: "Creado",
      accessor: (u: Profile) =>
        new Date(u.created_at).toLocaleDateString("es-AR"),
    },
    {
      header: "Acciones",
      accessor: (u: Profile) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => openEdit(u)}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Cambiar rol
          </button>
          <button
            onClick={() => setDeleteUserTarget(u)}
            className="text-xs text-red-400 hover:text-red-300"
            disabled={userActionLoading}
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-surface-50">
          Usuarios
        </h1>
        <Button onClick={() => setCreateOpen(true)}>Crear usuario</Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          loading={loading}
        />
      </Card>

      {/* Edit role modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Editar rol — ${editUser?.full_name}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Rol"
            options={[
              { value: "admin", label: "Administrador" },
              { value: "employee", label: "Empleado" },
            ]}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create user modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear nuevo usuario"
        size="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Nombre completo *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña *"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Select
            label="Rol *"
            options={[
              { value: "admin", label: "Administrador" },
              { value: "employee", label: "Empleado" },
            ]}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            required
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={userActionLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={userActionLoading}>
              Crear usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete user confirmation modal */}
      <Modal
        open={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        title="Confirmar eliminacion"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            Esta accion es permanente y no se puede deshacer.
          </div>

          <p className="text-sm text-surface-200">
            ¿Seguro que quieres eliminar al usuario
            <span className="font-semibold text-surface-50">
              {` ${deleteUserTarget?.full_name || "sin nombre"}`}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteUserTarget(null)}
              disabled={userActionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteUser}
              loading={userActionLoading}
              className="bg-red-600 hover:bg-red-500"
            >
              Eliminar usuario
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
