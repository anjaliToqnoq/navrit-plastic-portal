"use client";

import { FUNDING_SOURCES, type FundingSource } from "@/lib/funding";

type Props = {
  value: FundingSource | "";
  onChange: (value: FundingSource) => void;
  className?: string;
};

const LABELS: Record<FundingSource, string> = {
  COMPANY: "Paid from: Company cash",
  OWN_POCKET: "Paid from: Own pocket",
};

/** Company cash vs partner's own pocket — drives Accounts due-to-partner math. */
export function FundingSelect({ value, onChange, className = "ad-input" }: Props) {
  return (
    <select
      className={className}
      value={value || "COMPANY"}
      onChange={(e) => onChange(e.target.value as FundingSource)}
      aria-label="Paid from"
    >
      {FUNDING_SOURCES.map((source) => (
        <option key={source} value={source}>
          {LABELS[source]}
        </option>
      ))}
    </select>
  );
}
