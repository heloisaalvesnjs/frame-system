const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 48, bottom: 48, left: 52, right: 52 },
  info: { Title: 'Frame System — Onboarding', Author: 'Frame System' }
})

const OUTPUT = path.join(__dirname, 'frame-system-onboarding.pdf')
doc.pipe(fs.createWriteStream(OUTPUT))

// ── Cores ─────────────────────────────────────────────────────────────────
const GREEN  = '#013F32'
const LIME   = '#E7FE25'
const DARK   = '#161616'
const GRAY   = '#4A5568'
const LIGHT  = '#F7F8F5'
const BORDER = '#CBD5C0'
const WHITE  = '#FFFFFF'
const W = 595 - 104  // largura útil

// ── Helpers ────────────────────────────────────────────────────────────────
function pageNum() {
  const range = doc.bufferedPageRange()
  return range.start + range.count
}

function addFooter() {
  const y = doc.page.height - 36
  doc.save()
  doc.fontSize(7).fillColor(GRAY)
  doc.text('Frame System — Documento confidencial de onboarding  |  framesystem.com.br  |  contato@framesystem.com.br',
    52, y, { width: W - 40, align: 'left' })
  doc.text(`${pageNum()}`, 52, y, { width: W, align: 'right' })
  doc.restore()
}

// ── Cabeçalho (capa) ───────────────────────────────────────────────────────
function header() {
  // Faixa verde topo
  doc.rect(0, 0, 595, 90).fill(GREEN)

  // Marca "FS"
  doc.roundedRect(52, 18, 48, 48, 10).fill('#0B2E22')
  doc.fontSize(20).font('Helvetica-Bold').fillColor(LIME)
  doc.text('FS', 52, 30, { width: 48, align: 'center' })

  // Nome + tagline
  doc.fontSize(22).font('Helvetica-Bold').fillColor(WHITE)
  doc.text('Frame System', 114, 22)
  doc.fontSize(10).font('Helvetica').fillColor('#A7C4B8')
  doc.text('Sua recepcionista virtual inteligente', 114, 50)

  // Data
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.fontSize(8).fillColor('#A7C4B8')
  doc.text(hoje, 114, 66)
}

// ── Título de seção ────────────────────────────────────────────────────────
let _sectionY = 108
function section(num, title, icon) {
  if (_sectionY > doc.page.height - 130) {
    addFooter()
    doc.addPage()
    _sectionY = 52
  }
  const y = _sectionY

  // Pill numerado
  doc.rect(52, y, W, 34).fill(GREEN)
  doc.roundedRect(56, y + 5, 26, 26, 5).fill('#0B2E22')
  doc.fontSize(11).font('Helvetica-Bold').fillColor(LIME)
  doc.text(String(num), 56, y + 10, { width: 26, align: 'center' })

  doc.fontSize(12).font('Helvetica-Bold').fillColor(WHITE)
  doc.text(`${icon}  ${title}`, 90, y + 10, { width: W - 50 })

  _sectionY = y + 46
}

// ── Campo de texto ─────────────────────────────────────────────────────────
function field(label, height = 22) {
  if (_sectionY + height + 30 > doc.page.height - 60) {
    addFooter(); doc.addPage(); _sectionY = 52
  }
  doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY)
  doc.text(label.toUpperCase(), 52, _sectionY)
  _sectionY += 13
  doc.rect(52, _sectionY, W, height).fill(LIGHT).stroke(BORDER)
  _sectionY += height + 10
}

// ── Campo em linha (2 colunas) ─────────────────────────────────────────────
function fieldRow(pairs) {
  if (_sectionY + 40 > doc.page.height - 60) {
    addFooter(); doc.addPage(); _sectionY = 52
  }
  const col = Math.floor(W / pairs.length)
  pairs.forEach(([label, w], i) => {
    const x = 52 + i * col
    const fw = (w || col) - 8
    doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY)
    doc.text(label.toUpperCase(), x, _sectionY)
    doc.rect(x, _sectionY + 13, fw, 22).fill(LIGHT).stroke(BORDER)
  })
  _sectionY += 46
}

