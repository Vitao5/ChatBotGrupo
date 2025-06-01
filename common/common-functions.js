import 'dotenv/config';

export const integrantesGrupo = (async (client, chat, message)=>{

        const chats = await client.getChats();
        const groupChats = chats.filter(chat => chat.isGroup === true);
        const gruoupClass = groupChats.filter(chat => chat.id._serialized === process.env.ID_GRUPO_SALA);
        const usersGroups = gruoupClass[0].participants;
        const users = usersGroups.map(user => user.id._serialized)

        let marcarPessoas = ''
        users.forEach(element => {
            marcarPessoas += `@${element.split('@')[0]} `
        });
        
        setTimeout(() => {
            message.reply(`@${message.author.split('@')[0]} ${marcarPessoas}`, undefined, {
                mentions: users
            });
        }, 2500);
})