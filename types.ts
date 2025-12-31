
export type Role = 'student' | 'teacher' | null;

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  image?: {
    data: string; // base64
    type: string;
  };
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  questions: Question[];
  status: 'active' | 'draft' | 'closed';
  createdAt: number;
  kkm: number;
  targetClasses: string[];
  shuffleQuestions?: boolean;
}

export interface Result {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  score: number;
  totalQuestions: number;
  timestamp: number;
  violations?: number;
  feedback?: string;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  subject: string;
  description: string;
  attachment?: {
    name: string;
    data: string;
    type: string;
  };
  timestamp: number;
  status: 'pending' | 'reviewed';
  grade?: number;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  nis?: string;
  class?: string;
}
