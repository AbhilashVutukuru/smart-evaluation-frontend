/** Generic API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/** Question paper reference DTO */
export interface QuestionPaperDto {
  id: number;
  questionPaperName: string;
}