-- Favourite providers (#46): a customer keeps the professionals they book
-- often and starts a booking from the account page.
create table favorites (
    id          bigserial primary key,
    user_id     bigint      not null references users (id) on delete cascade,
    provider_id bigint      not null references provider_profiles (id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (user_id, provider_id)
);
