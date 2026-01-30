export type AnswerColor = 'red' | 'blue' | 'yellow' | 'green';

export type Answer = {
  id: string;
  text: string;
  color: AnswerColor;
  isCorrect?: boolean;
};

export type Question = {
  id: string;
  text: string;
  answers: Answer[];
  timeLimit: number;
  points: number;
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: Date;
  code: string;
};

export type PlayerAnswer = {
  questionId: string;
  answerId: string | null;
  timeRemaining: number;
  isCorrect: boolean;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  answers: PlayerAnswer[];
  isHost: boolean;
  userId: string;
};

export type GameSession = {
  id: string;
  quizId: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  phase: 'question' | 'results' | 'scoreboard';
  players: Player[];
  currentQuestionIndex: number;
  hostId: string;
  questionStartedAt?: Date | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  updatedAt?: Date | null;
};

export type GamePhase = 'home' | 'create' | 'join' | 'lobby' | 'play' | 'results';
