export type Topic = {
  id: string;
  name: string;
  unit: string;
  icon: string;
  description: string;
};
export type Question = {
  id: string;
  family: string;
  topic: string;
  skill: string;
  stem: string;
  options: string[];
  answer: number;
  hints: string[];
  solution: string;
  error: string;
  formula?: string;
  conceptId?: string;
  questionType?: string;
  misconceptions?: Partial<Record<string, string>>;
};
export type PublicQuestion = Omit<
  Question,
  "answer" | "hints" | "solution" | "error" | "misconceptions"
>;
export type LocalAnswer = {
  id: string;
  questionId: string;
  selected: number;
  correct: boolean;
  hinted: boolean;
  at: number;
  errorReason?: string;
};
export type LocalMission = {
  id: string;
  topic: string;
  questionIds: string[];
  answers: LocalAnswer[];
  finished: boolean;
  startedAt: number;
};
