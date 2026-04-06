import makeWASocket, { useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys"
import qrcode from "qrcode-terminal"
import QRCode from "qrcode"
import cron from "node-cron"
import P from "pino"
import "dotenv/config"
import ical from "node-ical"
import { format, addDays, isSameDay, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import sharp from "sharp"
import http from "http"
import fs from "fs"
import path from "path"
import axios from "axios"

let qrCodeAtual = null
let statusConexao = "iniciando"
let ultimoErroConexao = null
let reconnectTimer = null
let authSyncTimer = null
let reconnectAttempts = 0
let cleanAuthAlreadyTried = false

function lerArquivosAuth(authPath) {
  if (!fs.existsSync(authPath)) return {}
  const files = fs.readdirSync(authPath, { withFileTypes: true })
  const data = {}

  for (const file of files) {
    if (!file.isFile()) continue
    const absolute = path.join(authPath, file.name)
    const content = fs.readFileSync(absolute)
    data[file.name] = content.toString("base64")
  }

  return data
}

function escreverArquivosAuth(authPath, filesMap) {
  fs.mkdirSync(authPath, { recursive: true })
  const names = Object.keys(filesMap || {})

  for (const name of names) {
    const absolute = path.join(authPath, name)
    fs.writeFileSync(absolute, Buffer.from(filesMap[name], "base64"))
  }
}

async function restaurarSessaoExterna(authPath) {
  const binId = process.env.JSONBIN_BIN_ID
  const apiKey = process.env.JSONBIN_API_KEY
  const enabled = process.env.JSONBIN_AUTH_SYNC === "true"

  if (!enabled || !binId || !apiKey) return

  try {
    const url = `https://api.jsonbin.io/v3/b/${binId}/latest`
    const response = await axios.get(url, {
      headers: {
        "X-Master-Key": apiKey,
      },
      timeout: 15000,
    })

    const filesMap = response.data?.record?.files || {}
    const hasFiles = Object.keys(filesMap).length > 0
    if (!hasFiles) return

    escreverArquivosAuth(authPath, filesMap)
    console.log("Sessão restaurada do JSONBin")
  } catch (err) {
    console.log("Falha ao restaurar sessão externa:", err.message)
  }
}

async function salvarSessaoExterna(authPath) {
  const binId = process.env.JSONBIN_BIN_ID
  const apiKey = process.env.JSONBIN_API_KEY
  const enabled = process.env.JSONBIN_AUTH_SYNC === "true"

  if (!enabled || !binId || !apiKey) return

  try {
    const files = lerArquivosAuth(authPath)
    const hasFiles = Object.keys(files).length > 0
    if (!hasFiles) return

    const url = `https://api.jsonbin.io/v3/b/${binId}`
    await axios.put(url, {
      files,
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
      },
      timeout: 15000,
    })

    console.log("Sessão sincronizada no JSONBin")
  } catch (err) {
    console.log("Falha ao sincronizar sessão externa:", err.message)
  }
}

function agendarSyncSessao(authPath) {
  if (authSyncTimer) clearTimeout(authSyncTimer)
  authSyncTimer = setTimeout(() => {
    authSyncTimer = null
    salvarSessaoExterna(authPath)
  }, 4000)
}

const server = http.createServer((req, res) => {
  const rota = req.url || "/"

  if (rota === "/qr" && qrCodeAtual) {
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end(`<img src="${qrCodeAtual}" style="width:300px"/>`)
  } else {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: statusConexao,
      qrDisponivel: Boolean(qrCodeAtual),
      rotaQr: "/qr",
      ultimoErroConexao,
      tentativasReconexao: reconnectAttempts,
      dica: "Se ficar em reconectando por muito tempo, verifique JSONBIN_* e tente FORCE_NEW_AUTH=true por um deploy.",
    }))
  }
})

server.listen(process.env.PORT || 3000, () => {
  console.log("Servidor ON")
})

async function downloadImagemFigurinha(sock, msg) {
  try {
    const buffer = await downloadMediaMessage(msg, "buffer", {}, { reuploadRequired: false })
    return buffer
  } catch (err) {
    console.log("Não foi possível baixar a mídia:", err.message)
    return null
  }
}

