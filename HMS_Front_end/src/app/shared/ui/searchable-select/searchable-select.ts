import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

// Generic searchable single-select dropdown (ControlValueAccessor) that stores the option id
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchable-select.html',
  styleUrl: './searchable-select.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor {
  private readonly host = inject(ElementRef);

  // The list of selectable options
  @Input() set options(value: any[]) {
    this._options.set(value || []);
  }
  get options(): any[] {
    return this._options();
  }
  private readonly _options = signal<any[]>([]);

  // Property names used to read each option's value, primary and secondary text
  @Input() valueKey = 'id';
  @Input() labelKey = 'name';
  @Input() sublabelKey?: string;

  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyText = 'No results found';
  @Input() disabled = false;

  // Emits the raw search term so a parent can do server-side search if desired
  @Input() onSearch?: (term: string) => void;

  isOpen = signal(false);
  searchTerm = signal('');
  selectedValue = signal<any>(null);
  activeIndex = signal(-1);

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  // Filtered options based on the current search term
  filteredOptions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const opts = this._options();
    if (!term) {
      return opts;
    }
    return opts.filter((opt) => {
      const label = String(opt?.[this.labelKey] ?? '').toLowerCase();
      const sublabel = this.sublabelKey
        ? String(opt?.[this.sublabelKey] ?? '').toLowerCase()
        : '';
      return label.includes(term) || sublabel.includes(term);
    });
  });

  // The currently selected option object (for displaying its label)
  selectedOption = computed(() => {
    const val = this.selectedValue();
    if (val === null || val === undefined) {
      return null;
    }
    return this._options().find((o) => o?.[this.valueKey] === val) ?? null;
  });

  displayLabel = computed(() => {
    const opt = this.selectedOption();
    return opt ? String(opt[this.labelKey] ?? '') : '';
  });

  // ControlValueAccessor
  writeValue(value: any): void {
    this.selectedValue.set(value ?? null);
  }
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Interaction
  toggle(): void {
    if (this.disabled) {
      return;
    }
    this.isOpen() ? this.close() : this.openDropdown();
  }

  openDropdown(): void {
    this.isOpen.set(true);
    this.searchTerm.set('');
    this.activeIndex.set(-1);
  }

  close(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.activeIndex.set(-1);
    if (this.onSearch) {
      this.onSearch(term);
    }
  }

  select(option: any): void {
    const val = option?.[this.valueKey] ?? null;
    this.selectedValue.set(val);
    this.onChange(val);
    this.close();
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedValue.set(null);
    this.onChange(null);
  }

  optionLabel(option: any): string {
    return String(option?.[this.labelKey] ?? '');
  }

  optionSublabel(option: any): string {
    return this.sublabelKey ? String(option?.[this.sublabelKey] ?? '') : '';
  }

  trackByValue = (_: number, option: any) => option?.[this.valueKey];

  // Keyboard navigation
  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.openDropdown();
      }
      return;
    }

    const options = this.filteredOptions();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.set(
          Math.min(this.activeIndex() + 1, options.length - 1),
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex() >= 0 && options[this.activeIndex()]) {
          this.select(options[this.activeIndex()]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  // Close when clicking outside the component
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
