import { Pipe, PipeTransform } from '@angular/core';
import {
  AvailabilitySlot,
  WEEK_DAYS,
} from '../../core/models/employee.model';

// Sorts availability windows by weekday (Monday first) then by start time
@Pipe({
  name: 'sortAvailabilitySlots',
  standalone: true,
})
export class SortAvailabilitySlotsPipe implements PipeTransform {
  transform(
    slots: AvailabilitySlot[] | null | undefined,
  ): AvailabilitySlot[] {
    if (!slots) {
      return [];
    }
    return [...slots].sort((a, b) => {
      const dayDiff = WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day);
      return dayDiff === 0 ? a.startTime.localeCompare(b.startTime) : dayDiff;
    });
  }
}
