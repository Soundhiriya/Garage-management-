create table users (
    id bigserial primary key,
    name varchar(120) not null,
    email varchar(180) not null unique,
    mobile varchar(20) unique,
    password_hash varchar(255) not null,
    role varchar(30) not null check (role in ('ADMIN', 'MANAGER', 'TECHNICIAN')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table password_reset_tokens (
    id bigserial primary key,
    user_id bigint not null references users(id),
    token_hash varchar(255) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_users_mobile on users(mobile);
create index idx_users_email on users(email);
create index idx_password_reset_tokens_user_id on password_reset_tokens(user_id);
create index idx_password_reset_tokens_expires_at on password_reset_tokens(expires_at);

