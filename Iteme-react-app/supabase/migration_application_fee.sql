-- Run this once in the Supabase SQL editor. Adds application-fee payment
-- tracking, an approval status students can see on their dashboard, and
-- persists the enrollment-type/scholarship fields the form already collects.

alter table enrollments
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected'));

alter table enrollments
  add column if not exists application_fee_paid boolean not null default false;

alter table enrollments
  add column if not exists payment_method text
    check (payment_method in ('mobile_money', 'card'));

alter table enrollments
  add column if not exists enrollment_type text
    check (enrollment_type in ('full', 'scholarship'));

alter table enrollments
  add column if not exists household_income text;

alter table enrollments
  add column if not exists scholarship_reason text;
