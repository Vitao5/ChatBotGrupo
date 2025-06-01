import 'dotenv/config';

export const integrantesGrupo = (async (client, chat, message)=>{

        const chats = await client.getChats();
        const groupChats = chats.filter(chat => chat.isGroup === true);
        const gruoupClass = groupChats.filter(chat => chat.id._serialized === process.env.ID_GRUPO_SALA);
        const usersGroups = gruoupClass[0].participants;
        let usuarios = usersGroups.map(user => user.id._serialized)

        let marcarPessoas = ''
        usuarios.forEach(element => {
            if(element.split('@')[0] != process.env.NUMERO_BOT && element.split('@')[0] != message.author.split('@')[0]){
               marcarPessoas += `@${element.split('@')[0]} `
            }
            
        });

        usuarios = usuarios.filter(item => item !== process.env.NUMERO_BOT + '@c.us');

        setTimeout(() => {
            message.reply(`@${message.author.split('@')[0]} ${marcarPessoas}`, undefined, {
                mentions: usuarios
            });
        }, 2500);
})