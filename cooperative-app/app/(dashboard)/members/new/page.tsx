"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField, Input, Select, Button } from "@/components/shared/FormField";
import { NIGERIAN_STATES } from "@/lib/utils";
import { localDb } from "@/lib/local-db";

export default function NewMemberPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", middleName: "", email: "", phone: "",
    dateOfBirth: "", gender: "", occupation: "", employer: "",
    bvn: "", nin: "",
    addressStreet: "", addressCity: "", addressState: "", addressLga: "",
    nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelationship: "",
  });

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.firstName || !form.lastName || !form.phone) {
      setError("First name, last name and phone are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const member = localDb.members.createMember({
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || undefined,
        email: form.email || undefined,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        occupation: form.occupation || undefined,
        employer: form.employer || undefined,
        bvn: form.bvn || undefined,
        nin: form.nin || undefined,
        addressStreet: form.addressStreet || undefined,
        addressCity: form.addressCity || undefined,
        addressState: form.addressState || undefined,
        addressLga: form.addressLga || undefined,
        nextOfKinName: form.nextOfKinName || undefined,
        nextOfKinPhone: form.nextOfKinPhone || undefined,
        nextOfKinRelationship: form.nextOfKinRelationship || undefined,
        deletedAt: null,
      });
      router.push(`/dashboard/members/${member.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Add New Member" description="Step-by-step member onboarding" />

      <div className="flex gap-2 mb-8">
        {["Personal Info", "Address", "Next of Kin"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition
              ${step > i + 1 ? "bg-green-600 text-white" : step === i + 1 ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? "font-semibold text-gray-800" : "text-gray-400"}`}>{s}</span>
            {i < 2 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input value={form.firstName} onChange={e => update("firstName", e.target.value)} placeholder="John" />
              </FormField>
              <FormField label="Last Name" required>
                <Input value={form.lastName} onChange={e => update("lastName", e.target.value)} placeholder="Doe" />
              </FormField>
            </div>
            <FormField label="Middle Name">
              <Input value={form.middleName} onChange={e => update("middleName", e.target.value)} placeholder="Optional" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="john@example.com" />
              </FormField>
              <FormField label="Phone Number" required>
                <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="08012345678" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date of Birth">
                <Input type="date" value={form.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} />
              </FormField>
              <FormField label="Gender">
                <Select value={form.gender} onChange={e => update("gender", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Occupation">
                <Input value={form.occupation} onChange={e => update("occupation", e.target.value)} placeholder="Civil Servant" />
              </FormField>
              <FormField label="Employer">
                <Input value={form.employer} onChange={e => update("employer", e.target.value)} placeholder="NNPC Ltd" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="BVN (11 digits)">
                <Input value={form.bvn} onChange={e => update("bvn", e.target.value)} maxLength={11} placeholder="22234567890" />
              </FormField>
              <FormField label="NIN (11 digits)">
                <Input value={form.nin} onChange={e => update("nin", e.target.value)} maxLength={11} placeholder="12345678901" />
              </FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <FormField label="Street Address">
              <Input value={form.addressStreet} onChange={e => update("addressStreet", e.target.value)} placeholder="12 Adeola Odeku Street" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City">
                <Input value={form.addressCity} onChange={e => update("addressCity", e.target.value)} placeholder="Lagos" />
              </FormField>
              <FormField label="State">
                <Select value={form.addressState} onChange={e => update("addressState", e.target.value)}>
                  <option value="">Select State…</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Local Government Area (LGA)">
              <Input value={form.addressLga} onChange={e => update("addressLga", e.target.value)} placeholder="Victoria Island" />
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <FormField label="Next of Kin Name">
              <Input value={form.nextOfKinName} onChange={e => update("nextOfKinName", e.target.value)} placeholder="Jane Doe" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Next of Kin Phone">
                <Input value={form.nextOfKinPhone} onChange={e => update("nextOfKinPhone", e.target.value)} placeholder="08098765432" />
              </FormField>
              <FormField label="Relationship">
                <Select value={form.nextOfKinRelationship} onChange={e => update("nextOfKinRelationship", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
            ← Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.firstName}>
              Next →
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading}>
              {loading ? "Saving…" : "Create Member"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
