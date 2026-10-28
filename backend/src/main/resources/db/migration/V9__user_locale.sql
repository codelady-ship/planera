-- Interface language of the user (#123): set at login or when switching the
-- language, used for push reminders that are sent without a request.
alter table users add column locale varchar(5) not null default 'az';
