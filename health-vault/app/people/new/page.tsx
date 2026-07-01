"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, textareaClass } from "@/app/components/ui";
import { RELATIONSHIPS } from "@/lib/health-vault/labels";
import { useVault } from "@/lib/health-vault/useVault";

export default function NewPersonPage() {
  const router = useRouter();
  const { createPerson } = useVault();
  const [form, setForm] = useState({
    name: "", role: "", department: "", relationship: "Compañero",
    email: "", phone: "", notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const person = createPerson(form);
    router.push(`/people/${person.id}`);
  }

  return (
    <>
      <PageHeader title="Nueva persona" backHref="/people" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre *">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Rol / puesto">
          <input value={form.role} onChange={(e) => update("role", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Departamento">
          <input value={form.department} onChange={(e) => update("department", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Relación contigo">
          <select value={form.relationship} onChange={(e) => update("relationship", e.target.value)} className={inputClass}>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Correo">
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Notas">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className={textareaClass} />
        </Field>
        <Button type="submit" fullWidth>Guardar persona</Button>
      </form>
    </>
  );
}
