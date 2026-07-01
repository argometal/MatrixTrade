"use client";

import Link from "next/link";
import { Card, formatDate, isOverdue } from "./ui";
import type { Contact } from "@/lib/network-vault/types";

export function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="transition active:scale-[0.99] hover:border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-zinc-50">{contact.name}</h3>
            <p className="truncate text-sm text-zinc-400">
              {contact.role}
              {contact.company ? ` · ${contact.company}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {contact.category && (
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                  {contact.category}
                </span>
              )}
              {contact.status && (
                <span className="rounded-full bg-emerald-600/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  {contact.status}
                </span>
              )}
            </div>
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}

export function ConversationCard({
  contactName,
  date,
  context,
  notes,
  followUpDate,
  href,
}: {
  contactName: string;
  date: string;
  context: string;
  notes: string;
  followUpDate?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "transition active:scale-[0.99] hover:border-zinc-700" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-50">{contactName}</p>
          <p className="text-xs text-zinc-500">{formatDate(date)}</p>
          {context && <p className="mt-1 text-sm text-zinc-400">{context}</p>}
          {notes && (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{notes}</p>
          )}
        </div>
        {followUpDate && (
          <span
            className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
              isOverdue(followUpDate)
                ? "bg-red-600/20 text-red-400"
                : "bg-amber-600/20 text-amber-400"
            }`}
          >
            {formatDate(followUpDate)}
          </span>
        )}
      </div>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
