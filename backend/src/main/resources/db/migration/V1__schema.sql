-- Randevum core schema (#8, #9).
-- All instants are timestamptz; the application works in Asia/Baku.

create extension if not exists btree_gist;

create table users (
    id            bigserial primary key,
    email         varchar(255) not null unique,
    password_hash varchar(255),
    full_name     varchar(120) not null,
    phone         varchar(32),
    role          varchar(20)  not null check (role in ('ADMIN', 'PROVIDER', 'CUSTOMER')),
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);

create table categories (
    id          bigserial primary key,
    slug        varchar(60)  not null unique,
    name        varchar(120) not null,
    description varchar(255),
    sort_order  int          not null default 0,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now()
);

create table provider_profiles (
    id                 bigserial primary key,
    user_id            bigint       unique references users (id) on delete set null,
    category_id        bigint       not null references categories (id),
    slug               varchar(80)  not null unique,
    display_name       varchar(120) not null,
    title              varchar(120) not null,
    bio                text,
    city               varchar(60)  not null,
    address            varchar(255),
    phone              varchar(32),
    -- Lowest active service price, kept in sync by the service layer so the
    -- catalog can filter and sort by price without a subquery.
    price_from         numeric(10, 2),
    rating_avg         numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
    rating_count       int          not null default 0 check (rating_count >= 0),
    cancellation_hours int          not null default 2 check (cancellation_hours >= 0),
    slot_step_minutes  int          not null default 15 check (slot_step_minutes in (5, 10, 15, 20, 30, 60)),
    active             boolean      not null default true,
    created_at         timestamptz  not null default now(),
    updated_at         timestamptz  not null default now()
);
create index idx_provider_profiles_category on provider_profiles (category_id);
create index idx_provider_profiles_city on provider_profiles (city);
create index idx_provider_profiles_rating on provider_profiles (rating_avg desc);

create table service_offerings (
    id               bigserial primary key,
    provider_id      bigint        not null references provider_profiles (id) on delete cascade,
    name             varchar(120)  not null,
    description      varchar(500),
    price            numeric(10, 2) not null check (price >= 0),
    duration_minutes int           not null check (duration_minutes between 5 and 600),
    active           boolean       not null default true,
    created_at       timestamptz   not null default now(),
    updated_at       timestamptz   not null default now()
);
create index idx_service_offerings_provider on service_offerings (provider_id);

-- Weekly working intervals. A break is the gap between two intervals of the
-- same day (e.g. 09:00-13:00 and 14:00-18:00).
create table availability_rules (
    id          bigserial primary key,
    provider_id bigint      not null references provider_profiles (id) on delete cascade,
    day_of_week smallint    not null check (day_of_week between 1 and 7), -- ISO: 1 = Monday
    start_time  time        not null,
    end_time    time        not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    check (start_time < end_time)
);
create index idx_availability_rules_provider on availability_rules (provider_id, day_of_week);

-- Days off and holidays, inclusive range.
create table time_off (
    id          bigserial primary key,
    provider_id bigint       not null references provider_profiles (id) on delete cascade,
    starts_on   date         not null,
    ends_on     date         not null,
    reason      varchar(255),
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now(),
    check (starts_on <= ends_on)
);
create index idx_time_off_provider on time_off (provider_id, starts_on);

create table appointments (
    id            bigserial primary key,
    code          varchar(20)   not null unique,
    provider_id   bigint        not null references provider_profiles (id),
    customer_id   bigint        not null references users (id),
    service_id    bigint        not null references service_offerings (id),
    starts_at     timestamptz   not null,
    ends_at       timestamptz   not null,
    status        varchar(20)   not null check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
    price         numeric(10, 2) not null check (price >= 0),
    customer_note varchar(500),
    cancelled_at  timestamptz,
    cancel_reason varchar(255),
    created_at    timestamptz   not null default now(),
    updated_at    timestamptz   not null default now(),
    check (starts_at < ends_at),
    -- Double-booking guard: two active appointments of the same provider may
    -- not overlap. Cancelled / finished ones are ignored. Half-open ranges let
    -- 10:00-10:30 and 10:30-11:00 sit back to back.
    constraint appointments_no_overlap exclude using gist (
        provider_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status in ('PENDING', 'CONFIRMED'))
);
create index idx_appointments_customer on appointments (customer_id, starts_at);
create index idx_appointments_provider_time on appointments (provider_id, starts_at);

create table reviews (
    id             bigserial primary key,
    appointment_id bigint      not null unique references appointments (id) on delete cascade,
    provider_id    bigint      not null references provider_profiles (id) on delete cascade,
    customer_id    bigint      not null references users (id),
    rating         smallint    not null check (rating between 1 and 5),
    comment        varchar(1000),
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);
create index idx_reviews_provider on reviews (provider_id, created_at desc);
