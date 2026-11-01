export type Evidence = {
  correct: boolean;
  at: number;
  eligible: boolean;
  delayed: boolean;
};
export function readiness(evidence: Evidence[], now = Date.now()) {
  const items = evidence
    .filter((e) => e.eligible && e.at <= now && e.at >= now - 30 * 86400000)
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);
  if (items.length < 5)
    return { label: "Building evidence", accuracy: null, count: items.length };
  const accuracy = items.filter((e) => e.correct).length / items.length;
  const days = new Set(
    items.map((e) => new Date(e.at).toISOString().slice(0, 10)),
  ).size;
  const label =
    now - items[0].at > 14 * 86400000
      ? "Review due"
      : items.length >= 8 &&
          days >= 2 &&
          accuracy >= 0.75 &&
          items.filter((e) => e.correct && e.delayed).length >= 2
        ? "Secure"
        : "Developing";
  return { label, accuracy, count: items.length };
}
export function nextReview(correct: boolean, step: number, now = Date.now()) {
  const next = correct ? Math.min(step + 1, 3) : 0;
  return { step: next, dueAt: now + [1, 3, 7, 14][next] * 86400000 };
}
export function score(answers: (boolean | null)[]) {
  return answers.reduce<number>((s, a) => s + (a === null ? 0 : a ? 4 : -1), 0);
}
export function safeQuestion(q: import("./types").Question) {
  return {
    id: q.id,
    family: q.family,
    topic: q.topic,
    skill: q.skill,
    stem: q.stem,
    options: q.options,
    ...(q.conceptId ? { conceptId: q.conceptId } : {}),
    ...(q.questionType ? { questionType: q.questionType } : {}),
    ...(q.formula ? { formula: q.formula } : {}),
  };
}
