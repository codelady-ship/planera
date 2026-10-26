-- Web Push subscriptions (#55): one row per browser/device of a user. The
-- endpoint is unique across users; a browser that signs in as someone else
-- moves its subscription to the new user. Removed with the user.
create table push_subscriptions (
    id         bigserial primary key,
    user_id    bigint        not null references users (id) on delete cascade,
    endpoint   varchar(2000) not null unique,
    p256dh     varchar(255)  not null,
    auth       varchar(255)  not null,
    device     varchar(200),
    created_at timestamptz   not null default now(),
    updated_at timestamptz   not null default now()
);
create index idx_push_subscriptions_user on push_subscriptions (user_id);
