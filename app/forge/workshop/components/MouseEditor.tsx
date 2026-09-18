"use client";

import type { MouseProfile, MouseStep } from "@/lib/workshop/mouse-types";
import {
  exportMouseProfilesFile,
  newMouseProfile,
  parseMouseProfilesJson,
  saveMouseProfiles,
} from "@/lib/workshop/mouse-store";
import { MOUSE_PROFILES_FILENAME } from "@/lib/workshop/mouse-types";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

export function MouseEditor({
  profiles,
  onChange,
  agentBase,
}: {
  profiles: MouseProfile[];
  onChange: (next: MouseProfile[]) => void;
  agentBase: string;
}) {
  function persist(next: MouseProfile[]) {
    onChange(next);
    saveMouseProfiles(next);
  }

  function addProfile() {
    const name = window.prompt("Profile name", "Default");
    if (!name?.trim()) return;
    persist([...profiles, newMouseProfile(name.trim())]);
  }

  function updateProfile(id: string, patch: Partial<MouseProfile>) {
    persist(
      profiles.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      )
    );
  }

  function removeProfile(id: string) {
    if (!window.confirm("Delete profile?")) return;
    persist(profiles.filter((p) => p.id !== id));
  }

  function addStep(profileId: string, step: MouseStep) {
    const p = profiles.find((x) => x.id === profileId);
    if (!p) return;
    updateProfile(profileId, { steps: [...p.steps, step] });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(exportMouseProfilesFile(profiles), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = MOUSE_PROFILES_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    file.text().then((text) => {
      const list = parseMouseProfilesJson(text);
      persist(list);
    });
  }

  async function runOnAgent(profileId: string) {
    try {
      const res = await fetch(`${agentBase.replace(/\/$/, "")}/api/run-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      alert("Profile started on agent.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Run failed — is Mouse Simulator agent running?");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addProfile}
          className="rounded-lg border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300"
        >
          + Profile
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
        >
          Export {MOUSE_PROFILES_FILENAME}
        </button>
        <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
          Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importJson(f);
            }}
          />
        </label>
      </div>
      <p className={`text-xs ${AF_TEXT.metadata}`}>
        Edit steps here; run via Mouse Simulator agent (default port 4011). Copy export file into agent folder.
      </p>
      <ul className="space-y-3">
        {profiles.length === 0 ? (
          <li className={`text-xs ${AF_TEXT.metadata}`}>No profiles yet.</li>
        ) : (
          profiles.map((p) => (
            <li key={p.id} className="rounded-xl border border-zinc-800 p-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={p.name}
                  onChange={(e) => updateProfile(p.id, { name: e.target.value })}
                  className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => runOnAgent(p.id)}
                  className="rounded-lg bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
                >
                  Run on agent
                </button>
                <button type="button" onClick={() => removeProfile(p.id)} className="text-xs text-rose-400">
                  Delete
                </button>
              </div>
              <textarea
                value={p.notes ?? ""}
                onChange={(e) => updateProfile(p.id, { notes: e.target.value })}
                rows={2}
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-400"
                placeholder="Notes"
              />
              <ol className="mt-2 space-y-1 text-[11px] text-zinc-400">
                {p.steps.map((s, i) => (
                  <li key={i} className="font-mono">
                    {JSON.stringify(s)}
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => addStep(p.id, { type: "delay", ms: 300 })}
                  className="rounded border border-zinc-800 px-2 py-0.5 text-[10px]"
                >
                  + delay
                </button>
                <button
                  type="button"
                  onClick={() => addStep(p.id, { type: "move", x: 0, y: 0 })}
                  className="rounded border border-zinc-800 px-2 py-0.5 text-[10px]"
                >
                  + move
                </button>
                <button
                  type="button"
                  onClick={() => addStep(p.id, { type: "click", button: "left" })}
                  className="rounded border border-zinc-800 px-2 py-0.5 text-[10px]"
                >
                  + click
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
