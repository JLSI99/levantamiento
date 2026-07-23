DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'ms_resguardo_user') THEN
        CREATE USER ms_resguardo_user WITH PASSWORD 'resguardo_secreto_123';
    END IF;
END
$$;

\c bd_resguardo;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE bd_resguardo TO ms_resguardo_user;
GRANT USAGE, CREATE ON SCHEMA public TO ms_resguardo_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ms_resguardo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ms_resguardo_user;