"use client";
import { formatNGN } from "@/lib/utils";

export function AmountDisplay({
  kobo,
  className,
}: {
  kobo: bigint | number | string;
  className?: string;
}) {
  return (
    <span className={className}>{formatNGN(typeof kobo === "string" ? BigInt(kobo) : kobo)}</span>
  );
}
