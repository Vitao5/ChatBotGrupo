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


client.on('qr', qr => {
    console.log('QR Code recebido. Gerando arquivo de imagem...');

    // Salva o QR Code como um arquivo PNG
    qrcode.toFile('qrcode.png', qr, {
        errorCorrectionLevel: 'H' // Nível de correção de erro (H é o mais alto)
    }, function (err) {
        if (err) {
            console.error('Erro ao gerar o QR Code como imagem:', err);
            return;
        }
        console.log('QR Code salvo com sucesso como qrcode.png. Por favor, escaneie este arquivo para conectar o WhatsApp.');
    });
});

client.on('ready', () => {
    console.log('Cliente está pronto! Conectado ao WhatsApp.');
    // Após conectar, você pode apagar o arquivo qrcode.png se desejar,
    // pois a sessão já está salva e não precisará mais do QR Code por enquanto.
    if (fs.existsSync('qrcode.png')) {
        fs.unlinkSync('qrcode.png');
        console.log('Arquivo qrcode.png removido após a conexão.');
    }
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso! Sua sessão foi carregada.');
});

client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
    // Em caso de falha, você pode querer tentar novamente ou reiniciar o cliente
});

client.on('disconnected', reason => {
    console.log('Cliente desconectado:', reason);
    // Se desconectar, pode ser necessário gerar um novo QR Code
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