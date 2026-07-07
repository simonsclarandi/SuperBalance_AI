require('./bot.js'); 
const express = require('express');
const cors = require('cors');
const db = require('./database'); 

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/transacciones', async (req, res) => {
    try {
        const query = 'SELECT * FROM transacciones ORDER BY fecha_registro DESC';
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener transacciones:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transacciones', async (req, res) => {
    try {
        const { tipo, monto, categoria, descripcion, canal_origen } = req.body;
        const insertQuery = `
            INSERT INTO transacciones (tipo, monto, categoria, descripcion, canal_origen)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `;
        const result = await db.query(insertQuery, [tipo, monto, categoria, descripcion, canal_origen || 'dashboard_web']);
        res.json({ id: result.rows[0].id, message: 'Transacción registrada' });
    } catch (err) {
        console.error('Error al insertar:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});