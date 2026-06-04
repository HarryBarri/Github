"use client";

import { useState } from "react";
import { localDb } from "@/lib/local-db";
import { FormField, Input, Button } from "@/components/shared/FormField";

const SETTINGS_META: Record<string, { label: string; description: string; type?: string }> = {
  cooperative_name: { label: "Cooperative Name", description: "Full legal name of the cooperative" },
  cooperative_rc_number: { label: "RC Number", description: "CAC Registration Number" },
  share_value_kobo: { label: "Share Value (kobo)", description: "Value of one share unit in kobo (e.g. 10000 = ₦100)", type: "number" },
  financial_year_start: { label: "Financial Year Start", description: "Format: MM-DD (e.g. 01-01 for January)" },
  max_loan_multiplier: { label: "Max Loan Multiplier", description: "Maximum loan as multiple of member savings", type: "number" },
  membership_fee_kobo: { label: "Membership Fee (kobo)", description: "One-time membership fee in kobo", type: "number" },
};

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function save() {
    setSaving(true); setMessage("");
    try {
      localDb.settings.setMany(form);
      setMessage("Settings saved successfully.");
    } catch {
      setMessage("Failed to save settings.");
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {Object.entries(SETTINGS_META).map(([key, meta]) => (
        <FormField key={key} label={meta.label}>
          <Input
            type={meta.type ?? "text"}
            value={form[key] ?? ""}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">{meta.description}</p>
        </FormField>
      ))}

      {message && <p className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>{message}</p>}

      <div className="flex gap-3 pt-2">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
      </div>
    </div>
  );
}
