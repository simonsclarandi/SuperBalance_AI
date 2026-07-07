require('dotenv').config();
const TelegramBotRaw = require('node-telegram-bot-api');
// Parche de compatibilidad para Node 24+: Extraemos el constructor correctamente
const TelegramBot = TelegramBotRaw.default || TelegramBotRaw;
const { OpenAI } = require('openai');
const db = require('./database');

// Inicializar cliente de Telegram (modo polling)
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
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
            temperature: 0.1
        });

        const llmResponse = response.choices[0].message.content;
        
        // Intentar parsear la respuesta como JSON
        let transaccionData;
        try {
            transaccionData = JSON.parse(llmResponse);
            if (!transaccionData.tipo || !transaccionData.monto) {
                throw new Error('Respuesta del LLM no tiene formato válido');
            }
        } catch (parseError) {
            console.error('Error al parsear respuesta JSON:', parseError.message);
            return {
                success: false,
                message: "❌ No pude entender el mensaje financiero o la IA falló. Intenta ser más claro."
            };
        }

        // Insertar en Postgres usando $1, $2...
        const insertQuery = `
            INSERT INTO transacciones (tipo, monto, categoria, descripcion, canal_origen)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `;

        const dbResult = await db.query(insertQuery, [
            transaccionData.tipo.toLowerCase(),
            parseFloat(transaccionData.monto),
            transaccionData.categoria,
            transaccionData.descripcion || null,
            'telegram'
        ]);

        // Construir mensaje de confirmación
        const tipoTexto = transaccionData.tipo.toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso';
        
        return {
            success: true,
            message: `✅ ${tipoTexto} de $${transaccionData.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} registrado en categoría "${transaccionData.categoria}".` + 
                     (transaccionData.descripcion ? `\n📝 Detalles: ${transaccionData.descripcion}` : '')
        };

    } catch (error) {
        console.error('Error procesando mensaje:', error.message);
        return {
            success: false,
            message: `❌ Hubo un problema al registrar tu transacción.\n${error.message}`
        };
    }
}

// Escuchar mensajes entrantes de Telegram
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    console.log(`📩 Mensaje recibido de ${msg.from?.first_name}: "${msg.text}"`);

    const resultado = await procesarMensaje(msg);

    // Responder al usuario en Telegram
    bot.sendMessage(msg.chat.id, resultado.message);
});

console.log('🤖 Bot de Telegram inicializado y escuchando mensajes...');