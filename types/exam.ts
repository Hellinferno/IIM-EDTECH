export type ExamType = "CAT" | "GMAT" | "NEET" | "UPSC" | "JEE";

export interface ExamConfig {
  label: string;
  subjects: string[];
  style: string;
  difficulty: string;
}

export const EXAM_CONFIG: Record<ExamType, ExamConfig> = {
  CAT: {
    label: "CAT — MBA Entrance",
    subjects: ["Quantitative Aptitude", "Verbal Ability", "DILR"],
    style: "analytical and time-pressure focused",
    difficulty: "focus on elimination strategies and speed"
  },
  GMAT: {
    label: "GMAT — Business School",
    subjects: ["Problem Solving", "Data Sufficiency", "Critical Reasoning", "Reading Comprehension"],
    style: "logical and structured",
    difficulty: "focus on reasoning patterns, not just calculation"
  },
  NEET: {
    label: "NEET — Medical Entrance",
    subjects: ["Physics", "Chemistry", "Biology"],
    style: "concept-heavy, memory + application balance",
    difficulty: "NCERT-first, then exception handling"
  },
  UPSC: {
    label: "UPSC — Civil Services",
    subjects: ["General Studies", "Current Affairs", "Essay", "Optional Subject"],
    style: "analytical, multi-dimensional thinking",
    difficulty: "connect concepts across domains, not just recall"
  },
  JEE: {
    label: "JEE — Engineering Entrance",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    style: "deep reasoning and derivation-level understanding",
    difficulty: "never accept formula without proof"
  }
};

export const AGENT_OPENERS: Record<ExamType, string> = {
  CAT: "Alright, CAT is all about speed and accuracy under pressure. What are we working on today — Quant, DILR, or Verbal?",
  GMAT: "GMAT tests how you think, not just what you know. Tell me what you're finding difficult and we'll work through the reasoning together.",
  NEET: "NEET is won by whoever knows their NCERT the deepest. What chapter are you on — shall we test your concepts or work through problems?",
  UPSC: "UPSC rewards the student who can see every issue from multiple angles. What topic do you want to explore today?",
  JEE: "JEE doesn't reward memorization — it rewards understanding. What are you working on? Show me your attempt first."
};
