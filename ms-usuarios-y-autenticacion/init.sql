DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'ms_usuarios_user') THEN
        CREATE USER ms_usuarios_user WITH PASSWORD 'usuarios_secreto_123';
    END IF;
END
$$;

\c bd_usuarios;


REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE bd_usuarios TO ms_usuarios_user;
GRANT USAGE, CREATE ON SCHEMA public TO ms_usuarios_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ms_usuarios_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ms_usuarios_user;