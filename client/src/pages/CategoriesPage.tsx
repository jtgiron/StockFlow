import { useState, type FormEvent } from "react";
import { useCategories } from "../hooks/useCategories";
import { useAuth } from "../contexts/AuthContext";
import Card, { CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";

export default function CategoriesPage() {
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const { isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditId(null);
    setName("");
    setDescription("");
    setModalOpen(true);
  }

  function openEdit(cat: {
    id: number;
    name: string;
    description: string | null;
  }) {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description ?? "");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = editId
      ? await updateCategory(editId, name, description)
      : await createCategory(name, description);
    setSubmitting(false);
    if (ok) setModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Categorías"
          description={`${categories.length} categorías`}
          action={
            isAdmin && (
              <Button onClick={openCreate}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Nueva categoría
              </Button>
            )
          }
        />

        {loading ? (
          <div className="text-center py-8 text-surface-400">Cargando...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-surface-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 bg-surface-900/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">
                    Descripción
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 3 : 2}
                      className="px-4 py-8 text-center text-surface-500"
                    >
                      Sin categorías
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-b border-surface-800/60 hover:bg-surface-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-surface-100 font-medium">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 text-surface-400">
                        {cat.description || "—"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(cat)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCategory(cat.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar categoría" : "Nueva categoría"}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editId ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
