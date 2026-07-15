DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'ms_bienes_user') THEN
        CREATE USER ms_bienes_user WITH PASSWORD 'bienes_secreto_123';
    END IF;
END
$$;

\c bd_bienes;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE bd_bienes TO ms_bienes_user;
GRANT USAGE, CREATE ON SCHEMA public TO ms_bienes_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ms_bienes_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ms_bienes_user;