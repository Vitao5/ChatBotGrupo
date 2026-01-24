import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import cron from 'node-cron'
import P from 'pino'
import 'dotenv/config'
import ical from "node-ical"
import { format, addDays, isSameDay, isWithinInterval } from "date-fns"
import { ptBR } from "date-fns/locale"

async function verificaAgendaAva(marcarPessoasGrupo, sock, from) {
    const urlMoodle = process.env.CALENDARIO_MOODLE_API
    const eventos = await ical.async.fromURL(urlMoodle)
    const hoje = new Date()
    const lembreteAmanha = addDays(hoje, 1)
    const lembrete2dias = addDays(hoje, 2)
    const lembrete3dias = addDays(hoje, 3)

    let eventosHoje = ""
    let eventosAmanha = ""
    let eventos2dias = ""
    let eventos3dias = ""

    for (let k in eventos) {
        const ev = eventos[k]
        if (ev.type !== "VEVENT") continue

        const dataPrazo = new Date(ev.start)

        if (isSameDay(dataPrazo, hoje)) {
            eventosHoje += `*${ev.summary}* às *${format(dataPrazo, "HH:mm")}*\n`
        } else if (isSameDay(dataPrazo, lembreteAmanha)) {
            eventosAmanha += `*${ev.summary}* - *${format(dataPrazo, "dd/MM HH:mm")}*\n`
        } else if (isSameDay(dataPrazo, lembrete2dias)) {
            eventos2dias += `*${ev.summary}* - *${format(dataPrazo, "dd/MM HH:mm")}*\n`
        } else if (isSameDay(dataPrazo, lembrete3dias)) {
            eventos3dias += `*${ev.summary}* - *${format(dataPrazo, "dd/MM HH:mm")}*\n`
        }
    }

    let mensagemFinal = `*LEMBRETE TECH  - ${format(hoje, "dd/MM", { locale: ptBR })} - ${format(lembrete3dias, "dd/MM", { locale: ptBR })}*\n\n`

    mensagemFinal += "*HOJE* 🔺\n"
    mensagemFinal += eventosHoje ? eventosHoje : "Nenhum evento hoje.\n"

    mensagemFinal += "\n*AMANHÃ:*\n"
    mensagemFinal += eventosAmanha ? eventosAmanha : "Nenhum evento amanhã.\n"

    mensagemFinal += "\n*EM 2 DIAS:*\n"
    mensagemFinal += eventos2dias ? eventos2dias : "Nenhum evento em 2 dias.\n"

    mensagemFinal += "\n*EM 3 DIAS:*\n"
    mensagemFinal += eventos3dias ? eventos3dias : "Nenhum evento em 3 dias.\n"

    mensagemFinal += "\n\n*Mensagem automática, considere verificar o AVA*"

    console.log(mensagemFinal)
    setTimeout(async () => {
          await sock.sendMessage(from, { text: mensagemFinal, mentions: marcarPessoasGrupo })
    }, 1000);
  }

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./baileys-auth')
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, 
    logger: P({ level: 'silent' })
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true })
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) start()
      else console.log('sessão expirada')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const body = msg.message.conversation|| msg.message.extendedTextMessage?.text || ''

    if (body === '!lembrete' && from.endsWith('@g.us')) {
      const meta = await sock.groupMetadata(from)
      const mentions = meta.participants.map(p => p.id)
     
      await verificaAgendaAva(mentions, sock, from)
    }
  })

 
    cron.schedule("30 09 * * *", async () => {
        console.log('CRON EXECUTANDO')
        const grupoId = process.env.ID_GRUPO_SALA

        const meta = await sock.groupMetadata(grupoId)
        const mentions = meta.participants.map(p => p.id)
        await verificaAgendaAva(mentions, sock, grupoId)

    }, { timezone: "America/Sao_Paulo" })
}

start()