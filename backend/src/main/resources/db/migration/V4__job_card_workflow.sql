alter table job_cards
    add column if not exists work_items text,
    add column if not exists parts_items text,
    add column if not exists labour_items text,
    add column if not exists estimate_amount numeric(12, 2) not null default 0,
    add column if not exists estimate_notes text,
    add column if not exists approval_status varchar(30) not null default 'PENDING',
    add column if not exists approval_notes text,
    add column if not exists final_review_notes text,
    add column if not exists invoice_number varchar(40),
    add column if not exists invoice_amount numeric(12, 2) not null default 0,
    add column if not exists payment_status varchar(30) not null default 'PENDING',
    add column if not exists paid_amount numeric(12, 2) not null default 0,
    add column if not exists payment_mode varchar(40),
    add column if not exists delivered_at timestamptz,
    add column if not exists follow_up_at timestamptz,
    add column if not exists follow_up_notes text,
    add column if not exists whatsapp_reminder_at timestamptz,
    add column if not exists return_notes text;

alter table job_cards
    add column if not exists fuel_level varchar(40),
    add column if not exists vehicle_condition text,
    add column if not exists accessories text,
    add column if not exists photo_urls text;

alter table job_cards drop constraint if exists job_cards_status_check;

alter table job_cards
    add constraint job_cards_status_check
        check (status in ('RECEIVED','INSPECTION','ESTIMATE','WAITING_APPROVAL','APPROVED','WORK_IN_PROGRESS','WORK_COMPLETED','QUALITY_CHECK','READY_FOR_DELIVERY','DELIVERED'));
