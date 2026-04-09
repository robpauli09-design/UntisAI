-- Add recurrence support to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IN ('weekly', 'biweekly')),
  ADD COLUMN IF NOT EXISTS recurrence_end DATE;
