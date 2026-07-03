import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-last-login-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (timestamp) {
      {{ timestamp | date: 'short' }}
    } @else {
      <span class="muted">N/A</span>
    }
  `,
  styles: ['.muted { color: #94a3b8; }'],
})
export class LastLoginCellComponent {
  @Input() timestamp: string | null | undefined = null;
}
