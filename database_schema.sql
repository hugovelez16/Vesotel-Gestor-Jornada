-- Habilitar la extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ENUMS (Tipos de datos personalizados)
-- -----------------------------------------------------------------------------

CREATE TYPE user_app_role AS ENUM ('admin', 'user');
CREATE TYPE company_role AS ENUM ('admin', 'worker');
CREATE TYPE work_log_type AS ENUM ('particular', 'tutorial');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- -----------------------------------------------------------------------------
-- 2. TABLAS PRINCIPALES
-- -----------------------------------------------------------------------------

-- Tabla de Usuarios (Centraliza la identidad)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_app_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE, -- Reemplaza isAllowed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Empresas
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    fiscal_id VARCHAR(50), -- CIF/NIF
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Intermedia: Miembros de Empresa (Relación N:M)
CREATE TABLE company_members (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role company_role DEFAULT 'worker',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, company_id)
);

-- Configuración Financiera del Usuario (1:1 con users)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    daily_rate DECIMAL(10, 2) DEFAULT 0.00,
    coordination_rate DECIMAL(10, 2) DEFAULT 0.00,
    night_rate DECIMAL(10, 2) DEFAULT 0.00,
    is_gross BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Registros de Jornada (Work Logs)
CREATE TABLE work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- NULL = Por cuenta propia
    
    type work_log_type NOT NULL,
    
    -- Campos de fecha/hora
    date DATE, -- Fecha principal (para particular)
    start_time TIME, -- Para particular
    end_time TIME, -- Para particular
    
    start_date DATE, -- Para tutorial
    end_date DATE, -- Para tutorial
    
    duration_hours DECIMAL(5, 2), -- Calculado o introducido
    
    -- Campos económicos
    amount DECIMAL(10, 2), -- Se calculará en Backend
    rate_applied DECIMAL(10, 2), -- Tarifa base usada
    
    -- Flags y extras
    is_gross_calculation BOOLEAN, -- Se heredará de user_settings
    has_coordination BOOLEAN DEFAULT FALSE,
    has_night BOOLEAN DEFAULT FALSE,
    
    description TEXT,
    client VARCHAR(255), -- Cliente / Centro (Ej: IES Generalife)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Solicitudes de Acceso
CREATE TABLE access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status request_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. FUNCIONES Y TRIGGERS (SOLO UTILIDADES)
-- -----------------------------------------------------------------------------

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at en todas las tablas relevantes
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_companies_modtime BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_settings_modtime BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_work_logs_modtime BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
