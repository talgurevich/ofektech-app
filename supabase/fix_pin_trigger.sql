-- =========================================================================
-- Fix: enforce_admin_pin trigger compared the user_role enum against an
-- empty text literal, which raises at runtime and rejects admins too.
-- Replace with an enum-safe comparison.
-- =========================================================================

create or replace function enforce_admin_pin()
returns trigger as $$
begin
  if (new.pinned_at is distinct from old.pinned_at)
     and (get_user_role() is distinct from 'admin'::user_role) then
    raise exception 'Only admins can pin or unpin posts';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger itself is unchanged, but recreate to be safe.
drop trigger if exists posts_enforce_pin on posts;
create trigger posts_enforce_pin
  before update on posts
  for each row execute function enforce_admin_pin();