async function processarMidiaComoSticker(sock, from, msg) {
  const buffer = await downloadImagemFigurinha(sock, msg)
  if (!buffer) {
    await sock.sendMessage(from, { text: "Não consegui processar essa foto" })
    return
  }
  try {
    const stickerBuffer = await sharp(buffer)
      .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 80 })
      .toBuffer()
    await sock.sendMessage(from, { sticker: stickerBuffer })
  } catch (err) {
    console.log("Problema ao converter: " + err.message)
    await sock.sendMessage(from, { text: "Falhei na conversão ( ﾉ ﾟｰﾟ)ﾉ, tenta ai novamente" })
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
  if (semEventos) return

  await sock.sendMessage(from, { text: mensagemFinal, mentions: marcarPessoasGrupo })
}

async function start() {
  const authPath = process.env.AUTH_PATH || "./baileys-auth"

  if (process.env.FORCE_NEW_AUTH === "true") {
    fs.rmSync(authPath, { recursive: true, force: true })
    console.log("Sessão removida por FORCE_NEW_AUTH=true")
  }

  await restaurarSessaoExterna(authPath)

  const { state, saveCreds } = await useMultiFileAuthState(authPath)

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
  })

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      statusConexao = "aguardando_qr"
      qrcode.generate(qr, { small: true })
      QRCode.toDataURL(qr).then((url) => {
        qrCodeAtual = url
        console.log("QR gerado! Acesse a URL do serviço para escanear")
      })
    }

    if (connection === "open") {
      statusConexao = "conectado"
      qrCodeAtual = null
      ultimoErroConexao = null
      reconnectAttempts = 0
      cleanAuthAlreadyTried = false
      console.log("WhatsApp conectado com sucesso")
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
      statusConexao = shouldReconnect ? "reconectando" : "desconectado"
      ultimoErroConexao = String(lastDisconnect?.error?.message || "conexao_encerrada")
      reconnectAttempts += 1
      const hasSessionFiles = fs.existsSync(path.resolve(authPath, "creds.json"))

      if (shouldReconnect && !qrCodeAtual && reconnectAttempts >= 6 && hasSessionFiles && !cleanAuthAlreadyTried) {
        cleanAuthAlreadyTried = true
        console.log("Falhas repetidas sem QR; limpando sessão local para forçar novo pareamento...")
        fs.rmSync(path.resolve(authPath), { recursive: true, force: true })
      }

      if (shouldReconnect) {
        if (reconnectTimer) return
        console.log("Conexão fechada, tentando reconectar em 5s...")
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          start().catch((err) => {
            console.log("Falha ao reiniciar conexão:", err.message)
          })
        }, 5000)
      } else {
        // Sessão inválida: remove credenciais para forçar novo pareamento na próxima inicialização.
        fs.rmSync(path.resolve(authPath), { recursive: true, force: true })
        console.log("Sessão inválida. Reinicie o serviço para gerar novo QR.")
      }
    }
  })

  sock.ev.on("creds.update", async () => {
    await saveCreds()
    agendarSyncSessao(authPath)
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
    const temImagem = msg.message.imageMessage || msg.message.videoMessage
    const caption = msg.message.imageMessage?.caption || ""

    if (temImagem && (caption === "!figurinha" || caption.includes("!figurinha"))) {
      await processarMidiaComoSticker(sock, from, msg)
      setTimeout(async () => {
        await sock.sendMessage(from, { text: "Ta na mão ƪ(˘⌣˘)ʃ" })
      }, 1900)
    } else if (body == "!lembrete") {
      const meta = await sock.groupMetadata(from)
      const mentions = meta.participants.map((p) => p.id)
      await verificaAgendaAva(mentions, sock, from)
    } else if (body == "!comandos") {
      await sock.sendMessage(from, {
        text: `!lembrete  envia os lembretes de prazos do AVA\n\n!figurinha  faz a figurinha com a foto enviada (envie !figurinha como legenda)\n\n!comandos  envia essa mensagem`,
      })
    }
  })

  cron.schedule("40 22 * * *", async () => {
    const grupoId = process.env.ID_GRUPO_SALA
    const meta = await sock.groupMetadata(grupoId)
    const mentions = meta.participants.map((p) => p.id)
    await verificaAgendaAva(mentions, sock, grupoId)
  }, { timezone: "America/Sao_Paulo" })
}

start()