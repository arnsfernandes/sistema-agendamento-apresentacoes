/* eslint-disable react-hooks/rules-of-hooks */
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let socket = null;
let isConnected = false;

export function getWhatsAppSocket() {
  return isConnected ? socket : null;
}

export async function connectToWhatsApp() {
  const authPath = process.env.WHATSAPP_AUTH_DIR
    ? path.resolve(process.env.WHATSAPP_AUTH_DIR)
    : path.join(__dirname, '../auth_info_baileys');
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }), // Suppress Baileys verbose logs
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n--- WhatsApp QR Code ---');
      qrcode.generate(qr, { small: true });
      console.log('Por favor, escaneie o código acima usando o WhatsApp no seu celular.');

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
      console.log('WhatsApp connection state: connected');
    } else if (connection === 'close') {
      isConnected = false;
      console.log('WhatsApp connection state: disconnected');
      
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('Attempting to reconnect...');
        connectToWhatsApp();
      } else {
        console.log('Connection closed. Logged out.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  socket = sock;
  return sock;
}
