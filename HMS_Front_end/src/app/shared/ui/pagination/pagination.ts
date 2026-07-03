import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Reusable offset pagination control with paging buttons and clickable page numbers that collapse behind ellipses when pages are many
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class PaginationComponent {
  @Input({ required: true }) page!: number;
  @Input({ required: true }) totalPages!: number;
  // Optional total record count, shown as muted context when provided
  @Input() total: number | null = null;
  // Disables every control (e.g. while a page is loading)
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();

  // Pages kept on each side of the current page before the strip collapses
  private readonly siblings = 1;

  // Builds the visible strip showing the first and last pages plus a window around the current page with ellipsis markers filling gaps
  get pages(): (number | 'ellipsis')[] {
    const last = this.totalPages;
    if (last <= 1) {
      return [1];
    }

    // first + last + current + siblings on both sides + two ellipses
    const maxButtons = this.siblings * 2 + 5;
    if (last <= maxButtons) {
      return Array.from({ length: last }, (_, i) => i + 1);
    }

    const current = this.clamp(this.page);
    const start = Math.max(2, current - this.siblings);
    const end = Math.min(last - 1, current + this.siblings);

    const items: (number | 'ellipsis')[] = [1];
    if (start > 2) {
      items.push('ellipsis');
    }
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    if (end < last - 1) {
      items.push('ellipsis');
    }
    items.push(last);
    return items;
  }

  go(target: number | 'ellipsis'): void {
    if (target === 'ellipsis' || this.disabled) {
      return;
    }
    const next = this.clamp(target);
    if (next !== this.page) {
      this.pageChange.emit(next);
    }
  }

  prev(): void {
    if (!this.disabled && this.page > 1) {
      this.pageChange.emit(this.page - 1);
    }
  }

  next(): void {
    if (!this.disabled && this.page < this.totalPages) {
      this.pageChange.emit(this.page + 1);
    }
  }

  private clamp(p: number): number {
    return Math.min(Math.max(p, 1), this.totalPages);
  }
}
