"use client";

import { ACCOUNT_PERSONS, type AccountPerson } from "@/lib/account-persons";

type Props = {
  value: string;
  onChange: (value: AccountPerson | "") => void;
  /** Unified label used across purchases, sales, expenses, labour, settlements. */
  label?: "Payment done by" | "Received by" | "Partner";
  className?: string;
  required?: boolean;
  id?: string;
};

/**
 * Shared person picker so every payment attribution syncs with Accounts.
 */
export function PersonSelect({
  value,
  onChange,
  label = "Payment done by",
  className = "ad-input",
  required = false,
  id,
}: Props) {
  return (
    <select
      id={id}
      className={className}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value as AccountPerson | "")}
      aria-label={label}
    >
      <option value="">{label}</option>
      {ACCOUNT_PERSONS.map((person) => (
        <option key={person} value={person}>
          {person}
        </option>
      ))}
    </select>
  );
}
