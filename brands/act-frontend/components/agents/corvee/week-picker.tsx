'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { addWeeks, startOfWeek, format, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WeekPickerProps {
  value: string;
  onChange: (value: string) => void;
  weeksAhead?: number;
}

interface WeekOption {
  value: string; // YYYY-MM-DD (Monday)
  label: string; // "Week 1 (6 jan - 12 jan)"
}

export function WeekPicker({ value, onChange, weeksAhead = 8 }: WeekPickerProps) {
  // Generate week options starting from the current week
  const weekOptions = useMemo((): WeekOption[] => {
    const options: WeekOption[] = [];
    const today = new Date();

    // Start from the Monday of the current week
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    for (let i = 0; i < weeksAhead; i++) {
      const weekStart = addWeeks(currentWeekStart, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      // Format: "Week 2 (6 jan - 12 jan)"
      const weekNumber = format(weekStart, 'w');
      const startFormatted = format(weekStart, 'd MMM', { locale: nl });
      const endFormatted = format(weekEnd, 'd MMM', { locale: nl });

      options.push({
        value: format(weekStart, 'yyyy-MM-dd'),
        label: `Week ${weekNumber} (${startFormatted} - ${endFormatted})`,
      });
    }

    return options;
  }, [weeksAhead]);

  return (
    <div className="space-y-2">
      <Label htmlFor="week-select">Selecteer week</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="week-select" className="w-full">
          <SelectValue placeholder="Kies een week..." />
        </SelectTrigger>
        <SelectContent>
          {weekOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
