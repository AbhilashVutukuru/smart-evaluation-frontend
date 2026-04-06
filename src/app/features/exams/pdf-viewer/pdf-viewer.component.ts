import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ViewAnswerSheetService } from '../../../core/services/view-answer-sheet.service';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="margin:0;padding:0;width:100%;height:100vh;
                background:#404040;overflow:hidden;position:relative">

      <!-- ✅ Download button — correct filename -->
      <a *ngIf="blobUrl && fileName"
        [href]="blobUrl"
        [download]="fileName"
        style="position:fixed;top:10px;right:16px;z-index:9999;
               background:#6366f1;color:white;padding:7px 16px;
               border-radius:8px;font-family:sans-serif;font-size:13px;
               font-weight:600;text-decoration:none;
               display:flex;align-items:center;gap:6px;
               box-shadow:0 2px 8px rgba(0,0,0,0.3)">
        &#8595; Download
      </a>

      <!-- PDF viewer -->
      <iframe
        *ngIf="pdfUrl && !isLoading"
        [src]="pdfUrl"
        style="width:100%;height:100vh;border:none"
        type="application/pdf">
      </iframe>

      <!-- Loading -->
      <div *ngIf="isLoading"
        style="display:flex;align-items:center;justify-content:center;
               height:100vh;color:white;font-family:sans-serif;font-size:1rem">
        <p>Loading answer sheet...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error"
        style="display:flex;align-items:center;justify-content:center;
               height:100vh;color:#fca5a5;font-family:sans-serif;font-size:1rem">
        <p>{{ error }}</p>
      </div>

    </div>
  `
})
export class PdfViewerComponent implements OnInit {
  pdfUrl:    SafeResourceUrl | null = null;
  blobUrl:   string | null = null;   // ✅ for download button
  fileName   = 'answer-sheet.pdf';
  isLoading  = true;
  error:     string | null = null;

  constructor(
    private route:     ActivatedRoute,
    private sanitizer: DomSanitizer,
    private viewAnswerSheetService: ViewAnswerSheetService
  ) {}

  ngOnInit(): void {
    const params     = this.route.snapshot.queryParams;
    const studentId  = +params['studentId'];
    const classId    = +params['classId'];
    const subjectId  = +params['subjectId'];
    const examTypeId = +params['examTypeId'];

    const url = this.viewAnswerSheetService.getAnswerSheetUrl(
      studentId, classId, subjectId, examTypeId
    );

    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');

        // ✅ Read filename from Content-Disposition — server is source of truth
        const disposition = res.headers.get('Content-Disposition');
        let serverFileName = 'answer-sheet.pdf';

        if (disposition) {
          const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
          if (utf8Match?.[1]) {
            serverFileName = decodeURIComponent(utf8Match[1]);
          } else {
            const normalMatch = disposition.match(/filename="([^"]+)"/i);
            if (normalMatch?.[1]) {
              serverFileName = normalMatch[1];
            }
          }
        }

        this.fileName  = serverFileName;
        document.title = serverFileName;  // ✅ Tab name

        return res.blob();
      })
      .then(blob => {
        const blobUrl  = URL.createObjectURL(blob);
        this.blobUrl   = blobUrl;         // Download button uses this
        this.pdfUrl    = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
        this.isLoading = false;
      })
      .catch(() => {
        this.error     = 'Failed to load answer sheet';
        this.isLoading = false;
      });
  }

  ngOnDestroy(): void {
    //  Free memory when component destroyed
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }
}