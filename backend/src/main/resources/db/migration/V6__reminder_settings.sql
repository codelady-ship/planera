-- Reminder settings per user (#57): minutes before the start, comma-separated
-- from the allowed set 1440, 60, 15, 0. Changing them re-plans the user's
-- upcoming reminders.
alter table users add column reminder_offsets varchar(40) not null default '60,15,0';
