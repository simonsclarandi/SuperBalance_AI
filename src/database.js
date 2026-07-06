const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Obtener la ruta absoluta del proyecto (raíz)
const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, 'superbalance.sqlite');

let db;

function initDatabase() {
    // Crear conexión a SQLite
    db = new sqlite3.Database(dbPath);

    // Crear tabla transacciones si no existe
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS transacciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            monto REAL NOT NULL,
            categoria TEXT NOT NULL,
            descripcion TEXT,
            canal_origen TEXT NOT NULL,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.run(createTableQuery, function(err) {
        if (err) {
            console.error('Error al crear la tabla:', err.message);
        } else {
            console.log('Tabla transacciones creada o ya existe');
        }
    });

    return db;
}

// Exportar conexión y función de inicialización
module.exports = {
    initDatabase,
    getDb: () => db
};
