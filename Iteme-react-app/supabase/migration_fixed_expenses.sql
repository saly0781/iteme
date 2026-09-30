-- Run after migration_finance.sql (needs is_finance()). Adds recurring
-- obligations — a teacher's monthly salary, the studio's rent, etc. — so
-- the CEO can see what's expected each month, not just what's already been
-- logged as an ad-hoc expense.

create table if not exists fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null check (
    category in ('rent', 'salaries', 'equipment', 'marketing', 'utilities', 'other')
  ),
  amount numeric(12, 2) not null check (amount > 0),
  -- Set when this obligation is a specific staff member's salary; null for
  -- things like rent that aren't tied to a person.
  profile_id uuid references profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table fixed_expenses enable row level security;

create policy "Finance roles can read fixed expenses"
  on fixed_expenses for select
  using (is_finance());

create policy "Finance roles can write fixed expenses"
  on fixed_expenses for insert
  with check (is_finance());

create policy "Finance roles can update fixed expenses"
  on fixed_expenses for update
  using (is_finance());

create policy "Finance roles can delete fixed expenses"
  on fixed_expenses for delete
  using (is_finance());

-- Lets an actual expense payment be linked back to the obligation it pays
-- down (e.g. "this expense record is October's rent"), so paid-vs-owed can
-- be computed precisely instead of guessed from category + date alone.
alter table expenses
  add column if not exists fixed_expense_id uuid references fixed_expenses (id) on delete set null;
