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
        headless: true, // true para não abrir o navegador, false para abrir (bom para depurar)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ]
    }
});


client.on('qr', qr => {
    qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente está pronto! Conectado ao WhatsApp.');
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso! Sua sessão foi carregada.');
});


client.on('disconnected', reason => {
    console.log('CLIENTE DESCONECTADO:', reason);
    console.log('Tentando reinicializar...');
    client.initialize().catch(err => console.error('Erro ao reinicializar:', err));
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    const comandos = [
        { comando: '/todos', funcao: () => integrantesGrupo(client, chat, message) },
        {
            comando: '/ajuda', funcao: () => {
                message.reply(`
        📌 *Meus comandos*
        🚨 Mencionar todos os integrantes do grupo:
        /todos

        ✨ Ver comandos disponíveis:
        /ajuda`
                );
            }
        },
    ];

    await chat.sendStateTyping();
    comandos.find(item => item.comando === message.body).funcao()

});

client.initialize()

// Tratamento para encerrar o cliente corretamente ao receber sinais do sistema
process.on('SIGTERM', async () => {
    console.log('(SIGTERM) Encerrando o cliente...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('(SIGINT) Encerrando o cliente...');
    await client.destroy();
    process.exit(0);
});