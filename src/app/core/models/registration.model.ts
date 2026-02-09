import { ApiResponse } from './auth.model';

export interface StudentRegisterRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneNumber: string;
  address: string;
  classId: number;
  sectionId: number;
  rollNumber: string;
  admissionDate: string;
}

export interface TeacherRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  qualification: string;
  experience: number;
  dateOfJoining: string;
  subjectIds: number[];
}

export interface BulkUploadResponse {
  success: boolean;
  message: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors?: string[];
  classId:string;
  sectionId:string;
}

export interface ClassDropdown {
  id: number;
className: string;
  classNumber: number;
}

export interface SectionDropdown {
  id: number;
  sectionName: string;
  classId: number;
}

export interface SubjectDropdown {
  id: number;
  subjectName: string;
}
export type { ApiResponse };

export interface NextRollNumber {
  nextRollNumber: string;
}

