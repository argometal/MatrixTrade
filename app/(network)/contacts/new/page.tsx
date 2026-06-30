"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, textareaClass } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

const CATEGORIES = ["Investor", "Partner", "Customer", "Mentor", "Peer", "Other"];
const STATUSES = ["Active", "Warm", "Cold", "Dormant"];

export default function NewContactPage() {
  const router = useRouter();
  const { createContact } = useVault();
  const [form, setForm] = useState({
    name: "",
    company: "",
    role: "",
    location: "",
    phone: "",
    email: "",
    linkedin: "",
    category: "Peer",
    status: "Active",
    whereMet: "",
    dateMet: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const contact = createContact(form);
    router.push(`/contacts/${contact.id}`);
  }

  return (
    <>
      <PageHeader title="Add Contact" backHref="/contacts" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name *">
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="Full name"
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
          <input value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} className={inputClass} placeholder="linkedin.com/in/..." />
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
          Save Contact
        </Button>
      </form>
    </>
  );
}
