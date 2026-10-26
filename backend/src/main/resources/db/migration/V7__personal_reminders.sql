-- Personal notes with an alarm (#59): the user's own diary entries next to
-- the appointments. Reminder rows now point at either an appointment or a
-- personal note, so one job sends both.
create table personal_reminders (
    id               bigserial primary key,
    user_id          bigint        not null references users (id) on delete cascade,
    title            varchar(200)  not null,
    note             varchar(2000),
    starts_at        timestamptz   not null,
    reminder_offsets varchar(40)   not null default '0',
    source           varchar(10)   not null check (source in ('MANUAL', 'VOICE')),
    status           varchar(10)   not null default 'ACTIVE' check (status in ('ACTIVE', 'DONE', 'CANCELLED')),
    created_at       timestamptz   not null default now(),
    updated_at       timestamptz   not null default now()
);
create index idx_personal_reminders_user_time on personal_reminders (user_id, starts_at);

alter table reminders alter column appointment_id drop not null;
alter table reminders add column personal_reminder_id bigint references personal_reminders (id) on delete cascade;
alter table reminders add constraint reminders_one_target
    check ((appointment_id is null) <> (personal_reminder_id is null));
create unique index idx_reminders_personal_offset
    on reminders (personal_reminder_id, offset_minutes) where personal_reminder_id is not null;
