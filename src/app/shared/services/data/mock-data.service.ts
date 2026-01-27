import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Class, SubjectItem, ExamType, Section } from '../../models/common';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {

  getClassesFromApi(): Observable<Class[]> {
    return of([
      { id: 1, name: 'Class ' },
      { id: 2, name: 'Class 11' },
      { id: 3, name: 'Class 12' },
      { id: 4, name: 'Class 9' },
      { id: 5, name: 'Class 8' }
    ]).pipe(delay(500));
  }

  getSubjectsFromApi(): Observable<SubjectItem[]> {
    return of([
      { id: 1, name: 'Mathematics' },
      { id: 2, name: 'Physics' },
      { id: 3, name: 'Chemistry' },
      { id: 4, name: 'Biology' },
      { id: 5, name: 'English' },
      { id: 6, name: 'Computer Science' }
    ]).pipe(delay(500));
  }

  getExamTypesFromApi(): Observable<ExamType[]> {
    return of([
      { id: 1, name: 'Mid-Term Examination' },
      { id: 2, name: 'Final Examination' },
      { id: 3, name: 'Unit Test' },
      { id: 4, name: 'Quiz' },
      { id: 5, name: 'Pre-Board' }
    ]).pipe(delay(500));
  }

  getMockSections(): Section[] {
    return [
      { id: 1, name: 'Section A' },
      { id: 2, name: 'Section B' },
      { id: 3, name: 'Section C' },
      { id: 4, name: 'Section D' }
    ];
  }

  getSectionsFromApi(classId: string): Observable<Section[]> {
    return of(this.getMockSections()).pipe(delay(300));
  }

  getMockSubjects(): SubjectItem[] {
    return [
      { id: 1, name: 'Mathematics' },
      { id: 2, name: 'Physics' },
      { id: 3, name: 'Chemistry' },
      { id: 4, name: 'Biology' },
      { id: 5, name: 'English' },
      { id: 6, name: 'Computer Science' }
    ];
  }

  getMockExamTypes(): ExamType[] {
    return [
      { id: 1, name: 'Mid-Term Examination' },
      { id: 2, name: 'Final Examination' },
      { id: 3, name: 'Unit Test' }
    ];
  }

  getMockClasses(): Class[] {
    return [
      { id: 1, name: 'Class 10' },
      { id: 2, name: 'Class 11' },
      { id: 3, name: 'Class 12' }
    ];
  }
}
