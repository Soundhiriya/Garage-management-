create table inspection_items (
    id bigserial primary key,
    name varchar(120) not null unique,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table job_card_inspections (
    id bigserial primary key,
    job_card_id bigint not null references job_cards(id),
    inspection_item_id bigint not null references inspection_items(id),
    condition_status varchar(20) not null check (condition_status in ('GOOD','ATTENTION','REPLACE')),
    notes text,
    photo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by bigint references users(id),
    updated_by bigint references users(id),
    unique (job_card_id, inspection_item_id)
);

create index idx_job_card_inspections_job_card_id on job_card_inspections(job_card_id);
create index idx_job_card_inspections_item_id on job_card_inspections(inspection_item_id);

insert into inspection_items (name, sort_order) values
('Engine Oil', 10),
('Coolant', 20),
('Brake Fluid', 30),
('Battery', 40),
('Air Filter', 50),
('Brake Pads', 60),
('Brake Disc', 70),
('Front Left Tyre', 80),
('Front Right Tyre', 90),
('Rear Left Tyre', 100),
('Rear Right Tyre', 110),
('Stepney', 120),
('AC', 130),
('Suspension', 140),
('Steering', 150);
