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
