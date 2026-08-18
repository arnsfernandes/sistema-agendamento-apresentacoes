import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToWhatsApp, getWhatsAppSocket, resetWhatsAppSession, getActiveQrCode, isManuallyDisconnected, disconnectWhatsAppSession } from './whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// QR Code route
app.get('/qr', (req, res) => {
  // Authorization check (support header or query param)
  const apiKey = req.headers['x-api-key'] || req.query.key;
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }

  const qrPath = path.join(__dirname, '../whatsapp-qr.png');

  if (!fs.existsSync(qrPath)) {
    return res.status(404).json({ error: 'QR Code não disponível (aparelho já pode estar conectado ou nenhum QR foi gerado ainda).' });
  }

  return res.sendFile(qrPath);
});

// Pair device HTML route
app.get('/pair', (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).send('Acesso não autorizado. Chave de API ausente ou inválida.');
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Gateway - Pareamento</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          background: white;
          padding: 2.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        h1 {
          color: #00a884;
          font-size: 1.8rem;
          margin-bottom: 1rem;
        }
        .status {
          font-weight: bold;
          margin-bottom: 1.5rem;
          padding: 8px 12px;
          border-radius: 4px;
        }
        .status.connected {
          background-color: #d1e7dd;
          color: #0f5132;
        }
        .status.disconnected {
          background-color: #f8d7da;
          color: #842029;
        }
        img {
          max-width: 250px;
          border: 1px solid #ccc;
          padding: 10px;
          background: white;
          margin: 1rem 0;
        }
        .info {
          font-size: 0.9rem;
          color: #667781;
          margin-top: 1rem;
        }
      </style>
      <script>
        async function checkStatus() {
          try {
            const qrRes = await fetch('/qr?key=${apiKey}', { method: 'HEAD' });
            const statusEl = document.getElementById('status');
            const qrContainer = document.getElementById('qr-container');

            if (qrRes.status === 200) {
              statusEl.className = 'status disconnected';
              statusEl.innerText = 'Desconectado - Escaneie o QR Code';
              document.getElementById('qr-img').src = '/qr?key=${apiKey}&t=' + new Date().getTime();
              qrContainer.style.display = 'block';
            } else {
              statusEl.className = 'status connected';
              statusEl.innerText = 'Conectado com Sucesso!';
              qrContainer.style.display = 'none';
            }
          } catch (err) {
            console.error(err);
          }
        }
        
        setInterval(checkStatus, 3000);
        window.onload = checkStatus;
      </script>
    </head>
    <body>
      <div class="container">
        <h1>Meety WhatsApp Gateway</h1>
        <div id="status" class="status disconnected">Verificando conexão...</div>
        <div id="qr-container" style="display: none;">
          <img id="qr-img" src="" alt="WhatsApp QR Code">
          <p class="info">Abra o WhatsApp > Aparelhos Conectados > Conectar um Aparelho</p>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// Send message endpoint
app.post('/send-message', async (req, res) => {
  // Authorization check (support header or query param)
  const apiKey = req.headers['x-api-key'] || req.query.key;
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
    // Check if the number exists on WhatsApp and get the correct JID
    const jidCheck = await socket.onWhatsApp(number);
    if (!jidCheck || jidCheck.length === 0 || !jidCheck[0].exists) {
      return res.status(404).json({ error: 'O número informado não está cadastrado no WhatsApp.' });
    }
    const targetJid = jidCheck[0].jid;

    const sent = await socket.sendMessage(targetJid, { text: text.trim() });
    const messageId = sent?.key?.id;
    console.log(`[Send Message] Mensagem enviada com sucesso. ID: ${messageId}`);
    
    return res.json({
      success: true,
      messageId: messageId
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err?.message || 'Erro desconhecido');
    return res.status(500).json({ error: 'Erro interno ao enviar a mensagem pelo WhatsApp.' });
  }
});

// GET /status administrative route
app.get('/status', (req, res) => {
  // Authorization check (header only)
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }

  const socket = getWhatsAppSocket();
  
  if (!socket || !socket.user) {
    return res.json({
      connected: false,
      number: null,
      name: null
    });
  }

  const jid = socket.user.id || '';
  // Parse clean number from JID (e.g. 5515981360306@s.whatsapp.net or 5515981360306:2@s.whatsapp.net)
  const number = jid ? jid.split('@')[0].split(':')[0] : null;
  const name = socket.user.name || null;

  return res.json({
    connected: true,
    number: number,
    name: name
  });
});

// POST /logout administrative route
app.post('/logout', async (req, res) => {
  // Authorization check (header only)
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }

  try {
    await resetWhatsAppSession();
    return res.json({
      success: true,
      message: 'Sessão deslogada e credenciais locais limpas com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao deslogar sessão:', err?.message || 'Erro desconhecido');
    return res.status(500).json({ error: 'Erro interno ao realizar o logout.' });
  }
});

// POST /disconnect administrative route
app.post('/disconnect', async (req, res) => {
  // Authorization check (header only)
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }

  try {
    await disconnectWhatsAppSession();
    return res.json({
      success: true,
      message: 'Sessão deslogada e instância mantida offline com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao desconectar sessão:', err?.message || 'Erro desconhecido');
    return res.status(500).json({ error: 'Erro interno ao realizar a desconexão.' });
  }
});

// GET /qr-code administrative route
app.get('/qr-code', (req, res) => {
  // Authorization check (header only)
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.GATEWAY_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }

  const qr = getActiveQrCode();

  return res.json({
    available: !!qr,
    qr: qr || null
  });
});

app.listen(port, async () => {
  console.log(`WhatsApp Gateway listening on port ${port}`);
  if (isManuallyDisconnected()) {
    console.log('WhatsApp is manually disconnected. Staying offline.');
    return;
  }
  try {
    await connectToWhatsApp();
  } catch (err) {
    console.error('Failed to initialize WhatsApp connection:', err?.message || 'Erro desconhecido');
  }
});
