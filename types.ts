
export interface DictionaryEntry {
  word: string;
  pronunciation?: string;
  partOfSpeech: string;
  nounClass?: string;
  translation: string;
  definition: string;
  examples: {
    luganda: string;
    english: string;
  }[];
  synonyms: string[];
}

export interface Phrase {
  category: string;
  luganda: string;
  english: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface TestResult {
  id: string;
  date: string;
  score: number;
  total: number;
  type: string;
}

export type View = 'home' | 'search' | 'phrasebook' | 'favorites' | 'quiz' | 'tests' | 'phonetics';
