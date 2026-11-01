import lessons from "./concepts.json";
import type { LocalAnswer, Question } from "./types";
export type ConceptLesson = (typeof lessons)[number];
export function getConcept(id?: string) {
  return id ? lessons.find((c) => c.id === id) : undefined;
}
export function possibleError(q: Question, selected: number) {
  return q.misconceptions?.[String(selected)] ?? q.error;
}
export type QuestionPattern = {
  id: string;
  conceptId?: string;
  title: string;
  answered: number;
  wrong: number;
  hinted: number;
  questionIds: string[];
  reasons: string[];
};
export function analyseAnswers(
  answers: LocalAnswer[],
  questions: Question[],
): QuestionPattern[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const groups = new Map<string, QuestionPattern>();
  for (const answer of answers) {
    if (seen.has(answer.questionId)) continue;
    seen.add(answer.questionId);
    const q = byId.get(answer.questionId);
    if (!q) continue;
    const title =
      q.questionType ?? getConcept(q.conceptId)?.title ?? "General practice";
    const id = `${q.conceptId ?? q.topic}:${title}`;
    const group = groups.get(id) ?? {
      id,
      conceptId: q.conceptId,
      title,
      answered: 0,
      wrong: 0,
      hinted: 0,
      questionIds: [],
      reasons: [],
    };
    group.answered++;
    if (answer.hinted) group.hinted++;
    if (!answer.correct) {
      group.wrong++;
      group.questionIds.push(answer.questionId);
      const reason = answer.errorReason ?? possibleError(q, answer.selected);
      if (reason && !group.reasons.includes(reason)) group.reasons.push(reason);
    }
    groups.set(id, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.wrong - a.wrong || a.title.localeCompare(b.title),
  );
}
export type SampleRankRow = {
  id: string;
  name: string;
  correct: number;
  score: number;
  rank: number;
  isYou: boolean;
};
export function sampleRanking(answers: LocalAnswer[]) {
  const firstAnswers = new Map<string, LocalAnswer>();
  for (const answer of answers)
    if (!firstAnswers.has(answer.questionId))
      firstAnswers.set(answer.questionId, answer);
  const unique = [...firstAnswers.values()];
  const total = unique.length;
  const peers = [
    ["sample-1", "Aster", 1],
    ["sample-2", "Orbit", 0.84],
    ["sample-3", "Nova", 0.84],
    ["sample-4", "Photon", 0.67],
    ["sample-5", "Vector", 0.5],
    ["sample-6", "Prism", 0.5],
    ["sample-7", "Comet", 0.34],
    ["sample-8", "Quark", 0.17],
  ] as const;
  const mine = unique.filter((a) => a.correct).length;
  const rows = [
    ...peers.map(([id, name, fraction]) => ({
      id,
      name,
      correct: Math.round(fraction * total),
      isYou: false,
    })),
    { id: "you", name: "You", correct: mine, isYou: true },
  ].map((row) => ({
    ...row,
    score: row.correct * 4 - (total - row.correct),
    rank: 0,
  }));
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  rows.forEach((row, index) => {
    row.rank =
      index > 0 && row.score === rows[index - 1].score
        ? rows[index - 1].rank
        : index + 1;
  });
  return { rows, total, rank: rows.find((r) => r.isYou)!.rank };
}
