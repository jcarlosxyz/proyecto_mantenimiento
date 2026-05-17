-- =========================================================================
-- CONFIGURACIÓN DE SUPABASE REALTIME - CMMS
-- =========================================================================
-- Instrucciones:
-- 1. Copia este script SQL.
-- 2. Ve al panel de control de Supabase (https://supabase.com).
-- 3. Entra a tu proyecto, selecciona "SQL Editor" en el menú lateral izquierdo.
-- 4. Crea un nuevo Query, pega este código y haz clic en "Run" (Ejecutar).
-- =========================================================================

DO $$
BEGIN
  -- 1. Asegurar que la publicación 'supabase_realtime' existe
  -- Supabase suele crearla automáticamente, pero esto previene cualquier error.
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Publicación supabase_realtime creada.';
  END IF;
  
  -- 2. Habilitar la replicación Realtime para la tabla 'ordenes_trabajo'
  -- Si ya está en la publicación, no hace nada para evitar errores.
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND n.nspname = 'public' 
      AND c.relname = 'ordenes_trabajo'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ordenes_trabajo;
    RAISE NOTICE 'Tabla ordenes_trabajo agregada a la publicación supabase_realtime.';
  ELSE
    RAISE NOTICE 'Tabla ordenes_trabajo ya cuenta con Realtime activo.';
  END IF;

  -- 3. Habilitar la replicación Realtime para la tabla 'activos'
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND n.nspname = 'public' 
      AND c.relname = 'activos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activos;
    RAISE NOTICE 'Tabla activos agregada a la publicación supabase_realtime.';
  ELSE
    RAISE NOTICE 'Tabla activos ya cuenta con Realtime activo.';
  END IF;
END $$;
