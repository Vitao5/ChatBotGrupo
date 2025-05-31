import pkg from 'whatsapp-web.js';
import 'dotenv/config'; 
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode'


const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-clinica-pessini',
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        //false, ele abre o navegador para escanear o QR Code
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});


client.on('qr', (qr) => {
    console.log('QR Code recebido. Gerando Data URL...');
    // 'qr' é a string que representa o QR Code
    qrcode.toDataURL(qr, { errorCorrectionLevel: 'H' }, (err, url) => {
        if (err) {
            console.error('Erro ao gerar QR Code como Data URL:', err);
            return;
        }
        // 'url' é a string do Data URL (formato base64)
        if (url) {
            console.log('QR Code em formato Data URL (Base64):');
            console.log(url);
            console.log('\nVocê pode colar este URL em um navegador para ver o QR Code.');
        } else {
            console.log('QR Code Data URL não gerado ou está vazio.');
        }
    });
});

//conexão com o WhatsApp Web
client.on('ready', () => {
    console.log('Cliente pronto! WhatsApp conectado.');
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso!');
});

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

client.on('auth_failure', msg => {
    console.error('Falha na autenticação', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado', reason);
    console.log('Cliente desconectado. Por favor, reinicie o bot manualmente ou via PM2.');
});
// fim conexão com Whatsapp e tratamento de sessão

client.on('message', async (message) => {
    console.log('Mensagem recebida:', message.body);

    // Aqui você pode adicionar lógica para processar a mensagem recebida
    // Por exemplo, responder com uma mensagem automática
    if (message.body.toLowerCase() === 'olá') {
        await message.reply('Olá! Como posso ajudar você hoje?');
    } else {
        await message.reply('Desculpe, não entendi sua mensagem.');
    }
});

client.initialize();