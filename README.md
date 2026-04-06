# ChatBot Grupo 🤖

Um bot do WhatsApp automatizado para gerenciar lembretes de calendário, converter imagens em stickers e enviar mensagens automáticas para grupos.

## 📋 Sobre o Projeto

Este projeto utiliza a biblioteca **Baileys** (uma implementação reverse-engineered do WhatsApp Web) para criar um chatbot que:

- **Sincroniza eventos do calendário** do AVA (Ambiente Virtual de Aprendizagem) IFTM
- **Envia lembretes automáticos** com eventos dos próximos dias
- **Converte imagens em stickers** do WhatsApp
- **Executa tarefas agendadas** usando cron jobs

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Baileys** - Biblioteca para WhatsApp
- **node-cron** - Agendador de tarefas
- **Sharp** - Processamento de imagens
- **node-ical** - Parser de calendários iCal
- **date-fns** - Manipulação de datas
- **Dotenv** - Gerenciador de variáveis de ambiente

## 📦 Instalação

1. **Clone ou baixe o projeto:**
```bash
git clone https://github.com/Vitao5/ChatBotGrupo.git
cd "ChatBot Grupo"
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp env-example .env
```

4. **Edite o arquivo `.env` com seus dados:**
```env
ID_GRUPO_SALA=seu_id_do_grupo
NUMERO_BOT=seu_numero_whatsapp
CALENDARIO_MOODLE_API=url_do_calendario_ica
```

## 🚀 Como Usar

### Iniciar o Bot

```bash
node bot.js
```

Na primeira execução, será exibido um **QR Code** no terminal. Escaneie com seu WhatsApp para autenticar o bot.

### Funcionalidades Principais

#### 1. **Verificar Agenda (Lembrete de Eventos)**
Envia automaticamente um lembrete com eventos dos próximos 3 dias:
- Eventos de hoje
- Eventos de amanhã
- Eventos em 2 dias
- Eventos em 3 dias

#### 2. **Converter Imagem em Sticker**
Envie uma imagem ao bot e ele converterá automaticamente em sticker:
- Redimensiona para 512x512px
- Formato WebP otimizado
- Suporta PNG, JPG e outras imagens

#### 3. **Mensagens Automáticas**
Configure agendamentos para enviar mensagens automáticas a grupos específicos em horários determinados.


## 📁 Estrutura de Diretórios

```
ChatBot Grupo/
├── bot.js                 # Arquivo principal do bot
├── package.json           # Dependências do projeto
├── env-example            # Exemplo de variáveis de ambiente
├── .env                   # Variáveis de ambiente (NÃO COMMITAR)
├── README.md              # Este arquivo
```

## ⚙️ Configuração Avançada

### Modificar Frequência de Lembretes

No arquivo `bot.js`, procure por `cron.schedule()` e altere o padrão:

```javascript
// Executar todo dia às 8:00 AM
cron.schedule('0 8 * * *', async () => {
    await verificaAgendaAva(marcarPessoasGrupo, sock, from)
})
```

### Adicionar Mais Grupos

Edite o arquivo e adicione novos IDs de grupos para os lembretes serem enviados.

## ⚠️ Avisos Importantes

- **Não compartilhe o arquivo `.env`** - contém dados sensíveis
- **Não commite a pasta `baileys-auth/`** - contém credenciais
- A pasta `baileys-auth/` é gerada automaticamente na primeira execução
- O bot usa sua conta do WhatsApp - não é uma conta bot oficial

## 🌐 Render Free + Persistência de Sessão

No plano free do Render, o sistema de arquivos e efêmero. Isso significa que a pasta `baileys-auth/` pode sumir em restart/deploy.

Para manter a sessão mesmo no Render Free, o projeto suporta sync externo via JSONBin:

1. Crie um bin no JSONBin e copie:
- `BIN_ID`
- `MASTER_KEY`

2. No Render, configure variáveis de ambiente:
- `JSONBIN_AUTH_SYNC=true`
- `JSONBIN_BIN_ID=<seu_bin_id>`
- `JSONBIN_API_KEY=<sua_master_key>`
- `FORCE_NEW_AUTH=true` apenas no primeiro deploy para gerar novo QR

3. Abra a URL do serviço:
- `/` mostra status da conexão
- `/qr` mostra o QR quando disponível

4. Após parear no WhatsApp, altere:
- `FORCE_NEW_AUTH=false`

Com isso, o bot restaura a sessão do JSONBin no boot e sincroniza credenciais automaticamente quando atualizam.


## 👥 Autores

- Victor
- Samuel

## 📄 Licença

ISC

---

**Última atualização:** Janeiro de 2026
