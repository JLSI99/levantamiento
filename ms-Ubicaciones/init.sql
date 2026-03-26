
CREATE USER ms_ubicaciones_user WITH PASSWORD 'ubicaciones_secreto_123';

GRANT CONNECT ON DATABASE bd_ubicaciones TO ms_ubicaciones_user;
GRANT USAGE, CREATE ON SCHEMA public TO ms_ubicaciones_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ms_ubicaciones_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ms_ubicaciones_user;
