import 'dotenv/config';
import express from 'express';
import { connectToWhatsApp, getWhatsAppSocket } from './whatsapp.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Send message endpoint
app.post('/send-message', async (req, res) => {
  // Authorization check
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }

  const { number, text } = req.body;

  // 1. Validate parameters
  if (!number || !text) {
    return res.status(400).json({ error: 'Parâmetros number e text são obrigatórios.' });
  }

  // 2. Validate Brazilian normalized number (starts with 55, followed by 10 or 11 digits)
  const numberRegex = /^55\d{10,11}$/;
  if (!numberRegex.test(number)) {
    return res.status(400).json({ error: 'Número de telefone inválido. Deve estar no formato normalizado: 55 + DDD + Número (ex: 5511999999999).' });
  }

  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'O texto da mensagem não pode estar vazio.' });
  }

  // 3. Get WhatsApp socket
  const socket = getWhatsAppSocket();
  if (!socket) {
    return res.status(503).json({ error: 'O gateway do WhatsApp não está conectado no momento. Tente novamente mais tarde.' });
  }

  try {
    const jid = `${number}@s.whatsapp.net`;
    const sent = await socket.sendMessage(jid, { text: text.trim() });
    
    return res.json({
      success: true,
      messageId: sent?.key?.id
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    return res.status(500).json({ error: 'Erro interno ao enviar a mensagem pelo WhatsApp.' });
  }
});

app.listen(port, async () => {
  console.log(`WhatsApp Gateway listening on port ${port}`);
  try {
    await connectToWhatsApp();
  } catch (err) {
    console.error('Failed to initialize WhatsApp connection:', err);
  }
});
