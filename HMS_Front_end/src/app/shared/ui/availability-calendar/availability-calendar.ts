import { ChangeDetectionStrategy, Component, computed, forwardRef, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { WeekDay } from '../../../core/models/employee.model';

// JS Date.getDay() (0=Sunday) -> backend WeekDay enum
const WEEKDAY_BY_INDEX: WeekDay[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

interface DayCell {
  iso: string;
  day: number;
  selectable: boolean;
  today: boolean;
}

// Month grid date picker that enables only the doctor available weekdays and hides dates outside the allowed range
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './availability-calendar.html',
  styleUrl: './availability-calendar.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AvailabilityCalendarComponent),
      multi: true,
    },
  ],
})
export class AvailabilityCalendarComponent implements ControlValueAccessor {
  // Weekdays the doctor is available; empty means nothing is selectable
  @Input() set availableDays(value: WeekDay[] | null | undefined) {
    this.days.set(new Set(value || []));
  }
  private readonly days = signal<Set<WeekDay>>(new Set());

  // Earliest selectable date (yyyy-mm-dd), e.g. today or the doctor's joining date
  @Input() set minDate(value: string | null | undefined) {
    this.min.set(value ? value.substring(0, 10) : '');
  }
  private readonly min = signal('');

  // Latest selectable date (yyyy-mm-dd), e.g. the 6-months-ahead cap
  @Input() set maxDate(value: string | null | undefined) {
    this.max.set(value ? value.substring(0, 10) : '');
  }
  private readonly max = signal('');

  // Booking cutoff (yyyy-mm-dd); this date and all later dates are disabled
  @Input() set cutoffDate(value: string | null | undefined) {
    this.cutoff.set(value ? value.substring(0, 10) : '');
  }
  private readonly cutoff = signal('');

  @Input() disabled = false;
  @Input() emptyText = 'Select a doctor to see available dates';

  readonly weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  selected = signal<string | null>(null);

  // Currently displayed month
  private readonly view = signal(this.monthOf(new Date()));

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  // ControlValueAccessor
  writeValue(value: unknown): void {
    const iso = typeof value === 'string' && value ? value.substring(0, 10) : null;
    this.selected.set(iso);
    if (iso) {
      const [y, m] = iso.split('-').map(Number);
      this.view.set({ y, m: m - 1 });
    }
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  hasAvailability = computed(() => this.days().size > 0);

  monthLabel = computed(() => {
    const { y, m } = this.view();
    return new Date(y, m, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  });

  // Weeks of (DayCell | null); null cells pad the leading/trailing gaps
  weeks = computed<(DayCell | null)[][]>(() => {
    const { y, m } = this.view();
    const startDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayIso = this.toIso(new Date());

    const cells: (DayCell | null)[] = [];
    for (let i = 0; i < startDow; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = this.iso(y, m, d);
      cells.push({
        iso,
        day: d,
        selectable: this.isSelectable(y, m, d, iso),
        today: iso === todayIso,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: (DayCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  canPrev = computed(() => {
    const min = this.min();
    if (!min) {
      return true;
    }
    const { y, m } = this.view();
    return min < this.iso(y, m, 1);
  });

  canNext = computed(() => {
    const max = this.max();
    if (!max) {
      return true;
    }
    const { y, m } = this.view();
    return max > this.iso(y, m, new Date(y, m + 1, 0).getDate());
  });

  prevMonth(): void {
    const { y, m } = this.view();
    this.view.set(this.monthOf(new Date(y, m - 1, 1)));
  }

  nextMonth(): void {
    const { y, m } = this.view();
    this.view.set(this.monthOf(new Date(y, m + 1, 1)));
  }

  pick(cell: DayCell | null): void {
    if (!cell || !cell.selectable || this.disabled) {
      return;
    }
    this.selected.set(cell.iso);
    this.onChange(cell.iso);
    this.onTouched();
  }

  isSelected(cell: DayCell | null): boolean {
    return !!cell && this.selected() === cell.iso;
  }

  private isSelectable(y: number, m: number, d: number, iso: string): boolean {
    if (this.disabled || this.days().size === 0) {
      return false;
    }
    if (this.min() && iso < this.min()) {
      return false;
    }
    if (this.max() && iso > this.max()) {
      return false;
    }
    if (this.cutoff() && iso >= this.cutoff()) {
      return false;
    }
    const weekday = WEEKDAY_BY_INDEX[new Date(y, m, d).getDay()];
    return this.days().has(weekday);
  }

  private monthOf(date: Date): { y: number; m: number } {
    return { y: date.getFullYear(), m: date.getMonth() };
  }

  private iso(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private toIso(d: Date): string {
    return this.iso(d.getFullYear(), d.getMonth(), d.getDate());
  }

  trackByIso = (_: number, cell: DayCell | null) => cell?.iso ?? _;
}
