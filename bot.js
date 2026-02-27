import makeWASocket, { DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import QRCode from 'qrcode'
import cron from 'node-cron'
import P from 'pino'
import 'dotenv/config'
import ical from "node-ical"
import { format, addDays, isSameDay, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import fs from 'fs'
import sharp from 'sharp'

async function downloadImagemFigurinha(sock, msg) {
  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
      reuploadRequired: false
    })
    return buffer
  } catch (err) {
    console.log('Não foi possível baixar a mídia:', err.message)
    return null
  }
}

async function processarMidiaComoSticker(sock, from, msg) {
  const buffer = await downloadImagemFigurinha(sock, msg)
  if (!buffer) {
    await sock.sendMessage(from, { text: 'Não consegui processar essa foto' })
    return
  }

  try {
    const stickerBuffer = await sharp(buffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .webp({ quality: 80 })
      .toBuffer()

    await sock.sendMessage(from, { sticker: stickerBuffer })
  
  } catch (err) {
    console.log('Problema ao converter: ' + err.message)
    await sock.sendMessage(from, { text: 'Falhei na conversão ( ﾉ ﾟｰﾟ)ﾉ, tenta ai novamente' })
  }
}

async function verificaAgendaAva(marcarPessoasGrupo, sock, from) {
    const urlMoodle = process.env.CALENDARIO_MOODLE_API
    const eventos = await ical.async.fromURL(urlMoodle)
    const timeZone = "America/Sao_Paulo"
    const hoje = startOfDay(toZonedTime(new Date(), timeZone))
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

        const dataPrazo = startOfDay(toZonedTime(new Date(ev.start), timeZone))

        console.log(ev)
        if (isSameDay(dataPrazo, hoje)) {
            eventosHoje += `*${ev.summary}* às *${format(toZonedTime(new Date(ev.start), timeZone), "HH:mm")}*\n\n`
        } else if (isSameDay(dataPrazo, lembreteAmanha)) {
            eventosAmanha += `*${ev.summary}* - *${format(toZonedTime(new Date(ev.start), timeZone), "HH:mm")}*\n\n`
        } else if (isSameDay(dataPrazo, lembrete2dias)) {
            eventos2dias += `*${ev.summary}* - *${format(toZonedTime(new Date(ev.start), timeZone), "HH:mm")}*\n\n`
        } else if (isSameDay(dataPrazo, lembrete3dias)) {
            eventos3dias += `*${ev.summary}* - *${format(toZonedTime(new Date(ev.start), timeZone), "HH:mm")}*\n\n`
        }
    }

    let mensagemFinal = `*LEMBRETE ADS 3°P*\n*${format(hoje, "dd/MM", { locale: ptBR })} a ${format(lembrete3dias, "dd/MM", { locale: ptBR })}*\n\n`

    mensagemFinal += `*Hoje - ${format(hoje, "dd/MM", { locale: ptBR })}*\n`
    mensagemFinal += eventosHoje ? eventosHoje : "Sem eventos\n"

    mensagemFinal += `\n*${format(lembreteAmanha, "EEEE", { locale: ptBR })}  - ${format(lembreteAmanha, "dd/MM", { locale: ptBR })}*\n`
    mensagemFinal += eventosAmanha ? eventosAmanha : "Sem eventos\n"

    mensagemFinal += `\n*${format(lembrete2dias, "EEEE", { locale: ptBR })}  - ${format(lembrete2dias, "dd/MM", { locale: ptBR })}*\n`
    mensagemFinal += eventos2dias ? eventos2dias : "Sem eventos\n"

    mensagemFinal += `\n*${format(lembrete3dias, "EEEE", { locale: ptBR })}  - ${format(lembrete3dias, "dd/MM", { locale: ptBR })}*\n`
    mensagemFinal += eventos3dias ? eventos3dias : "Sem eventos\n"

    mensagemFinal += "\n\nMensagem automática, considere verificar o AVA em https://ava.iftm.edu.br/my/"

    const semEventos = !eventosHoje && !eventosAmanha && !eventos2dias && !eventos3dias

    if (semEventos) {
      return
    }

    await sock.sendMessage(from, { text: mensagemFinal, mentions: marcarPessoasGrupo })
  }

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./baileys-auth')
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' })
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n==================== NOVO QRCODE ====================')
      console.log('Se estiver no Railway, copie o data URL abaixo.')
      console.log('Cole em: https://codebeautify.org/base64-to-image-converter')
      console.log('=====================================================\n')

      qrcode.generate(qr, { small: true })

      QRCode.toDataURL(qr)
        .then((url) => {
          console.log('=== INICIO QRCODE ===')
          console.log(url)
          console.log('=== FIM QRCODE ===\n')
        })
        .catch((err) => console.log('ERRO ao gerar QR:', err.message))
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log('Conexao fechada. statusCode:', statusCode)

      if (statusCode === 405) {
        console.log('Status 405: limpando credenciais para novo QR...')
        try {
          if (fs.existsSync('./baileys-auth')) {
            fs.rmSync('./baileys-auth', { recursive: true, force: true })
          }
        } catch (err) {
          console.log('Falha ao limpar credenciais:', err.message)
        }
      }

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconectando em 2s...')
        setTimeout(start, 2000)
      } else {
        console.log('Sessao expirada. Precisa re-autenticar.')
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    const temImagem = msg.message.imageMessage || msg.message.videoMessage
    const caption = msg.message.imageMessage?.caption || ''
    

    if (temImagem &&  (caption === '!figurinha' || caption.includes('!figurinha'))) {
      await processarMidiaComoSticker(sock, from, msg)

            setTimeout(async () => {
        await sock.sendMessage(from, { text: 'Ta na mão ƪ(˘⌣˘)ʃ' })
      }, 1900);

    } else if (body == '!lembrete') {

      const meta = await sock.groupMetadata(from)
      const mentions = meta.participants.map(p => p.id)
      await verificaAgendaAva(mentions, sock, from)

    } else if(body == "!comandos"){
        await sock.sendMessage(from, { text: `!lembrete  envia os lembretes de prazos do AVA\n\n!figurinha  faz a figurinha com a foto enviada (envie !figurinha como legenda)\n\n!comandos  envia essa mensagem` })
    }
  })

 
    cron.schedule("00 10 * * *", async () => {
        const grupoId = process.env.ID_GRUPO_SALA

        const meta = await sock.groupMetadata(grupoId)
        const mentions = meta.participants.map(p => p.id)
        await verificaAgendaAva(mentions, sock, grupoId)

    }, { timezone: "America/Sao_Paulo" })
}

start()