import { Directive, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MonoTypeOperatorFunction } from 'rxjs';

/**
 * BaseComponent
 *
 * Extend this in any component that has HTTP subscriptions or timers.
 * You get destroy$ and cancelOnDestroy() for free — no boilerplate needed.
 *
 * USAGE:
 *   export class TeacherListComponent extends BaseComponent implements OnInit {
 *
 *     // Subscriptions — auto cancelled when component is destroyed
 *     this.teacherService.getTeachers()
 *       .pipe(this.cancelOnDestroy())
 *       .subscribe(...)
 *
 *     // Timers — auto cancelled when component is destroyed
 *     this.timer(()=> this.router.navigate(['/dashboard']), 2000);
 *   }
 */
@Directive()
export abstract class BaseComponent {
  // One shared DestroyRef — injected once here, available to all subclasses
  protected readonly destroyRef = inject(DestroyRef);

  /**
   * Pipe operator — cancels the subscription when the component is destroyed.
   *
   * Usage:
   *   this.service.getData().pipe(this.cancelOnDestroy()).subscribe(...)
   */
  protected cancelOnDestroy<T>(): MonoTypeOperatorFunction<T> {
    return takeUntilDestroyed(this.destroyRef);
  }

  /**
   * Safe timer — automatically cancelled if the component is destroyed
   * before the delay fires. Returns the timer ID in case you need to
   * cancel it manually earlier.
   *
   * Usage:
   *   this.timer(() => this.router.navigate(['/login']), 2000);
   */
  protected timer(fn: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(fn, delayMs);
    this.destroyRef.onDestroy(() => clearTimeout(id));
    return id;
  }
}