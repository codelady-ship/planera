-- Refresh tokens (#25): only a SHA-256 hash is stored; each refresh rotates
-- the token, logout revokes it.
create table refresh_tokens (
    id         bigserial primary key,
    user_id    bigint      not null references users (id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_refresh_tokens_user on refresh_tokens (user_id);
