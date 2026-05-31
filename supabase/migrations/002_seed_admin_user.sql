-- ============================================
-- PIX RESCUE - Criar usuário admin de teste
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@gmail.com'
  ) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@gmail.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
    RAISE NOTICE 'Usuário admin criado com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário admin já existe.';
  END IF;
END;
$$;

-- Confirmar criação
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'admin@gmail.com';
