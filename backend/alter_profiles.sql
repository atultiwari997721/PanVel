-- Run this in your Supabase SQL Editor to update the existing table
-- This avoids the "relation already exists" error

-- 1. Add mobile column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile text;

-- 2. Add vehicle_details column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vehicle_details jsonb;

-- 3. Make email optional (if it was not null)
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- 4. Update existing rows to have a mobile number (optional, prevents null errors if you make it not null later)
-- UPDATE public.profiles SET mobile = phone WHERE mobile IS NULL;

-- 5. If you want to enforce mobile to be NOT NULL after populating:
-- ALTER TABLE public.profiles ALTER COLUMN mobile SET NOT NULL;
