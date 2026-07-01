"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, textareaClass } from "@/app/components/ui";
import { EVIDENCE_TYPE_LABELS, EVIDENCE_TYPES } from "@/lib/health-vault/labels";
import { useVault } from "@/lib/health-vault/useVault";

export default function NewEvidencePage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;
  const { getRecord, getPeople, createEvidence } = useVault();

  const record = getRecord(recordId);
  const people = getPeople();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    type: "email" as const,
    title: "",
    date: today,
    content: "",
    source: "",
    personId: "",
  });

  if (!record) return <PageHeader title="No encontrado" backHref="/records" />;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    createEvidence({
      recordId,
      type: form.type,
      title: form.title,
      date: form.date,
      content: form.content,
      source: form.source,
      personId: form.personId || undefined,
    });
    router.push(`/records/${recordId}`);
  }

  return (
    <>
      <PageHeader title="Agregar evidencia" subtitle={record.title} backHref={`/records/${recordId}`} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tipo de evidencia">
          <select value={form.type} onChange={(e) => update("type", e.target.value as typeof form.type)} className={inputClass}>
            {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</option>)}
          </select>
        </Field>
        <Field label="Título *">
          <input required value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} placeholder="Ej: Correo del 15 de marzo" />
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Fuente / autor">
          <input value={form.source} onChange={(e) => update("source", e.target.value)} className={inputClass} placeholder="correo@empresa.com o nombre" />
        </Field>
        <Field label="Contenido *">
          <textarea required value={form.content} onChange={(e) => update("content", e.target.value)} className={textareaClass} placeholder="Pega aquí el correo, mensaje o declaración completa..." />
        </Field>
        {people.length > 0 && (
          <Field label="Persona relacionada (opcional)">
            <select value={form.personId} onChange={(e) => update("personId", e.target.value)} className={inputClass}>
              <option value="">Ninguna</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Button type="submit" fullWidth>Guardar evidencia</Button>
      </form>
    </>
  );
}
