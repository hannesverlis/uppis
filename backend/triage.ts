import type { TriageAnswers } from "./types";

const KEYS = [
  "hitHead",
  "severePainOrCantMove",
  "bleeding",
  "breathingOrChestPain",
  "onFloorOverHour",
] as const;

export const CLEAR_TRIAGE: TriageAnswers = {
  hitHead: false,
  severePainOrCantMove: false,
  bleeding: false,
  breathingOrChestPain: false,
  onFloorOverHour: false,
};

export function emptyTriage(): TriageAnswers {
  return {
    hitHead: null,
    severePainOrCantMove: null,
    bleeding: null,
    breathingOrChestPain: null,
    onFloorOverHour: null,
  };
}

export function parseTriage(input: unknown): TriageAnswers {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const answers = emptyTriage();
  for (const key of KEYS) {
    const value = source[key];
    answers[key] = value === true ? true : value === false ? false : null;
  }
  return answers;
}

/** Unanswered (null) is treated as yes: when in doubt, send the person to 112. */
export function needsEmergency(answers: TriageAnswers): boolean {
  return KEYS.some((key) => answers[key] !== false);
}
