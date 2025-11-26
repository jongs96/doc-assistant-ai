export const ActionPriority = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type ActionPriority =
  (typeof ActionPriority)[keyof typeof ActionPriority];

export interface ActionItem {
  description: string;
  deadline: string | null;
  amount: string | null;
  priority: ActionPriority;
  recipient: string | null; // Where to pay or submit
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface DocumentAnalysis {
  summary: string; // Simple plain language summary
  documentType: string; // e.g., "Tax Notice", "Legal Notice"
  actions: ActionItem[];
  keyTerms: KeyTerm[];
  sentiment: "URGENT" | "NEUTRAL" | "GOOD_NEWS";
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  isThinking?: boolean;
}

export const AppStatus = {
  IDLE: "IDLE",
  ANALYZING: "ANALYZING",
  RESULTS: "RESULTS",
  ERROR: "ERROR",
} as const;

export type AppStatus = (typeof AppStatus)[keyof typeof AppStatus];
