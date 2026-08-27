alter table job_cards
    add column if not exists next_service_at timestamptz,
    add column if not exists next_service_km integer,
    add column if not exists follow_up_type varchar(40);
