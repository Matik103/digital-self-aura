/** Strong hiring / project intent — not vague words like "help" or "role". */
const STRONG_INTENT = [
  "hire you",
  "hire me",
  "looking to hire",
  "want to hire",
  "job offer",
  "open role",
  "job opening",
  "interview",
  "recruit",
  "recruiter",
  "talent acquisition",
  "human resources",
  " schedule a",
  "book a call",
  "book a meeting",
  "calendly",
  "set up a call",
  "work with you",
  "collaborate with you",
  "consulting for",
  "need a developer",
  "need an engineer",
  "build me",
  "build us",
  "for our company",
  "for my company",
  "budget",
  "proposal",
  "quote",
  "how much do you charge",
  "your rate",
  "contact you",
  "reach you",
  "email you",
  "get in touch",
  "how's the best way to contact",
];

const HR_STRONG = [
  "recruiter",
  "recruitment",
  "talent acquisition",
  "human resources",
  "hiring manager",
  "looking to hire",
  "open role",
  "job opening",
  "interview you",
  "schedule an interview",
];

export function hasStrongContactIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return STRONG_INTENT.some((k) => lower.includes(k.trim()));
}

export function hasStrongHrIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return HR_STRONG.some((k) => lower.includes(k));
}

/** Loose email capture from free text (progressive profiling). */
export function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}
