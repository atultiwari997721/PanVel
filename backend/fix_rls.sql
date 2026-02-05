-- FIX RLS POLICIES FOR ADMINS AND PARTNERS

-- 1. Allow Admins to see EVERYTHING in Profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  user_type = 'admin'
);

-- 2. Allow Admins to see EVERYTHING in Rides
CREATE POLICY "Admins can view all rides" ON public.rides
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 3. Allow Partners to see Rides they are driving OR available rides
DROP POLICY IF EXISTS "Drivers can see available rides." ON public.rides;
CREATE POLICY "Drivers can view relevant rides" ON public.rides
FOR SELECT USING (
  status = 'requested' 
  OR driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
