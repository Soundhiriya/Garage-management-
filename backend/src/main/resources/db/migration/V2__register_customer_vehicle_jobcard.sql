create table customers (
    id bigserial primary key,
    name varchar(140) not null,
    phone varchar(20) not null unique,
    address text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table vehicles (
    id bigserial primary key,
    customer_id bigint not null references customers(id),
    registration_number varchar(30),
    chassis_number varchar(80) not null unique,
    make varchar(80),
    model varchar(80),
    variant varchar(80),
    year integer,
    fuel varchar(40),
    transmission varchar(40),
    engine_number varchar(80),
    current_km integer,
    colour varchar(60),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table job_cards (
    id bigserial primary key,
    job_card_number varchar(30) not null unique,
    customer_id bigint not null references customers(id),
    vehicle_id bigint not null references vehicles(id),
    status varchar(40) not null check (status in ('RECEIVED','INSPECTION','ESTIMATE','WAITING_APPROVAL','APPROVED','WORK_IN_PROGRESS','QUALITY_CHECK','READY_FOR_DELIVERY','DELIVERED')),
    odometer_km integer,
    expected_delivery_at timestamptz,
    technician_id bigint references users(id),
    service_advisor_id bigint references users(id),
    complaint text,
    service_types text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by bigint references users(id),
    updated_by bigint references users(id)
);

create index idx_customers_phone on customers(phone);
create index idx_customers_name on customers(name);
create index idx_vehicles_chassis_number on vehicles(chassis_number);
create index idx_vehicles_registration_number on vehicles(registration_number);
create index idx_vehicles_customer_id on vehicles(customer_id);
create index idx_job_cards_job_card_number on job_cards(job_card_number);
create index idx_job_cards_vehicle_id on job_cards(vehicle_id);
create index idx_job_cards_customer_id on job_cards(customer_id);

