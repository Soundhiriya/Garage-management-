alter table job_cards
    add column if not exists discount_amount numeric(12, 2) not null default 0,
    add column if not exists delivery_notes text;
