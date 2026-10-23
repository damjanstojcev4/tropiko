-- Run once in the Supabase SQL Editor before deploying the new measure options.
-- Discover the existing enum used by products.unit rather than assuming its name.
DO $migration$
DECLARE
  unit_schema text;
  unit_type text;
  new_unit text;
BEGIN
  SELECT ns.nspname, typ.typname
    INTO unit_schema, unit_type
    FROM pg_attribute AS attr
    JOIN pg_type AS typ ON typ.oid = attr.atttypid
    JOIN pg_namespace AS ns ON ns.oid = typ.typnamespace
    WHERE attr.attrelid = 'public.products'::regclass
      AND attr.attname = 'unit'
      AND NOT attr.attisdropped
      AND typ.typtype = 'e';

  IF unit_type IS NULL THEN
    RAISE EXCEPTION 'Expected public.products.unit to use an enum. Inspect the unit column and its constraints before applying this migration.';
  END IF;

  FOREACH new_unit IN ARRAY ARRAY['kg_5', 'kg_10', 'kg_7', 'kg_3'] LOOP
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', unit_schema, unit_type, new_unit);
  END LOOP;
END;
$migration$;
