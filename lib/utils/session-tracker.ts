import { inferTopic } from "./topic-inference";

export interface ConceptEntry {
  stuckCount: number;
  lastMistakeType: string;
  topicName: string;
}

export interface SessionTracker {
  totalTurns: number;
  conceptMap: Record<string, ConceptEntry>;
  currentConcept: string;
  topicsAttempted: string[];
  recentCorrect: boolean;
}

const PRAISE_WORDS = ["correct", "exactly", "great", "well done", "right", "good", "perfect", "yes", "nicely", "spot on", "that's it"];

export function createSessionTracker(): SessionTracker {
  return {
    totalTurns: 0,
    conceptMap: {},
    currentConcept: "general",
    topicsAttempted: [],
    recentCorrect: false
  };
}

export function updateSession(tracker: SessionTracker, userText: string, assistantText: string): void {
  tracker.totalTurns += 1;

  const topic = inferTopic(userText);
  tracker.currentConcept = topic;

  if (!tracker.topicsAttempted.includes(topic)) {
    tracker.topicsAttempted.push(topic);
  }

  if (!tracker.conceptMap[topic]) {
    tracker.conceptMap[topic] = {
      stuckCount: 0,
      lastMistakeType: "",
      topicName: topic
    };
  }

  const entry = tracker.conceptMap[topic];
  const assistantLower = assistantText.toLowerCase();
  const praised = PRAISE_WORDS.some((word) => assistantLower.includes(word));

  if (praised) {
    entry.stuckCount = 0;
    tracker.recentCorrect = true;
  } else {
    entry.stuckCount += 1;
    tracker.recentCorrect = false;
  }
}
