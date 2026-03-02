import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassDto, ExamTypeDto, SectionDto, SubjectDto } from '../../../core/services/master-data.service';
import { QuestionPaperDto } from '../../../core/models/common.models';


@Component({
  selector: 'app-exam-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-filter.component.html',
  styleUrl:'./exam-filter.component.css',
})
export class ExamFilterComponent {
  // ─── Dropdown data (passed from parent) ──────────────────────────────────────
  @Input() classes:       ClassDto[]        = [];
  @Input() sections:      SectionDto[]      = [];
  @Input() subjects:      SubjectDto[]      = [];
  @Input() examTypes:     ExamTypeDto[]     = [];
  @Input() questionPapers: QuestionPaperDto[] = [];

  // ─── Selected values (two-way via Output + Input pair) ───────────────────────
  @Input() selectedClass    = '';
  @Input() selectedSection  = '';
  @Input() selectedSubject  = '';
  @Input() selectedExamType = '';
  @Input() selectedQuestionPaperId: number | null = null;

  @Output() selectedClassChange            = new EventEmitter<string>();
  @Output() selectedSectionChange          = new EventEmitter<string>();
  @Output() selectedSubjectChange          = new EventEmitter<string>();
  @Output() selectedExamTypeChange         = new EventEmitter<string>();
  @Output() selectedQuestionPaperIdChange  = new EventEmitter<number | null>();

  // ─── UI state (passed from parent) ───────────────────────────────────────────
  @Input() showQuestionPaperDropdown = false;
  @Input() isLoadingPapers           = false;
  @Input() isLoadingExamTypes        = false;
  @Input() isLoading                 = false;
  @Input() canShowStudents           = false;
  @Input() loadingLabel              = 'Loading...';
  @Input() buttonLabel               = 'Show Student Details';

  // ─── Empty state ──────────────────────────────────────────────────────────────
  @Input() showEmptyState   = false;
  @Input() noExamPaperFound = false;

  // ─── Events ───────────────────────────────────────────────────────────────────
  @Output() classChanged       = new EventEmitter<string>();
  @Output() sectionChanged     = new EventEmitter<void>();
  @Output() subjectChanged     = new EventEmitter<void>();
  @Output() examTypeChanged    = new EventEmitter<void>();
  @Output() showStudentsClick  = new EventEmitter<void>();

  onClassChange(value: string): void {
    this.selectedClassChange.emit(value);
    this.classChanged.emit(value);
  }

  onSectionChange(): void {
    this.selectedSectionChange.emit(this.selectedSection);
    this.sectionChanged.emit();
  }

  onSubjectChange(): void {
    this.selectedSubjectChange.emit(this.selectedSubject);
    this.subjectChanged.emit();
  }

  onExamTypeChange(): void {
    this.selectedExamTypeChange.emit(this.selectedExamType);
    this.examTypeChanged.emit();
  }

  onQuestionPaperChange(): void {
    this.selectedQuestionPaperIdChange.emit(this.selectedQuestionPaperId);
  }
}