// ── Checkboxes inline ─────────────────────────────────────────────────────
function checkRow(label, options) {
  if (_sectionY + 36 > doc.page.height - 60) {
    addFooter(); doc.addPage(); _sectionY = 52
  }
  doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY)
  doc.text(label.toUpperCase(), 52, _sectionY)
  _sectionY += 14
  let x = 52
  options.forEach(opt => {
    doc.rect(x, _sectionY, 10, 10).stroke(BORDER)
    doc.fontSize(9).font('Helvetica').fillColor(DARK)
    doc.text(opt, x + 14, _sectionY)
    x += doc.widthOfString(opt) + 32
  })
  _sectionY += 18
}

// ── Tabela ────────────────────────────────────────────────────────────────
function table(headers, rows) {
  const colW = Math.floor(W / headers.length)
  if (_sectionY + 20 + rows * 24 > doc.page.height - 60) {
    addFooter(); doc.addPage(); _sectionY = 52
  }
  // Header
  doc.rect(52, _sectionY, W, 20).fill(GREEN)
  headers.forEach((h, i) => {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
    doc.text(h, 52 + i * colW + 4, _sectionY + 6, { width: colW - 8 })
  })
  _sectionY += 20
  // Rows
  for (let r = 0; r < rows; r++) {
    const bg = r % 2 === 0 ? WHITE : LIGHT
    doc.rect(52, _sectionY, W, 24).fill(bg).stroke(BORDER)
    headers.forEach((_, i) => {
      doc.moveTo(52 + i * colW, _sectionY).lineTo(52 + i * colW, _sectionY + 24).stroke(BORDER)
    })
    _sectionY += 24
  }
  _sectionY += 10
}

// ── Separador ────────────────────────────────────────────────────────────
function gap(n = 10) { _sectionY += n }

function note(text) {
  if (_sectionY + 20 > doc.page.height - 60) {
    addFooter(); doc.addPage(); _sectionY = 52
  }
  doc.fontSize(8).font('Helvetica-Oblique').fillColor(GRAY)
  doc.text(text, 52, _sectionY, { width: W })
  _sectionY += 16
}

// ══════════════════════════════════════════════════════════════════════════
//  DOCUMENTO
// ══════════════════════════════════════════════════════════════════════════
header()
gap(8)

// Intro
doc.fontSize(9).font('Helvetica').fillColor(GRAY)
doc.text(
  'Preencha este formulário com atenção. Ele será usado para configurar sua assistente virtual no Frame System. ' +
  'Quanto mais detalhes você fornecer, melhor será o desempenho da IA no seu atendimento.',
  52, _sectionY, { width: W }
)
_sectionY += 32

// ─────────────────────────────────────────────────────────────────────────
section(1, 'IDENTIFICAÇÃO DA PROFISSIONAL', '👤')
gap(6)
fieldRow([['Nome completo', W]])
fieldRow([['CRN (número do conselho)'], ['E-mail profissional']])
fieldRow([['WhatsApp (número que será usado no sistema)'], ['Nome do consultório / clínica']])
fieldRow([['Instagram (ex: @seuperfil)'], ['Site (se tiver)']])

// ─────────────────────────────────────────────────────────────────────────
section(2, 'ASSISTENTE VIRTUAL — IDENTIDADE', '🤖')
gap(6)
fieldRow([['Como quer que a assistente se chame? (ex: Lia, Sofia, Frame)', W]])
gap(4)
checkRow('Tom de voz preferido', ['Formal', 'Acolhedor', 'Descontraído', 'Profissional direto'])
gap(4)
field('Mensagem de boas-vindas (como a IA deve se apresentar ao 1º contato)', 44)
field('Mensagem de despedida (o que a IA diz ao encerrar o atendimento)', 44)
gap(4)
note('Liste abaixo frases que a assistente DEVE usar com frequência (ex: "Fico feliz em ajudar!", "Com certeza!")')
field('Frase 1')
field('Frase 2')
field('Frase 3')
gap(4)
note('Liste abaixo frases ou palavras que a assistente NUNCA deve usar')
field('Frase / palavra 1')
field('Frase / palavra 2')
field('Frase / palavra 3')

