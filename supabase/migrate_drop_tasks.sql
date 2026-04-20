-- Run this in the Supabase SQL Editor AFTER ensuring all task-related
-- code paths have migrated to workbook_entries. This drops the legacy
-- tasks table and its policies.

drop policy if exists "Users see own and venture tasks" on tasks;
drop policy if exists "Candidates manage own tasks" on tasks;
drop policy if exists "Venture members manage venture tasks" on tasks;
drop policy if exists "Admin can manage all tasks" on tasks;
drop policy if exists "Mentors can add tasks to assigned ventures" on tasks;

drop table if exists tasks;
