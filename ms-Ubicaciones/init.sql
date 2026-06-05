DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'ms_ubicaciones_user') THEN
        CREATE USER ms_ubicaciones_user WITH PASSWORD 'ubicaciones_secreto_123';
    END IF;
END
$$;

\c bd_ubicaciones;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE bd_ubicaciones TO ms_ubicaciones_user;
GRANT USAGE, CREATE ON SCHEMA public TO ms_ubicaciones_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ms_ubicaciones_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ms_ubicaciones_user;