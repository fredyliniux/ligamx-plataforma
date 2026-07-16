-- ====================================================================
-- ACTUALIZACIÓN DE BASE DE DATOS: TRANSCRIPCIÓN Y PUNTOS PERSONALIZADOS
-- ====================================================================
-- Este script realiza las siguientes operaciones en Supabase:
-- 1. Limpia y carga los 24 partidos oficiales de la Jornada 1 (Mundial 2026).
-- 2. Actualiza la función de recálculo de puntos (3 pts victoria, 1 pt empate).
-- 3. Crea un trigger en la tabla 'quiniela_forecasts' para recalcular
--    automáticamente los puntos al guardar las transcripciones.
--
-- INSTRUCCIONES:
-- Copia este script completo y ejecútalo en el SQL Editor de Supabase.
-- ====================================================================

-- 1. LIMPIAR Y CARGAR LOS 24 PARTIDOS OFICIALES DE LA JORNADA 1
DELETE FROM public.matches WHERE jornada = 1;

INSERT INTO public.matches (jornada, local_team, visitor_team, match_date, status) VALUES
(1, 'México', 'Sudáfrica', '2026-06-11 13:00:00-06', 'pending'),
(1, 'Corea del Sur', 'Chequia', '2026-06-11 19:00:00-06', 'pending'),
(1, 'Canadá', 'Bosnia y Herzegovina', '2026-06-12 13:00:00-06', 'pending'),
(1, 'Estados Unidos', 'Paraguay', '2026-06-12 19:00:00-06', 'pending'),
(1, 'Haití', 'Escocia', '2026-06-13 13:00:00-06', 'pending'),
(1, 'Australia', 'Turquía', '2026-06-13 16:00:00-06', 'pending'),
(1, 'Brasil', 'Marruecos', '2026-06-13 19:00:00-06', 'pending'),
(1, 'Catar', 'Suiza', '2026-06-13 22:00:00-06', 'pending'),
(1, 'Costa de Marfil', 'Ecuador', '2026-06-14 13:00:00-06', 'pending'),
(1, 'Alemania', 'Curazao', '2026-06-14 16:00:00-06', 'pending'),
(1, 'Países Bajos', 'Japón', '2026-06-14 19:00:00-06', 'pending'),
(1, 'Suecia', 'Túnez', '2026-06-14 22:00:00-06', 'pending'),
(1, 'Arabia Saudita', 'Uruguay', '2026-06-15 13:00:00-06', 'pending'),
(1, 'España', 'Cabo Verde', '2026-06-15 16:00:00-06', 'pending'),
(1, 'Irán', 'Nueva Zelanda', '2026-06-15 19:00:00-06', 'pending'),
(1, 'Bélgica', 'Egipto', '2026-06-15 22:00:00-06', 'pending'),
(1, 'Francia', 'Senegal', '2026-06-16 13:00:00-06', 'pending'),
(1, 'Irak', 'Noruega', '2026-06-16 16:00:00-06', 'pending'),
(1, 'Argentina', 'Argelia', '2026-06-16 19:00:00-06', 'pending'),
(1, 'Austria', 'Jordania', '2026-06-16 22:00:00-06', 'pending'),
(1, 'Ghana', 'Panamá', '2026-06-17 13:00:00-06', 'pending'),
(1, 'Inglaterra', 'Croacia', '2026-06-17 16:00:00-06', 'pending'),
(1, 'Portugal', 'R.D. Congo', '2026-06-17 19:00:00-06', 'pending'),
(1, 'Uzbekistán', 'Colombia', '2026-06-17 22:00:00-06', 'pending');


-- 2. ACTUALIZAR LA FUNCIÓN DE CÁLCULO DE PUNTOS
-- Reglas: 1 punto por acierto, 0 en otro caso.
CREATE OR REPLACE FUNCTION public.recalculate_quiniela_points(p_jornada integer)
RETURNS void AS $$
DECLARE
    r RECORD;
    v_points integer;
BEGIN
    FOR r IN 
        SELECT id FROM public.quiniela_registrations WHERE jornada = p_jornada
    LOOP
        SELECT COUNT(*) INTO v_points
        FROM public.quiniela_forecasts f
        JOIN public.matches m ON f.match_id = m.id
        WHERE f.registration_id = r.id
          AND m.jornada = p_jornada
          AND m.status = 'finished'
          AND f.prediction = m.result;

        UPDATE public.quiniela_registrations
        SET points = v_points
        WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. CREAR FUNCIÓN Y TRIGGER EN LA TABLA DE PRONÓSTICOS
-- Esto asegura que al guardar/editar pronósticos de un usuario, sus puntos se recalculen de inmediato.
CREATE OR REPLACE FUNCTION public.on_forecast_change()
RETURNS trigger AS $$
DECLARE
    v_jornada integer;
    v_reg_id uuid;
BEGIN
    v_reg_id := COALESCE(NEW.registration_id, OLD.registration_id);
    SELECT jornada INTO v_jornada FROM public.quiniela_registrations WHERE id = v_reg_id;
    PERFORM public.recalculate_quiniela_points(v_jornada);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_forecast_change ON public.quiniela_forecasts;

CREATE TRIGGER trigger_forecast_change
AFTER INSERT OR UPDATE OR DELETE ON public.quiniela_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.on_forecast_change();
