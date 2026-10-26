-- Appointment reminders (#56): one row per appointment and offset (60, 15,
-- 0 minutes before the start). Planned when the appointment is booked or
-- moved, deleted when it is cancelled or finished. A minute job picks due
-- rows with "for update skip locked", so several API instances never send
-- the same reminder twice.
create table reminders (
    id             bigserial primary key,
    appointment_id bigint      not null references appointments (id) on delete cascade,
    offset_minutes int         not null check (offset_minutes >= 0),
    due_at         timestamptz not null,
    sent_at        timestamptz,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    unique (appointment_id, offset_minutes)
);
create index idx_reminders_due on reminders (due_at) where sent_at is null;
