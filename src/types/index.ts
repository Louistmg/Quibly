export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  color: 'red' | 'blue' | 'yellow' | 'green';
}

export interface Question {
  id: string;
  text: string;
  answers: Answer[];
  timeLimit: number;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: Date;
  code: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  answers: {
    questionId: string;
    answerId: string;
    timeRemaining: number;
    isCorrect: boolean;
  }[];
}

export interface GameSession {
  id: string;
  quizId: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  currentQuestionIndex: number;
  hostId: string;
}

export type GamePhase = 'home' | 'create' | 'join' | 'lobby' | 'play' | 'results';
