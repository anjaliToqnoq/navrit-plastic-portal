import { z } from "zod";

/** People who can receive/pay on behalf of the company — same set as Accounts. */
export const ACCOUNT_PERSONS = ["Rahul", "Devesh", "Nitin"] as const;

export type AccountPerson = (typeof ACCOUNT_PERSONS)[number];

export const accountPersonSchema = z.enum(ACCOUNT_PERSONS);

/** Optional on forms; when set must be a known account person. */
export const optionalAccountPersonSchema = accountPersonSchema.optional();

export function isAccountPerson(value: string): value is AccountPerson {
  return (ACCOUNT_PERSONS as readonly string[]).includes(value);
}
