const { Pool } = require('pg');

// Conectamos al pool de Postgres usando la URL de Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Requisito de seguridad para Neon
});

// Inicializamos la tabla si no existe (Sintaxis de Postgres)
pool.query(`
    CREATE TABLE IF NOT EXISTS transacciones (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        descripcion TEXT,
        canal_origen VARCHAR(50) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).then(() => {
    console.log('✅ Base de datos PostgreSQL (Neon) conectada y lista.');
}).catch(err => {
    console.error('❌ Error configurando Postgres:', err.message);
});

module.exports = pool;