-- ====================================================================
-- SCRIPT DE PRUEBAS END-TO-END (E2E) - MUNDIAL PLATAFORMA
-- ====================================================================
-- Este script inserta datos de prueba coherentes para validar todos
-- los escenarios del flujo de la Tómbola y la Quiniela.
--
-- CARACTERÍSTICAS:
-- 1. Limpieza automática: Borra registros anteriores que comiencen con 'Test - '.
-- 2. Caso Tómbola (Varios Boletos):
--    - Test - Juan Pérez: 3 boletos, todos confirmados.
--    - Test - Carlos Ruíz: 2 boletos, ambos confirmados.
--    - Test - Ana Gómez: 2 boletos, 1 confirmado y 1 pendiente (para probar el caso de un pago aprobado y otro en espera).
--    - Test - María López: 1 boleto, pendiente de pago.
--    - Test - Sofía Torres: 1 boleto, confirmado.
-- 3. Caso Quiniela (Varios Jornadas y Puntos):
--    - Test - Juan Pérez: J1 confirmado (8 pts), J2 confirmado (12 pts).
--    - Test - Carlos Ruíz: J1 confirmado (10 pts), J2 confirmado (7 pts).
--    - Test - Ana Gómez: J1 confirmado (6 pts), J2 pendiente.
--    - Test - María López: J1 confirmado (5 pts), J2 pendiente.
--    - Test - Sofía Torres: J1 confirmado (14 pts) - Líder de la J1.
--
-- INSTRUCCIONES:
-- Copia este script completo y ejecútalo en el SQL Editor de Supabase.
-- ====================================================================

DO $$
DECLARE
    v_part_juan uuid;
    v_part_maria uuid;
    v_part_carlos uuid;
    v_part_ana uuid;
    v_part_sofia uuid;
BEGIN
    -- 1. LIMPIAR DATOS DE PRUEBA PREVIOS (Para evitar errores de duplicados y acumulación)
    DELETE FROM public.tickets WHERE participant_id IN (SELECT id FROM public.participants WHERE name LIKE 'Test - %');
    DELETE FROM public.quiniela_registrations WHERE participant_id IN (SELECT id FROM public.participants WHERE name LIKE 'Test - %');
    DELETE FROM public.participants WHERE name LIKE 'Test - %';

    -- 2. INSERTAR PARTICIPANTES DE PRUEBA Y GUARDAR SUS IDS EN VARIABLES
    INSERT INTO public.participants (name, phone) 
    VALUES ('Test - Juan Pérez', '5551112233') RETURNING id INTO v_part_juan;
    
    INSERT INTO public.participants (name, phone) 
    VALUES ('Test - María López', '5554445566') RETURNING id INTO v_part_maria;
    
    INSERT INTO public.participants (name, phone) 
    VALUES ('Test - Carlos Ruíz', '5557778899') RETURNING id INTO v_part_carlos;
    
    INSERT INTO public.participants (name, phone) 
    VALUES ('Test - Ana Gómez', '5552223344') RETURNING id INTO v_part_ana;
    
    INSERT INTO public.participants (name, phone) 
    VALUES ('Test - Sofía Torres', '5559990011') RETURNING id INTO v_part_sofia;

    -- 3. INSERTAR BOLETOS DE TÓMBOLA (Múltiples estados y cantidades)
    
    -- Juan Pérez: Compra 3 boletos, todos CONFIRMADOS (sin selección asignada para sorteo interactivo)
    INSERT INTO public.tickets (participant_id, payment_status, payment_receipt_url, assigned_team) VALUES
    (v_part_juan, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null),
    (v_part_juan, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null),
    (v_part_juan, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null);

    -- María López: Compra 1 boleto, PENDIENTE
    INSERT INTO public.tickets (participant_id, payment_status, payment_receipt_url, assigned_team) VALUES
    (v_part_maria, 'pending', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null);

    -- Carlos Ruíz: Compra 2 boletos, ambos CONFIRMADOS
    INSERT INTO public.tickets (participant_id, payment_status, payment_receipt_url, assigned_team) VALUES
    (v_part_carlos, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null),
    (v_part_carlos, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null);

    -- Ana Gómez: Compra 2 boletos, 1 CONFIRMADO y 1 PENDIENTE (Caso solicitado de confirmación parcial)
    INSERT INTO public.tickets (participant_id, payment_status, payment_receipt_url, assigned_team) VALUES
    (v_part_ana, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null),
    (v_part_ana, 'pending', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null);

    -- Sofía Torres: Compra 1 boleto, CONFIRMADO
    INSERT INTO public.tickets (participant_id, payment_status, payment_receipt_url, assigned_team) VALUES
    (v_part_sofia, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', null);


    -- 4. INSERTAR REGISTROS DE QUINIELAS (Múltiples jornadas y puntos pre-cargados)
    -- (Un participante puede registrarse en varias jornadas, pero solo 1 vez por cada jornada)

    -- Juan Pérez: Confirmado J1 (8 pts), Confirmado J2 (12 pts)
    INSERT INTO public.quiniela_registrations (participant_id, jornada, payment_status, payment_receipt_url, quiniela_image_url, points) VALUES
    (v_part_juan, 1, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 8),
    (v_part_juan, 2, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 12);

    -- María López: Confirmado J1 (5 pts), J2 PENDIENTE (sin puntos)
    INSERT INTO public.quiniela_registrations (participant_id, jornada, payment_status, payment_receipt_url, quiniela_image_url, points) VALUES
    (v_part_maria, 1, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 5),
    (v_part_maria, 2, 'pending', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 0);

    -- Carlos Ruíz: Confirmado J1 (10 pts), Confirmado J2 (7 pts)
    INSERT INTO public.quiniela_registrations (participant_id, jornada, payment_status, payment_receipt_url, quiniela_image_url, points) VALUES
    (v_part_carlos, 1, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 10),
    (v_part_carlos, 2, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 7);

    -- Ana Gómez: Confirmado J1 (6 pts), J2 PENDIENTE (sin puntos)
    INSERT INTO public.quiniela_registrations (participant_id, jornada, payment_status, payment_receipt_url, quiniela_image_url, points) VALUES
    (v_part_ana, 1, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 6),
    (v_part_ana, 2, 'pending', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 0);

    -- Sofía Torres: Confirmado J1 (14 pts) - Líder de la Jornada 1
    INSERT INTO public.quiniela_registrations (participant_id, jornada, payment_status, payment_receipt_url, quiniela_image_url, points) VALUES
    (v_part_sofia, 1, 'confirmed', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/receipts/test-rec.png', 'https://fzgpcklsopdtbezzepnx.supabase.co/storage/v1/object/public/quinielas/test-quin.png', 14);

END $$;
