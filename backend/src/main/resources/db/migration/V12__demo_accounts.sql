-- Read-only demo accounts (portfolio admin demo): a user with demo = true can
-- sign in and read everything its role allows, but the API refuses every
-- change it tries (DemoReadOnlyFilter). Real accounts keep demo = false.
alter table users add column demo boolean not null default false;
