"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, inputClass, PageHeader, textareaClass } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

const CATEGORIES = ["Investor", "Partner", "Customer", "Mentor", "Peer", "Other"];
const STATUSES = ["Active", "Warm", "Cold", "Dormant"];

type FormData = {
  name: string;
  company: string;
  role: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  category: string;
  status: string;
  whereMet: string;
  dateMet: string;
  notes: string;
};

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { ready, getContact, updateContact } = useVault();
  const [form, setForm] = useState<FormData | null>(null);

  useEffect(() => {
    if (!ready) return;
    const contact = getContact(id);
    if (contact) {
      setForm({
        name: contact.name,
        company: contact.company,
        role: contact.role,
        location: contact.location,
        phone: contact.phone,
        email: contact.email,
        linkedin: contact.linkedin,
        category: contact.category,
        status: contact.status,
        whereMet: contact.whereMet,
        dateMet: contact.dateMet,
        notes: contact.notes,
      });
    }
  }, [ready, id, getContact]);

  if (!ready || !form) {
    return <p className="text-center text-zinc-500">Loading...</p>;
  }

  const contact = getContact(id);
  if (!contact) {
    return <PageHeader title="Not found" backHref="/contacts" />;
  }

  function update(field: string, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form?.name.trim()) return;
    updateContact(id, form);
    router.push(`/contacts/${id}`);
  }

  return (
    <>
      <PageHeader title="Edit Contact" backHref={`/contacts/${id}`} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name *">
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Company">
          <input value={form.company} onChange={(e) => update("company", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Role">
          <input value={form.role} onChange={(e) => update("role", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Location">
          <input value={form.location} onChange={(e) => update("location", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Phone">
          <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </Field>

        <Field label="LinkedIn">
          <input value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Category">
          <select value={form.category} onChange={(e) => update("category", e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Where we met">
          <input value={form.whereMet} onChange={(e) => update("whereMet", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Date we met">
          <input type="date" value={form.dateMet} onChange={(e) => update("dateMet", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className={textareaClass} />
        </Field>

        <Button type="submit" fullWidth>
          Save Changes
        </Button>
      </form>
    </>
  );
}
