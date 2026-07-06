require('./bot.js');

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

// Inicializar base de datos antes de iniciar el servidor
initDatabase();

const app = express();

// Middleware para parsear JSON y habilitar CORS
app.use(express.json());
app.use(cors());

// Endpoint GET - Obtener todas las transacciones ordenadas por fecha descendente
app.get('/api/transacciones', (req, res) => {
    const db = require('./database').getDb();
    
    db.all(`SELECT * FROM transacciones ORDER BY fecha_registro DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Formatear la respuesta con el timestamp en formato legible
        const formattedTransactions = rows.map(row => ({
            id: row.id,
            tipo: row.tipo,
            monto: row.monto,
            categoria: row.categoria,
            descripcion: row.descripcion || null,
            canal_origen: row.canal_origen,
            fecha_registro: new Date(row.fecha_registro).toISOString()
        }));

        res.json(formattedTransactions);
    });
});

// Endpoint POST - Crear nueva transacción
app.post('/api/transacciones', (req, res) => {
    const db = require('./database').getDb();
    
    const { tipo, monto, categoria, descripcion, canal_origen } = req.body;

    // Validación básica de campos requeridos
    if (!tipo || !monto || !categoria || !canal_origen) {
        return res.status(400).json({ 
            error: 'Faltan campos obligatorios', 
            missingFields: ['tipo', 'monto', 'categoria', 'canal_origen'].filter(field => !(req.body[field] !== undefined && req.body[field] !== null)) 
        });
    }

    const insertQuery = `
        INSERT INTO transacciones (tipo, monto, categoria, descripcion, canal_origen)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [tipo, parseFloat(monto), categoria, descripcion || null, canal_origen], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Devolver el ID de la transacción insertada
        const newTransaction = {
            id: this.lastID,
            tipo,
            monto,
            categoria,
            descripcion: descripcion || null,
            canal_origen,
            fecha_registro: new Date().toISOString()
        };

        res.status(201).json(newTransaction);
    });
});

// Endpoint GET - Obtener transacción por ID (opcional pero útil)
app.get('/api/transacciones/:id', (req, res) => {
    const db = require('./database').getDb();
    const id = parseInt(req.params.id);

    db.get(`SELECT * FROM transacciones WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }

        const formattedTransaction = {
            id: row.id,
            tipo: row.tipo,
            monto: row.monto,
            categoria: row.categoria,
            descripcion: row.descripcion || null,
            canal_origen: row.canal_origen,
            fecha_registro: new Date(row.fecha_registro).toISOString()
        };

        res.json(formattedTransaction);
    });
});

// Endpoint DELETE - Eliminar transacción por ID (opcional)
app.delete('/api/transacciones/:id', (req, res) => {
    const db = require('./database').getDb();
    const id = parseInt(req.params.id);

    db.run(`DELETE FROM transacciones WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }

        res.json({ message: `Transacción ${id} eliminada correctamente` });
    });
});

// Iniciar servidor en puerto 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de control financiero activo en http://localhost:${PORT}`);
    console.log('✅ Endpoints disponibles:');
    console.log('   GET  /api/transacciones - Obtener todas las transacciones');
    console.log('   POST /api/transacciones - Crear nueva transacción');
    console.log('   GET  /api/transacciones/:id - Obtener transacción por ID');
    console.log('   DELETE /api/transacciones/:id - Eliminar transacción');
});

module.exports = app;
