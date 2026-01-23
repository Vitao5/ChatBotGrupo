import pkg from 'whatsapp-web.js';
import 'dotenv/config';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import {integrantesGrupo} from './common/common-functions.js';


const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-grupo',
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
        ],
        timeout: 60000
    }
});


client.on('qr', qr => {
    qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('bot ativo\n\n');
});


client.on('message', async (message) => {

    //verifica se a mensagem é do grupo da sala e e não é do proorio bot
    if (message.fromMe || message.id.remote != process.env.ID_GRUPO_SALA) return;

    try {
        const chat = await message.getChat();
        
        const comandos = [
            { 
                comando: '/todos', 
                funcao: async () => {
                    const mentions = integrantesGrupo(chat, message);
                    await message.reply('teste', undefined, { mentions, sendSeen: false });
                }
            }
        ];

        const comandoExecutar = comandos.find(item => item.comando === message.body);
        if (comandoExecutar) {
            await chat.sendStateTyping();
           setTimeout(async () => {
             await comandoExecutar.funcao();
           }, 1000);
        }
    } catch (error) {
        console.error(error.message);
    }
});

client.initialize().catch(err => {
    console.error('erro de inicialização', err);
    process.exit(1);
});

process.on('SIGTERM', async () => {
    await client.destroy();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await client.destroy();
    process.exit(0);
});