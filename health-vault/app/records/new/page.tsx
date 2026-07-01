"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, textareaClass } from "@/app/components/ui";
import type { BehaviorKind, RecordStatus, RecordType } from "@/lib/health-vault/types";
import { BEHAVIOR_KINDS, RECORD_STATUSES, RECORD_TYPE_LABELS, RECORD_TYPES } from "@/lib/health-vault/labels";
import { useVault } from "@/lib/health-vault/useVault";

export default function NewRecordPage() {
  const router = useRouter();
  const { createRecord, getPeople } = useVault();
  const people = getPeople();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    type: "queja" as RecordType,
    title: "",
    date: today,
    description: "",
    personIds: [] as string[],
    status: "abierto" as RecordStatus,
    behaviorKind: undefined as BehaviorKind | undefined,
    tags: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePerson(id: string) {
    setForm((prev) => ({
      ...prev,
      personIds: prev.personIds.includes(id) ? prev.personIds.filter((p) => p !== id) : [...prev.personIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const record = createRecord({
      type: form.type,
      title: form.title,
      date: form.date,
      description: form.description,
      personIds: form.personIds,
      status: form.status,
      behaviorKind: form.type === "comportamiento" ? form.behaviorKind : undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    router.push(`/records/${record.id}`);
  }

  return (
    <>
      <PageHeader title="Nuevo registro" backHref="/records" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tipo">
          <select value={form.type} onChange={(e) => update("type", e.target.value as typeof form.type)} className={inputClass}>
            {RECORD_TYPES.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>)}
          </select>
        </Field>
        {form.type === "comportamiento" && (
          <Field label="Comportamiento">
            <select value={form.behaviorKind ?? ""} onChange={(e) => update("behaviorKind", e.target.value as BehaviorKind)} className={inputClass} required>
              <option value="">Seleccionar...</option>
              {BEHAVIOR_KINDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        )}
        <Field label="Título *">
          <input required value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Descripción">
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className={textareaClass} placeholder="Qué pasó, cuándo, contexto..." />
        </Field>
        <Field label="Estado">
          <select value={form.status} onChange={(e) => update("status", e.target.value as typeof form.status)} className={inputClass}>
            {RECORD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Etiquetas (separadas por coma)">
          <input value={form.tags} onChange={(e) => update("tags", e.target.value)} className={inputClass} placeholder="rh, horas-extra" />
        </Field>
        {people.length > 0 && (
          <Field label="Personas involucradas">
            <div className="space-y-2">
              {people.map((p) => (
                <label key={p.id} className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3">
                  <input type="checkbox" checked={form.personIds.includes(p.id)} onChange={() => togglePerson(p.id)} className="h-4 w-4" />
                  <span className="text-sm">{p.name} · {p.relationship}</span>
                </label>
              ))}
            </div>
          </Field>
        )}
        <Button type="submit" fullWidth>Guardar registro</Button>
      </form>
    </>
  );
}
