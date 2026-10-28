-- Waitlist (#45): a customer asks to be told when a fully booked day of a
-- provider frees up. When an appointment of that provider on that day is
-- cancelled, every open entry gets an e-mail and a push, then is closed.
create table waitlist_entries (
    id          bigserial primary key,
    user_id     bigint      not null references users (id) on delete cascade,
    provider_id bigint      not null references provider_profiles (id) on delete cascade,
    service_id  bigint      not null references service_offerings (id) on delete cascade,
    wanted_date date        not null,
    notified_at timestamptz,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (user_id, service_id, wanted_date)
);
create index idx_waitlist_open on waitlist_entries (provider_id, wanted_date) where notified_at is null;
