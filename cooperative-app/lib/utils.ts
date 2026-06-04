import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNGN(kobo: bigint | number): string {
  const naira = Number(kobo) / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(naira);
}

export function koboToNaira(kobo: bigint | number): number {
  return Number(kobo) / 100;
}

export function nairaToKobo(naira: number): bigint {
  return BigInt(Math.round(naira * 100));
}

export async function generateMemberNumber(
  year?: number,
  sequenceCount?: number
): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const seq = sequenceCount ?? 1;
  return `COOP-${y}-${String(seq).padStart(4, "0")}`;
}

export function generateApplicationNumber(
  prefix: string,
  sequenceCount: number
): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(sequenceCount).padStart(5, "0")}`;
}

export function generateAccountNumber(sequenceCount: number): string {
  return `SAV-${String(sequenceCount).padStart(8, "0")}`;
}

export function generateReferenceNumber(prefix = "TXN"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];
