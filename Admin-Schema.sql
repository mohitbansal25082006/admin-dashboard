-- Grant admin to both accounts
UPDATE public.profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'email-1',
    'email-2'
  )
);

-- Verify
SELECT au.email, p.is_admin
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
WHERE au.email IN (
  'email-1',
  'email-2'
);