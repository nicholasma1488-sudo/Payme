export function cleanLegalName(value: string, label: string): string {
  const clean = (value || "").trim().replace(/\s+/g, " ");
  if (clean.length < 1 || clean.length > 40) {
    throw new Error(`${label} 用 1–40 个字`);
  }
  if (!/^[\p{L}\p{M}'’.·\- ]+$/u.test(clean)) {
    throw new Error(`${label} 只能是字母或汉字`);
  }
  return clean;
}

export function formatLegalName(person: {
  firstName?: string | null;
  lastName?: string | null;
}): string | null {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

export function hasLegalName(person: {
  firstName?: string | null;
  lastName?: string | null;
}): boolean {
  return Boolean(person.firstName?.trim() && person.lastName?.trim());
}

export const CASH_ONLY_NOTE = "兑换只收当面现金，不接受任何线上转账。";
export const CASH_MEETUP_PROMPT = "这次兑换只收当面现金。你希望在哪里见面交现金？";
