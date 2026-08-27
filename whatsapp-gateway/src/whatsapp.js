/* eslint-disable react-hooks/rules-of-hooks */
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import logger from '@whiskeysockets/baileys/lib/Utils/logger.js';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

logger.level = 'error';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let socket = null;
let isConnected = false;
let isResetting = false;
let activeQrCode = null;

export function getAuthPath() {
  return process.env.WHATSAPP_AUTH_DIR
    ? path.resolve(process.env.WHATSAPP_AUTH_DIR)
    : path.join(__dirname, '../auth_info_baileys');
}

export function isManuallyDisconnected() {
  const markerPath = path.join(getAuthPath(), '.disconnected');
  return fs.existsSync(markerPath);
}

export function setManuallyDisconnected(value) {
  const authPath = getAuthPath();
  const markerPath = path.join(authPath, '.disconnected');
  if (value) {
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }
    fs.writeFileSync(markerPath, 'true');
  } else {
    if (fs.existsSync(markerPath)) {
      fs.unlinkSync(markerPath);
    }
  }
}

export function getWhatsAppSocket() {
  return isConnected ? socket : null;
}

export function getActiveQrCode() {
  return activeQrCode;
}

export async function connectToWhatsApp() {
  setManuallyDisconnected(false);
  const authPath = getAuthPath();
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }), // Suppress Baileys verbose logs
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      activeQrCode = qr;
      console.log(`[${new Date().toLocaleTimeString()}] Novo QR gerado`);

      const qrPath = path.join(__dirname, '../whatsapp-qr.png');
      QRCode.toFile(qrPath, qr, (err) => {
        if (err) console.error('Erro ao gerar imagem do QR Code:', err);
        else console.log(`Imagem do QR Code salva com sucesso em: ${qrPath}`);
      });
    }

    if (connection === 'connecting') {
      isConnected = false;
      console.log('WhatsApp connection state: connecting');
    } else if (connection === 'open') {
      isConnected = true;
      activeQrCode = null;
      console.log('WhatsApp connection state: connected');
    } else if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.status || 'desconhecido';
      const errorMessage = lastDisconnect?.error?.message || (lastDisconnect?.error ? 'Erro na conexão' : 'sem detalhes');
      console.log(`WhatsApp connection state: disconnected (StatusCode: ${statusCode}, Erro: ${errorMessage})`);
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect && !isResetting && !isManuallyDisconnected()) {
        console.log('Attempting to reconnect...');
        connectToWhatsApp();
      } else {
        console.log('Connection closed. Logged out, resetting, or manually disconnected.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      if (update.update && typeof update.update.status === 'number') {
        console.log(`[Message Update] Message ID ${update.key.id} status changed to ${update.update.status}`);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      if (msg.key.fromMe) {
        console.log('[WhatsApp Gateway] Ignorando mensagem enviada por mim (fromMe).');
        continue;
      }

      let jid = msg.key.remoteJid || '';
      if (jid.endsWith('@lid') && msg.key.remoteJidAlt) {
        jid = msg.key.remoteJidAlt;
      }

      if (jid.endsWith('@g.us')) {
        console.log('[WhatsApp Gateway] Ignorando mensagem de grupo.');
        continue;
      }

      const text = msg.message?.conversation ||
                   msg.message?.extendedTextMessage?.text ||
                   '';

      if (!text.trim()) {
        console.log('[WhatsApp Gateway] Ignorando mensagem sem conteúdo de texto.');
        continue;
      }

      const cleanPhone = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
      const supabaseUrl = process.env.SUPABASE_URL || 'https://jhpuyflyddxwnxrbqiso.supabase.co';
      const gatewaySecret = process.env.GATEWAY_SECRET;

      const maskedPhone = `${cleanPhone.slice(0, 4)}*****${cleanPhone.slice(-4)}`;

      try {
        const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8CLG692ICd0Iu3S-kkYZ_g_45STMGTT';
        const response = await fetch(`${supabaseUrl}/functions/v1/identify-whatsapp-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'x-gateway-secret': gatewaySecret || ''
          },
          body: JSON.stringify({ phone: cleanPhone })
        });

        if (!response.ok) {
          console.error(`[WhatsApp Gateway] Erro ao identificar remetente no Supabase. Status: ${response.status}`);
          continue;
        }

        const data = await response.json();

        console.log(`[WhatsApp Agent Received]
- Telefone: ${maskedPhone}
- User ID: ${data.user_id || 'Não encontrado'}
- Google Integrado: ${data.has_google_integration ? 'Sim' : 'Não'}
- Mensagem: "${text.trim()}"`);

        if (data.user_id) {
          const agentResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-agent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'x-gateway-secret': gatewaySecret || ''
            },
            body: JSON.stringify({ userId: data.user_id, text: text })
          });

          if (!agentResponse.ok) {
            console.error(`[WhatsApp Gateway] Erro ao invocar whatsapp-agent. Status: ${agentResponse.status}`);
            continue;
          }

          const agentData = await agentResponse.json();
          if (agentData.responseText) {
            const targetJid = data.whatsapp_number ? `${data.whatsapp_number}@s.whatsapp.net` : jid;
            await sock.sendMessage(targetJid, { text: agentData.responseText });
            console.log(`[WhatsApp Agent Sent] Mensagem enviada para ${targetJid}: "${agentData.responseText.replace(/\n/g, ' ')}"`);
          }
        }

      } catch (err) {
        console.error('[WhatsApp Gateway] Erro ao chamar Edge Function:', err.message || err);
      }
    }
  });

  socket = sock;
  return sock;
}

export async function resetWhatsAppSession() {
  console.log('Resetting WhatsApp session...');
  isResetting = true;
  activeQrCode = null;

  if (socket) {
    try {
      if (isConnected) {
        await socket.logout();
      }
    } catch (err) {
      console.error('Error during Baileys socket.logout():', err?.message || 'Erro desconhecido');
    }
    try {
      socket.end();
    } catch (err) {
      // ignore
    }
  }

  socket = null;
  isConnected = false;

  const authPath = process.env.WHATSAPP_AUTH_DIR
    ? path.resolve(process.env.WHATSAPP_AUTH_DIR)
    : path.join(__dirname, '../auth_info_baileys');

  if (fs.existsSync(authPath)) {
    try {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log(`Directory ${authPath} cleared successfully.`);
    } catch (err) {
      console.error('Error clearing auth directory:', err?.message || 'Erro desconhecido');
    }
  }

  const qrPath = path.join(__dirname, '../whatsapp-qr.png');
  if (fs.existsSync(qrPath)) {
    try {
      fs.unlinkSync(qrPath);
      console.log('Current QR image removed.');
    } catch (err) {
      // ignore
    }
  }

  isResetting = false;
  console.log('Starting new WhatsApp connection...');
  await connectToWhatsApp();
}

export async function disconnectWhatsAppSession() {
  console.log('Disconnecting WhatsApp session completely...');
  setManuallyDisconnected(true);
  activeQrCode = null;

  if (socket) {
    try {
      if (isConnected) {
        await socket.logout();
      }
    } catch (err) {
      console.error('Error during Baileys socket.logout():', err?.message || 'Erro desconhecido');
    }
    try {
      socket.end();
    } catch (err) {
      // ignore
    }
  }

  socket = null;
  isConnected = false;

  const authPath = getAuthPath();

  if (fs.existsSync(authPath)) {
    try {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log(`Directory ${authPath} cleared successfully.`);
    } catch (err) {
      console.error('Error clearing auth directory:', err?.message || 'Erro desconhecido');
    }
  }

  // Restore directory and write the .disconnected flag back
  setManuallyDisconnected(true);

  const qrPath = path.join(__dirname, '../whatsapp-qr.png');
  if (fs.existsSync(qrPath)) {
    try {
      fs.unlinkSync(qrPath);
      console.log('Current QR image removed.');
    } catch (err) {
      // ignore
    }
  }

  console.log('WhatsApp connection terminated and offline state persisted.');
}
