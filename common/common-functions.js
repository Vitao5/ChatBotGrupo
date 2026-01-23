export const integrantesGrupo = ( chat, message) => {
    const grupoPermitido = process.env.ID_GRUPO_SALA;
    const numeroBot = process.env.NUMERO_BOT;
    
    if (!chat?.isGroup || chat.id._serialized !== grupoPermitido) return [];
    
    const numeroAutor = (message.author || message.from || '').split('@')[0] || '';
    return (chat.participants || []).map(p => p?.id?._serialized).filter(id => id && id.split('@')[0] !== numeroBot && id.split('@')[0] !== numeroAutor);
};