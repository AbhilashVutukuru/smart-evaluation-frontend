import { Pipe, PipeTransform } from '@angular/core';
import { PageSlot } from './upload-answer-sheet.component';

@Pipe({ name: 'pagesUploaded', standalone: true })
export class PagesUploadedPipe implements PipeTransform {
  transform(slots: PageSlot[]): number {
    return slots?.filter(s => s.dataUrl !== null).length ?? 0;
  }
}