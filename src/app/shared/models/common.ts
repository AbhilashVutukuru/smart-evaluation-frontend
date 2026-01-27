export interface Class {
  id: number;
  name: string;
}

export interface SubjectItem {
  id: number;
  name: string;
}

export interface ExamType {
  id: number;
  name: string;
}

export interface Section {
  id: number | string;
  name: string;
}

export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}
