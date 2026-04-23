import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PageContextService {
  /** Optional subtitle shown in the topbar next to the page title */
  readonly topbarSubtitle = signal<string | null>(null);

  setSubtitle(text: string | null): void {
    this.topbarSubtitle.set(text);
  }

  clearSubtitle(): void {
    this.topbarSubtitle.set(null);
  }
}