-- Demo catalog for local development and the public demo (#11).
-- Loaded only when the "dev" or "demo" profile adds classpath:db/seed to the
-- Flyway locations. Repeatable migration: it re-runs when this file changes,
-- so every insert is guarded and the script is safe to run again.

insert into categories (slug, name, description, sort_order) values
    ('gozellik',     'Gözəllik və baxım',  'Bərbər, salon, manikür, kosmetoloq', 1),
    ('saglamliq',    'Həkim və klinika',   'Stomatoloq, terapevt, klinikalar',   2),
    ('konsultasiya', 'Biznes və məsləhət', 'Konsultant, hüquq, maliyyə',         3),
    ('tehsil',       'Müəllim və dərslər', 'Dil, riyaziyyat, musiqi',            4),
    ('idman',        'İdman və məşq',      'Fərdi məşqçi, yoqa',                 5),
    ('diger',        'Digər xidmətlər',    'Foto, təmir, avto',                  6)
on conflict (slug) do update
    set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

do $$
declare
    p_id bigint;
    u_id bigint;
    rec  record;
begin
    if exists (select 1 from provider_profiles where slug = 'elvin-barber') then
        return;
    end if;

    insert into users (email, full_name, phone, role) values
        ('admin@randevum.az',    'Randevum Admin', null, 'ADMIN'),
        ('musteri@randevum.az',  'Aynur Qasımova', '+994501112233', 'CUSTOMER')
    on conflict (email) do nothing;

    for rec in
        select * from (values
            ('elvin-barber',      'Elvin Məmmədov',     'Bərbər',                'gozellik',     'Bakı',     'Nizami küç. 45',          4.90, 214, 'Klassik və müasir kişi saç düzümləri, saqqal dizaynı. 8 il təcrübə.'),
            ('leyla-beauty',      'Leyla Əliyeva',      'Kosmetoloq',            'gozellik',     'Bakı',     'Xətai pr. 12',            4.80, 131, 'Üz baxımı, pilinq və manikür.'),
            ('dr-leyla-hesenova', 'Dr. Leyla Həsənova', 'Stomatoloq',            'saglamliq',    'Bakı',     'Həsən bəy Zərdabi 78',    4.80, 168, 'Terapevtik stomatologiya və diş ağardılması.'),
            ('dr-tural-quliyev',  'Dr. Tural Quliyev',  'Terapevt',              'saglamliq',    'Gəncə',    'Atatürk pr. 21',          4.60,  74, 'Ümumi müayinə və konsultasiya.'),
            ('kamran-consulting', 'Kamran Rzayev',      'Biznes konsultantı',    'konsultasiya', 'Bakı',     'Port Baku, B blok',       4.90,  58, 'Startap və kiçik biznes üçün strategiya, maliyyə planlaması.'),
            ('sebine-huquq',      'Səbinə Abbasova',    'Hüquqşünas',            'konsultasiya', 'Sumqayıt', 'Sülh küç. 3',             4.70,  45, 'Əmək və ailə hüququ üzrə məsləhət.'),
            ('nigar-english',     'Nigar Quliyeva',     'İngilis dili müəllimi', 'tehsil',       'Sumqayıt', 'Onlayn və ofisdə',        4.90,  97, 'IELTS hazırlığı və danışıq dərsləri.'),
            ('rauf-fitness',      'Rauf Əliyev',        'Fərdi məşqçi',          'idman',        'Gəncə',    'Olimpiya kompleksi',      4.70,  82, 'Arıqlama və güc proqramları.')
        ) as t(slug, name, title, category, city, address, rating, reviews, bio)
    loop
        insert into users (email, full_name, role)
        values (rec.slug || '@randevum.az', rec.name, 'PROVIDER')
        returning id into u_id;

        insert into provider_profiles (user_id, category_id, slug, display_name, title, bio, city, address, rating_avg, rating_count)
        values (u_id, (select id from categories where slug = rec.category), rec.slug, rec.name, rec.title, rec.bio,
                rec.city, rec.address, rec.rating, rec.reviews)
        returning id into p_id;

        -- Monday-Friday 09:00-13:00 and 14:00-18:00 (lunch break), Saturday 10:00-15:00.
        insert into availability_rules (provider_id, day_of_week, start_time, end_time)
        select p_id, d, time '09:00', time '13:00' from generate_series(1, 5) d
        union all
        select p_id, d, time '14:00', time '18:00' from generate_series(1, 5) d
        union all
        select p_id, 6, time '10:00', time '15:00';
    end loop;

    insert into service_offerings (provider_id, name, description, price, duration_minutes)
    select p.id, s.name, s.description, s.price, s.duration
    from provider_profiles p
    join (values
        ('elvin-barber',      'Saç kəsimi',             'Yuma və üslub daxil',            15.00,  30),
        ('elvin-barber',      'Saqqal dizaynı',         null,                              10.00,  20),
        ('elvin-barber',      'Saç + saqqal',           null,                              22.00,  50),
        ('leyla-beauty',      'Manikür',                null,                              20.00,  45),
        ('leyla-beauty',      'Üz baxımı',              'Təmizləmə və maska',              45.00,  60),
        ('dr-leyla-hesenova', 'Müayinə',                null,                              30.00,  30),
        ('dr-leyla-hesenova', 'Diş təmizlənməsi',       null,                              60.00,  60),
        ('dr-leyla-hesenova', 'Diş ağardılması',        null,                             150.00,  90),
        ('dr-tural-quliyev',  'Ümumi müayinə',          null,                              25.00,  30),
        ('kamran-consulting', 'Konsultasiya',           'Biznes planı və strategiya',      50.00,  45),
        ('kamran-consulting', 'Ətraflı strategiya sessiyası', null,                       120.00,  90),
        ('sebine-huquq',      'Hüquqi məsləhət',        null,                              40.00,  45),
        ('nigar-english',     'Fərdi dərs',             null,                              25.00,  60),
        ('nigar-english',     'IELTS hazırlığı',        null,                              35.00,  90),
        ('rauf-fitness',      'Fərdi məşq',             null,                              20.00,  60)
    ) as s(slug, name, description, price, duration) on s.slug = p.slug;

    update provider_profiles p
    set price_from = (select min(price) from service_offerings s where s.provider_id = p.id and s.active);
end $$;

-- Demo logins (#25): every demo account uses the password "Randevum123".
create extension if not exists pgcrypto;
update users set password_hash = crypt('Randevum123', gen_salt('bf', 10))
where password_hash is null and email like '%@randevum.az';
