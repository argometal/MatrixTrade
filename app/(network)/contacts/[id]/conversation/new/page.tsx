"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, textareaClass } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

export default function NewConversationPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const { ready, getContact, createConversation } = useVault();

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    context: "",
    notes: "",
    interests: "",
    problems: "",
    opportunities: "",
    promises: "",
    nextStep: "",
    followUpDate: "",
  });

  if (!ready) {
    return <p className="text-center text-zinc-500">Loading...</p>;
  }

  const contact = getContact(contactId);
  if (!contact) {
    return <PageHeader title="Not found" backHref="/contacts" />;
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createConversation({
      contactId,
      ...form,
    });
    router.push(`/contacts/${contactId}`);
  }

  return (
    <>
      <PageHeader
        title="Add Conversation"
        subtitle={contact.name}
        backHref={`/contacts/${contactId}`}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Location / context">
          <input
            value={form.context}
            onChange={(e) => update("context", e.target.value)}
            className={inputClass}
            placeholder="Coffee, Zoom, conference..."
          />
        </Field>

        <Field label="Conversation notes">
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={textareaClass}
            placeholder="What did you talk about?"
          />
        </Field>

        <Field label="What they care about">
          <textarea
            value={form.interests}
            onChange={(e) => update("interests", e.target.value)}
            className={textareaClass}
          />
        </Field>

        <Field label="Problems mentioned">
          <textarea
            value={form.problems}
            onChange={(e) => update("problems", e.target.value)}
            className={textareaClass}
          />
        </Field>

        <Field label="Opportunities detected">
          <textarea
            value={form.opportunities}
            onChange={(e) => update("opportunities", e.target.value)}
            className={textareaClass}
          />
        </Field>

        <Field label="What I promised">
          <textarea
            value={form.promises}
            onChange={(e) => update("promises", e.target.value)}
            className={textareaClass}
          />
        </Field>

        <Field label="Next step">
          <input
            value={form.nextStep}
            onChange={(e) => update("nextStep", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Next follow-up date">
          <input
            type="date"
            value={form.followUpDate}
            onChange={(e) => update("followUpDate", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Button type="submit" fullWidth>
          Save Conversation
        </Button>
      </form>
    </>
  );
}
