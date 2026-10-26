-- Rebrand to Planera: demo accounts move to the planera.az domain and the
-- demo password becomes "Planera123" (pgcrypto is already present for the seed).
create extension if not exists pgcrypto;
update users
   set email = replace(email, '@randevum.az', '@planera.az'),
       password_hash = crypt('Planera123', gen_salt('bf', 10))
 where email like '%@randevum.az';