// ─────────────────────────────────────────────────────────────────────────
section(3, 'SERVIÇOS E VALORES', '💰')
gap(6)
table(['Nome do serviço', 'Modalidade', 'Valor (R$)', 'Duração'], 5)
gap(4)
checkRow('Formas de pagamento aceitas', ['PIX', 'Cartão de crédito', 'Boleto', 'Transferência'])
field('Link de pagamento (se tiver — ex: link do Mercado Pago, Hotmart, etc.)')

// ─────────────────────────────────────────────────────────────────────────
section(4, 'AGENDA E DISPONIBILIDADE', '📅')
gap(6)
table(['Dia da semana', 'Horário início', 'Horário fim', 'Pausa almoço'], 7)
gap(4)
fieldRow([['Duração padrão da consulta (min)'], ['Intervalo entre consultas (min)'], ['Máx. consultas por dia']])
fieldRow([['Antecedência mínima para agendamento', W]])

// ─────────────────────────────────────────────────────────────────────────
section(5, 'LOCAIS DE ATENDIMENTO', '📍')
gap(6)
table(['Nome do local', 'Endereço completo', 'Modalidade', 'Valor específico (se diferente)'], 3)
gap(4)
checkRow('Plataforma para atendimento online', ['Google Meet', 'Zoom', 'Microsoft Teams', 'Outra'])
field('Link fixo para videochamada (se tiver)')

// ─────────────────────────────────────────────────────────────────────────
section(6, 'BASE DE CONHECIMENTO DA IA', '🧠')
gap(6)
field('Abordagem nutricional principal (ex: low carb, funcional, comportamental, esportiva)')
field('Público-alvo principal (ex: mulheres 30-50 anos com foco em emagrecimento)')
field('Principais queixas / objetivos dos seus pacientes (liste até 5)', 56)
field('O que diferencia seu atendimento da concorrência', 44)
field('Informações que a IA pode compartilhar livremente (ex: preço, horários, localização)', 44)
field('Informações que a IA NUNCA deve compartilhar ou opinar (ex: diagnósticos, medicamentos)', 44)

// ─────────────────────────────────────────────────────────────────────────
section(7, 'ROTEIRO DE VENDAS', '🎯')
gap(6)
field('Perguntas que a IA deve fazer para qualificar o lead (ex: "Qual é seu principal objetivo?")', 56)
gap(4)
note('Como a IA deve responder às principais objeções que você recebe:')
field('"É caro" — Como responder:', 36)
field('"Vou pensar" — Como responder:', 36)
field('"Já tentei dieta antes" — Como responder:', 36)
field('Outra objeção comum + resposta sugerida:', 36)
gap(4)
checkRow('Após qualificar o lead, a IA deve:', [
  'Já oferecer agendamento',
  'Perguntar se quer marcar',
  'Enviar link de pagamento primeiro'
])

// ─────────────────────────────────────────────────────────────────────────
section(8, 'INTEGRAÇÕES', '🔗')
gap(6)
checkRow('Tem WhatsApp Business?', ['Sim', 'Não (vamos criar juntos)'])
fieldRow([['Número do WhatsApp que será usado no sistema', W]])
gap(4)
checkRow('Quer conectar Google Calendar para sincronizar agendamentos?', ['Sim', 'Não'])
fieldRow([['E-mail da conta Google (se sim)', W]])
gap(4)
checkRow('Usa alguma ferramenta de automação?', ['n8n', 'Zapier', 'Make (Integromat)', 'Não uso'])
field('Qual ferramenta / qual fluxo já tem configurado (se tiver)')

// ─────────────────────────────────────────────────────────────────────────
section(9, 'OBSERVAÇÕES LIVRES', '📝')
gap(6)
field('Algo importante que a assistente precisa saber sobre você ou seu consultório', 56)
field('Situações que SEMPRE devem ser transferidas para você responder pessoalmente', 56)
field('Horário em que você responde pessoalmente (fora desse horário a IA assume 100%)', 36)
field('Alguma outra informação relevante para a configuração', 44)

// Footer última página
addFooter()

doc.end()
console.log('PDF gerado:', OUTPUT)
