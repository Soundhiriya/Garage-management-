alter table job_card_inspections alter column condition_status drop not null;

update inspection_items set name = 'Brake Pads', sort_order = 60 where name = 'Brake Pad';
update inspection_items set name = 'Stepney', sort_order = 120 where name = 'Spare Tyre / Stepney';

insert into inspection_items (name, sort_order)
select item_name, item_order
from (values
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
    ('Steering', 150)
) as desired(item_name, item_order)
where not exists (
    select 1 from inspection_items existing where existing.name = desired.item_name
);

update inspection_items existing
set sort_order = desired.item_order,
    is_active = true,
    updated_at = now()
from (values
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
    ('Steering', 150)
) as desired(item_name, item_order)
where existing.name = desired.item_name;

update inspection_items
set is_active = false,
    updated_at = now()
where name not in (
    'Engine Oil',
    'Coolant',
    'Brake Fluid',
    'Battery',
    'Air Filter',
    'Brake Pads',
    'Brake Disc',
    'Front Left Tyre',
    'Front Right Tyre',
    'Rear Left Tyre',
    'Rear Right Tyre',
    'Stepney',
    'AC',
    'Suspension',
    'Steering'
);
