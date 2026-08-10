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
  "contact him",
  "contact ernst",
  "contact the",
  "reach you",
  "reach him",
  "reach ernst",
  "email you",
  "email him",
  "email ernst",
  "get in touch",
  "how's the best way to contact",
  "best way to contact",
  "want to contact",
  "would like to contact",
  "like to contact",
  "leave my contact",
  "leave my email",
  "leave my details",
  "share my email",
  "share my contact",
];

/** Visitor explicitly asks for an on-site contact form. */
const FORM_REQUEST = [
  "fill out a form",
  "fill out form",
  "fill a form",
  "fill the form",
  "fill in a form",
  "fill in the form",
  "contact form",
  "a form i can",
  "form i can fill",
  "form to fill",
  "form to leave",
  "leave a form",
  "submit a form",
  "use a form",
  "is there a form",
  "is there any form",
  "any form",
  "got a form",
  "have a form",
  "online form",
  "web form",
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
  return (
    STRONG_INTENT.some((k) => lower.includes(k.trim())) ||
    hasFormRequestIntent(message)
  );
}

export function hasFormRequestIntent(message: string): boolean {
  const lower = message.toLowerCase();
  // Catch typos like "gill out" ≈ "fill out" near "form"
  if (/\b(fill|gill|ful|fiil)\b/.test(lower) && lower.includes("form")) {
    return true;
  }
  return FORM_REQUEST.some((k) => lower.includes(k));
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

/** Visitor wants to leave the AI and speak with the real Ernst. */
const HANDOFF_INTENT = [
  "talk to ernst",
  "speak to ernst",
  "chat with ernst",
  "talk with ernst",
  "real ernst",
  "actual ernst",
  "human ernst",
  "live ernst",
  "talk to a human",
  "speak to a human",
  "talk to the real",
  "speak to the real",
  "talk to someone real",
  "real person",
  "actual person",
  "live person",
  "live chat",
  "human please",
  "connect me to ernst",
  "can i talk to you directly",
  "can i speak to you directly",
  "transfer me",
  "hand me off",
  "handoff",
  "hand off",
];

export function hasHandoffIntent(message: string): boolean {
  const lower = message.toLowerCase().replace(/[’']/g, "'");
  return HANDOFF_INTENT.some((k) => lower.includes(k));
}
