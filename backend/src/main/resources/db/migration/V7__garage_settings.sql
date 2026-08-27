create table if not exists garage_settings (
    id bigint primary key default 1,
    name varchar(140) not null default 'Garage Management',
    address text,
    gstin varchar(30),
    phone varchar(20),
    email varchar(180),
    updated_at timestamptz not null default now(),
    constraint garage_settings_singleton check (id = 1)
);

insert into garage_settings (id)
values (1)
on conflict (id) do nothing;
