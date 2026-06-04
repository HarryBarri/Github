"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField, Input, Select, Textarea, Button } from "@/components/shared/FormField";

export default function NewMeetingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", meetingType: "general", scheduledDate: "", venue: "", agenda: "", quorumRequired: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, quorumRequired: form.quorumRequired ? parseInt(form.quorumRequired) : undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      router.push("/dashboard/meetings");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Schedule Meeting" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <FormField label="Meeting Title" required>
          <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="2025 Annual General Meeting" />
        </FormField>
        <FormField label="Meeting Type" required>
          <Select value={form.meetingType} onChange={e => setForm(f => ({...f, meetingType: e.target.value}))}>
            <option value="general">General Meeting</option>
            <option value="agm">AGM</option>
            <option value="egm">EGM</option>
            <option value="board">Board Meeting</option>
            <option value="committee">Committee Meeting</option>
          </Select>
        </FormField>
        <FormField label="Date & Time" required>
          <Input type="datetime-local" value={form.scheduledDate} onChange={e => setForm(f => ({...f, scheduledDate: e.target.value}))} />
        </FormField>
        <FormField label="Venue" required>
          <Input value={form.venue} onChange={e => setForm(f => ({...f, venue: e.target.value}))} placeholder="Cooperative Hall, Lagos" />
        </FormField>
        <FormField label="Agenda">
          <Textarea value={form.agenda} onChange={e => setForm(f => ({...f, agenda: e.target.value}))} rows={4} placeholder="1. Opening prayer&#10;2. Minutes of last meeting&#10;3. Financial report" />
        </FormField>
        <FormField label="Quorum Required">
          <Input type="number" value={form.quorumRequired} onChange={e => setForm(f => ({...f, quorumRequired: e.target.value}))} placeholder="Minimum attendance required" />
        </FormField>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !form.title || !form.scheduledDate || !form.venue}>{loading ? "Saving…" : "Schedule Meeting"}</Button>
        </div>
      </div>
    </div>
  );
}
