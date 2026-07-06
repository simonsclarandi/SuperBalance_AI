const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const { getDb } = require('./database');

// Cargar variables de entorno
dotenv.config();

// Inicializar cliente de Telegram (modo polling)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true
});

// Configurar OpenAI para usar OpenRouter
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: 'https://openrouter.ai/api/v1'
});

// Sistema de prompts y respuestas del bot
async function procesarMensaje(mensaje) {
    try {
        // Enviar mensaje a LLM para extracción estructurada
        const response = await openai.chat.completions.create({
            model: 'meta-llama/llama-3-8b-instruct',
            messages: [
                {
                    role: 'system',
                    content: "Eres un analista financiero. El usuario te dirá un gasto o ingreso. Extrae la información y responde ÚNICAMENTE con un JSON puro con este formato exacto: {\"tipo\": \"ingreso\" | \"egreso\", \"monto\": numero, \"categoria\": \"string\", \"descripcion\": \"string\"}. No añadas markdown, ni texto extra."
                },
                {
                    role: 'user',
                    content: mensaje.text || ''
                }
            ],
            temperature: 0.1 // Baja temperatura para respuestas más consistentes y estructuradas
        });

        const llmResponse = response.choices[0].message.content;
        
        // Intentar parsear la respuesta como JSON
        let transaccionData;
        try {
            transaccionData = JSON.parse(llmResponse);
            
            // Validar que los campos requeridos existan
            if (!transaccionData.tipo || !transaccionData.monto) {
                throw new Error('Respuesta del LLM no tiene formato válido');
            }

        } catch (parseError) {
            console.error('Error al parsear respuesta JSON:', parseError.message);
            return null; // Retornar null para indicar error de parsing
        }

        // Insertar en base de datos SQLite con canal_origen = 'telegram'
        const db = getDb();
        
        const insertQuery = `
            INSERT INTO transacciones (tipo, monto, categoria, descripcion, canal_origen)
            VALUES (?, ?, ?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
            db.run(insertQuery, [
                transaccionData.tipo === 'ingreso' || transaccionData.tipo.toLowerCase() === 'entrada' ? 'ingreso' : 
                   (transaccionData.tipo === 'egreso' || transaccionData.tipo.toLowerCase() === 'salida' ? 'egreso' : transaccionData.tipo),
                parseFloat(transaccionData.monto),
                transaccionData.categoria,
                transaccionData.descripcion || null,
                'telegram'
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        // Construir mensaje de confirmación para Telegram
        const tipoTexto = transaccionData.tipo === 'ingreso' ? 'Ingreso' : 
                         transaccionData.tipo === 'egreso' ? 'Egreso' : transaccionData.tipo;
        
        return {
            success: true,
            message: `✅ ${tipoTexto} de $${transaccionData.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} registrado en categoría "${transaccionData.categoria}".` + 
                     (transaccionData.descripcion ? `\n📝 Detalles: ${transaccionData.descripcion}` : '')
        };

    } catch (error) {
        console.error('Error procesando mensaje:', error.message);
        
        // Responder con mensaje de error genérico si la IA falla o el usuario envía algo incomprensible
        return {
            success: false,
            message: `❌ Hubo un problema al registrar tu transacción. Por favor intenta nuevamente.` + 
                     (error.message ? `\n${error.message}` : '')
        };
    }
}

// Escuchar mensajes entrantes de Telegram
bot.on('message', async (msg) => {
    // Ignorar comandos /start, etc.
    if (!msg.text || msg.text.startsWith('/')) return;

    console.log(`📩 Mensaje recibido del usuario ${msg.from?.username || msg.chat.first_name}: "${msg.text}"`);

    const resultado = await procesarMensaje(msg);

    // Responder al usuario en Telegram
    bot.sendMessage(
        msg.chat.id, 
        resultado.message, 
        { parse_mode: 'Markdown' }
    );
});

// Manejar errores del bot
bot.on('error', (err) => {
    console.error(`❌ Error en el bot de Telegram: ${err.message}`);
});

console.log('🤖 Bot de Telegram inicializado y escuchando mensajes...');
