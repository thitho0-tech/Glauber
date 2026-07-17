# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, HRFlowable, ListFlowable, ListItem)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUT = "/sessions/great-sleepy-einstein/mnt/Glauber/Glauber_Relatorio_Capacidade_2026-07-03.pdf"

GOLD   = colors.HexColor("#B45309")
DARK   = colors.HexColor("#1F2937")
GREY   = colors.HexColor("#6B7280")
LIGHT  = colors.HexColor("#F3F4F6")
GREEN  = colors.HexColor("#047857")
RED    = colors.HexColor("#B91C1C")
AMBERBG= colors.HexColor("#FEF3C7")
LINE   = colors.HexColor("#E5E7EB")

styles = getSampleStyleSheet()
def S(name, **kw): styles.add(ParagraphStyle(name, **kw))
S("H1", fontName="Helvetica-Bold", fontSize=17, textColor=DARK, spaceBefore=14, spaceAfter=6, leading=21)
S("H2", fontName="Helvetica-Bold", fontSize=12.5, textColor=GOLD, spaceBefore=12, spaceAfter=4, leading=16)
S("Body", fontName="Helvetica", fontSize=9.7, textColor=DARK, leading=14.5, alignment=TA_JUSTIFY, spaceAfter=5)
S("BodyL", fontName="Helvetica", fontSize=9.7, textColor=DARK, leading=14.5, alignment=TA_LEFT, spaceAfter=5)
S("Small", fontName="Helvetica", fontSize=8.2, textColor=GREY, leading=11.5, alignment=TA_LEFT)
S("Cell", fontName="Helvetica", fontSize=8.6, textColor=DARK, leading=11.5)
S("CellW", fontName="Helvetica-Bold", fontSize=8.6, textColor=colors.white, leading=11.5)
S("Cover1", fontName="Helvetica-Bold", fontSize=30, textColor=DARK, leading=34)
S("Cover2", fontName="Helvetica", fontSize=13, textColor=GOLD, leading=18)
S("CoverS", fontName="Helvetica", fontSize=10, textColor=GREY, leading=15)
S("KpiNum", fontName="Helvetica-Bold", fontSize=16, textColor=GOLD, leading=18, alignment=TA_CENTER)

story = []
def para(t, s="Body"): return Paragraph(t, styles[s])
def h1(t): story.append(Paragraph(t, styles["H1"]))
def h2(t): story.append(Paragraph(t, styles["H2"]))
def sp(h=6): story.append(Spacer(1, h))
def bullets(items, s="BodyL"):
    li=[ListItem(Paragraph(x, styles[s]), leftIndent=10) for x in items]
    story.append(ListFlowable(li, bulletType="bullet", start="•", bulletColor=GOLD,
                              bulletFontSize=8, leftIndent=12, spaceBefore=1, spaceAfter=6))
def cell(t,st="Cell"): return Paragraph(t, styles[st])

# ---- CAPA ----
story.append(Spacer(1, 50))
story.append(HRFlowable(width="34%", thickness=3, color=GOLD, spaceAfter=18, hAlign="LEFT"))
story.append(Paragraph("Glauber", styles["Cover1"]))
story.append(Spacer(1, 6))
story.append(Paragraph("Relatório de Capacidade de Uso Real", styles["Cover2"]))
story.append(Spacer(1, 4))
story.append(Paragraph("Quanto a plataforma suporta hoje &mdash; usuários, uploads, análises com IA e e-mails", styles["CoverS"]))
story.append(Spacer(1, 26))
story.append(HRFlowable(width="100%", thickness=0.7, color=LINE, spaceAfter=10))
cover_tbl = Table([
    [Paragraph("<b>Plataforma</b>", styles["Cell"]), Paragraph("SaaS B2B para produções audiovisuais (web responsiva + mobile)", styles["Cell"])],
    [Paragraph("<b>Ambiente</b>", styles["Cell"]), Paragraph("Produção &mdash; glauber.app.br", styles["Cell"])],
    [Paragraph("<b>Data do levantamento</b>", styles["Cell"]), Paragraph("03 de julho de 2026", styles["Cell"])],
    [Paragraph("<b>Base dos dados</b>", styles["Cell"]), Paragraph("Medições diretas na infraestrutura + limites oficiais vigentes", styles["Cell"])],
], colWidths=[38*mm, 120*mm])
cover_tbl.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LINEBELOW",(0,0),(-1,-2),0.4,LINE),
    ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),("LEFTPADDING",(0,0),(-1,-1),0)]))
story.append(cover_tbl)
story.append(Spacer(1, 20))
verdict = Table([[Paragraph("<b>Veredito em uma linha:</b> a stack atual é robusta para a fase de <b>piloto</b> "
    "(hoje operamos em ~2&ndash;3% dos limites de banco e armazenamento), mas <b>ainda não está pronta para um "
    "lançamento comercial aberto</b> por causa de três bloqueios: pausa automática do banco no plano gratuito, "
    "restrição de uso comercial da hospedagem e o teto de envio de e-mails pelo Gmail.", styles["BodyL"])]],
    colWidths=[158*mm])
verdict.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),AMBERBG),("BOX",(0,0),(-1,-1),0.6,GOLD),
    ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
    ("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
story.append(verdict)
story.append(PageBreak())

# ---- 1 ----
h1("1. Sumário executivo")
para("Este relatório responde, com números medidos diretamente na infraestrutura em 03/07/2026, à pergunta: "
     "<b>qual é a capacidade real de uso do Glauber no estado atual?</b> Ou seja, quantas pessoas conseguem usar, "
     "quantos arquivos podem ser enviados, quantas análises com IA e quantos e-mails a plataforma sustenta antes "
     "de esbarrar em algum limite.")
para("A resposta curta: <b>para o piloto atual (poucas produções simultâneas), sobra folga</b>. O gargalo real hoje "
     "<b>não é o número de usuários cadastrados</b> &mdash; o banco de autenticação suporta dezenas de milhares de "
     "usuários ativos por mês. Os limites que aparecem primeiro, na prática, são três, e todos se resolvem com "
     "upgrades baratos e previsíveis (algo em torno de US$ 45&ndash;65/mês no total).")
sp(2)
crit = Table([
    [Paragraph("!", styles["CellW"]), Paragraph("<b>1. E-mail (o gargalo nº 1).</b> Convites e notificações saem por uma conta <b>Gmail via SMTP</b>, "
        "limitada a cerca de <b>500 e-mails por dia</b> &mdash; com risco de bloqueio e de cair em spam. Não escala para várias produções.", styles["Cell"])],
    [Paragraph("!", styles["CellW"]), Paragraph("<b>2. Banco gratuito pausa sozinho.</b> O Supabase no plano Free <b>pausa o projeto após 7 dias sem tráfego</b> "
        "e <b>não faz backups automáticos</b>. Para um produto pago, é risco de indisponibilidade e de perda de dados.", styles["Cell"])],
    [Paragraph("!", styles["CellW"]), Paragraph("<b>3. Hospedagem é de uso não-comercial.</b> O plano gratuito da Vercel (Hobby) é, por contrato, para uso "
        "pessoal e <b>pausa ao atingir o limite</b> (sem cobrança extra). Operar como negócio pede o plano Pro.", styles["Cell"])],
], colWidths=[8*mm, 150*mm])
crit.setStyle(TableStyle([("BACKGROUND",(0,0),(0,-1),RED),("VALIGN",(0,0),(-1,-1),"TOP"),
    ("ALIGN",(0,0),(0,-1),"CENTER"),("BACKGROUND",(1,0),(1,-1),LIGHT),("LINEBELOW",(0,0),(-1,-1),3,colors.white),
    ("LEFTPADDING",(1,0),(1,-1),9),("RIGHTPADDING",(1,0),(1,-1),9),
    ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story.append(crit)
sp(6)
para("As próximas seções detalham a stack, mostram o uso atual contra cada limite, traduzem isso em capacidade "
     "prática (quantos usuários / arquivos / e-mails / análises) e fecham com o plano de ação recomendado.")

# ---- 2 ----
h1("2. Do que a plataforma é feita (a stack atual)")
para("O Glauber roda sobre quatro serviços externos. Três estão em <b>plano gratuito</b>; o quarto (IA) é pago por uso.")
infra = [
    [cell("Serviço",'CellW'), cell("Papel no Glauber",'CellW'), cell("Plano",'CellW')],
    [cell("<b>Supabase</b>"), cell("Banco (Postgres 17), login/usuários, armazenamento de arquivos, tempo real (chat/mural) e funções de servidor. Região sa-east-1 (São Paulo)."), cell("<b>Free</b>")],
    [cell("<b>Vercel</b>"), cell("Hospedagem do site/app (front-end) e domínio glauber.app.br."), cell("Hobby*")],
    [cell("<b>Gmail (SMTP)</b>"), cell("Envio de e-mails: convites para a equipe e notificações (OD publicada, agenda, etc.)."), cell("Conta Gmail")],
    [cell("<b>Mistral AI</b>"), cell("Análises com IA: leitura de contratos e comprovantes (OCR) e decupagem de roteiro."), cell("Pago por uso")],
]
t = Table(infra, colWidths=[26*mm, 106*mm, 26*mm])
t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GOLD),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT]),
    ("GRID",(0,0),(-1,-1),0.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
    ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7)]))
story.append(t)
story.append(Paragraph("* O projeto roda sob um time Vercel (“cineflow-s-projects”) com domínio próprio. O plano exato "
    "(Hobby gratuito vs. Pro) deve ser confirmado no painel de billing; este relatório assume Hobby.", styles["Small"]))

# ---- 3 ----
h1("3. Onde estamos hoje (fotografia do uso)")
para("Medições diretas no banco de produção em 03/07/2026. Os números mostram que a operação ainda é de "
     "<b>piloto</b> &mdash; usamos uma fração mínima da capacidade contratada.")
kpis = Table([[
    Paragraph("17 MB<br/><font size=7 color='#6B7280'>Banco (de 500 MB)</font>", styles["KpiNum"]),
    Paragraph("15 MB<br/><font size=7 color='#6B7280'>Arquivos (de 1 GB)</font>", styles["KpiNum"]),
    Paragraph("17<br/><font size=7 color='#6B7280'>Usuários (login)</font>", styles["KpiNum"]),
    Paragraph("5<br/><font size=7 color='#6B7280'>Produções</font>", styles["KpiNum"]),
    Paragraph("44<br/><font size=7 color='#6B7280'>Pessoas</font>", styles["KpiNum"]),
]], colWidths=[31.6*mm]*5)
kpis.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),LIGHT),("BOX",(0,0),(-1,-1),0.4,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.4,colors.white),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
story.append(kpis)
story.append(Paragraph("Também no banco: 42 arquivos armazenados, 12 mensagens de chat, 4 eventos de agenda e 3 contratos.", styles["Small"]))
story.append(PageBreak())

# ---- 4 ----
h1("4. Capacidade real por recurso")
para("A tabela cruza cada limite dos planos gratuitos (valores vigentes em julho/2026) com o uso atual e o que "
     "acontece ao atingir o teto. A coluna “folga” indica o quão longe estamos do limite.")
rows = [
    [cell("Recurso",'CellW'), cell("Limite (plano free)",'CellW'), cell("Uso hoje",'CellW'), cell("Folga",'CellW'), cell("Ao estourar",'CellW')],
    [cell("<b>Usuários ativos/mês</b>"), cell("50.000 (Supabase)"), cell("17"), cell("Enorme"), cell("Cobra por usuário extra (barato)")],
    [cell("<b>Banco de dados</b>"), cell("500 MB (Supabase)"), cell("17 MB (3,4%)"), cell("Muito alta"), cell("Bloqueia escrita; precisa Pro")],
    [cell("<b>Arquivos / uploads</b>"), cell("1 GB (Supabase)"), cell("15 MB (1,5%)"), cell("Alta"), cell("Bloqueia novos uploads")],
    [cell("<b>Transferência (egress)</b>"), cell("5 GB/mês (Supabase)"), cell("Baixo"), cell("Média"), cell("Cobra por GB extra")],
    [cell("<b>Tempo real</b> (chat/mural)"), cell("200 conexões simultâneas"), cell("Baixo"), cell("Média"), cell("Novas conexões recusadas")],
    [cell("<b>Funções de servidor</b>"), cell("500.000 execuções/mês"), cell("Baixo"), cell("Enorme"), cell("Cobra por execução extra")],
    [cell("<b>Banda do site</b>"), cell("100 GB/mês (Vercel)"), cell("Baixo"), cell("Alta"), cell("Projeto pausa (sem overage)")],
    [cell("<b>E-mails</b>"), cell("~500/dia (Gmail SMTP)"), cell("Baixo"), cell("<b>BAIXA</b>"), cell("Envio bloqueado por ~24h")],
    [cell("<b>Análises com IA</b>"), cell("Sem teto fixo (pago por uso)"), cell("Baixo"), cell("N/A"), cell("Só aumenta o custo")],
]
t = Table(rows, colWidths=[30*mm, 40*mm, 22*mm, 18*mm, 48*mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GOLD),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT]),
    ("GRID",(0,0),(-1,-1),0.4,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
    ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
    ("BACKGROUND",(0,8),(-1,8),colors.HexColor("#FEE2E2")),("TEXTCOLOR",(3,8),(3,8),RED)]))
story.append(t)
story.append(Paragraph("“Baixo/N/A” = uso muito abaixo do limite e/ou sem um teto técnico aplicável.", styles["Small"]))

# ---- 5 ----
h1("5. Traduzindo em números do dia a dia")
para("O que esses limites significam na prática, mantendo margem de segurança:")
bullets([
    "<b>Usuários cadastrados:</b> centenas, sem problema técnico. O teto prático não é o banco (comporta dezenas de milhares) &mdash; é a operação e, sobretudo, o envio de e-mails de convite.",
    "<b>Pessoas usando o chat/mural ao mesmo tempo:</b> confortável até cerca de <b>150&ndash;200</b> conexões simultâneas.",
    "<b>Produções simultâneas:</b> na faixa de <b>10 a 30</b> antes de armazenamento, e-mail e transferência apertarem.",
    "<b>Uploads (arquivos):</b> por volta de <b>1.000 a 2.500 arquivos</b> em 1 GB (média atual ~360 KB/arquivo; PDFs e áudios pesam mais).",
    "<b>Análises com IA:</b> <b>sem teto técnico</b> &mdash; o limite é o orçamento. Referência: US$ 2 por 1.000 páginas de OCR; extrair dados de um contrato custa centavos.",
    "<b>E-mails:</b> ~<b>500 por dia</b>. É o verdadeiro gargalo: um lote de convites no lançamento, ou notificações diárias em várias produções, satura rápido.",
])
story.append(PageBreak())

# ---- 6 ----
h1("6. Os três bloqueios para o lançamento comercial")
h2("6.1  E-mail via Gmail &mdash; o limite mais próximo")
para("O envio usa a conta Gmail por SMTP. Uma conta Gmail comum entrega da ordem de <b>500 destinatários/dia</b> "
     "(e cerca de 100/dia por SMTP em cenários mais restritos), com o Google podendo suspender o envio por até 24h ao "
     "exceder a cota. Além do volume, há o risco de <b>entregabilidade</b>: e-mails automáticos saindo de um Gmail "
     "pessoal caem facilmente em spam. Para um SaaS, o caminho correto é um <b>provedor de e-mail transacional</b> "
     "(Resend, Amazon SES, SendGrid, Postmark) com o domínio glauber.app.br autenticado (SPF/DKIM/DMARC).")
h2("6.2  Banco gratuito &mdash; pausa automática e sem backup")
para("No plano Free, o Supabase <b>pausa o projeto após 7 dias sem requisições</b> e <b>não oferece backups "
     "automáticos</b>. Para um piloto controlado é tolerável; para clientes pagantes, significa risco de a plataforma "
     "“dormir” e de não haver ponto de restauração em caso de incidente. O plano Pro remove a pausa e liga backups diários.")
h2("6.3  Hospedagem &mdash; uso não-comercial no plano gratuito")
para("O plano Hobby da Vercel é destinado a uso pessoal/não-comercial pelas regras de uso justo, e <b>pausa ao "
     "atingir os limites</b> em vez de cobrar. Para operar o Glauber como negócio (uso comercial, sem risco de pausa, "
     "com banda maior), o plano Pro é o adequado.")

# ---- 7 ----
h1("7. Plano de ação e custos para escalar")
para("Destravar a operação comercial é barato e previsível &mdash; coerente com a tese do Glauber de custo marginal "
     "próximo de zero. Valores aproximados (US$, julho/2026):")
up = [
    [cell("Ação",'CellW'), cell("De  /  Para",'CellW'), cell("Custo aprox.",'CellW'), cell("Resolve",'CellW')],
    [cell("<b>E-mail transacional</b>"), cell("Gmail SMTP  /  Resend ou Amazon SES"), cell("US$ 0&ndash;20/mês"), cell("Volume de e-mail + entregabilidade (gargalo nº 1)")],
    [cell("<b>Banco Pro</b>"), cell("Supabase Free  /  Pro"), cell("US$ 25/mês"), cell("Fim da pausa + backups diários; mais banco/storage/egress")],
    [cell("<b>Hospedagem Pro</b>"), cell("Vercel Hobby  /  Pro"), cell("US$ 20/mês"), cell("Uso comercial liberado, sem pausa, mais banda")],
    [cell("<b>Orçamento de IA</b>"), cell("Mistral (manter por uso)"), cell("Variável"), cell("Definir teto mensal + alertas de custo")],
]
t = Table(up, colWidths=[30*mm, 52*mm, 30*mm, 46*mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT]),
    ("GRID",(0,0),(-1,-1),0.4,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
    ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7)]))
story.append(t)
sp(4)
total = Table([[Paragraph("<b>Total para “pronto para vender”:</b> aproximadamente <b>US$ 45&ndash;65/mês</b> de "
    "infraestrutura fixa (Supabase Pro + Vercel Pro + e-mail transacional) mais o custo variável de IA, hoje marginal. "
    "Isso sustenta um salto de ordens de grandeza em relação ao piloto atual.", styles["BodyL"])]], colWidths=[158*mm])
total.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#ECFDF5")),("BOX",(0,0),(-1,-1),0.6,GREEN),
    ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
    ("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
story.append(total)
h2("Prioridades sugeridas (nesta ordem)")
story.append(ListFlowable([
    ListItem(para("<b>[Crítico]</b> Migrar o e-mail para um provedor transacional com domínio autenticado. Maior ganho, menor custo.", "BodyL")),
    ListItem(para("<b>[Crítico]</b> Subir o Supabase para Pro antes de ter clientes pagantes (elimina pausa + liga backups).", "BodyL")),
    ListItem(para("<b>[Crítico]</b> Confirmar/assinar a Vercel Pro para uso comercial legítimo.", "BodyL")),
    ListItem(para("<b>[Importante]</b> Monitorar transferência (egress) e armazenamento; política de retenção/compressão dos áudios do chat.", "BodyL")),
    ListItem(para("<b>[Importante]</b> Definir orçamento e alertas de custo na Mistral.", "BodyL")),
    ListItem(para("<b>[Bom ter]</b> Rotina de exportação/backup lógico adicional e observabilidade.", "BodyL")),
], bulletType="1", leftIndent=14, bulletColor=GOLD, bulletFontName="Helvetica-Bold"))

# ---- 8 ----
h1("8. Notas metodológicas e fontes")
bullets([
    "<b>Uso atual:</b> consulta direta ao banco de produção em 03/07/2026.",
    "<b>Limites dos planos:</b> valores vigentes em julho/2026 (páginas oficiais + resumos de terceiros). Podem mudar &mdash; conferir antes de decisões de contrato.",
    "<b>Gmail SMTP:</b> a cota exata varia por conta e histórico; 500/dia é a referência de planejamento (Google Workspace sobe para ~2.000/dia).",
    "<b>Supabase Pro:</b> cifras de upgrade aproximadas (banco/storage/egress e backups) &mdash; confirmar na página de preços.",
    "<b>Mistral:</b> preços por uso (OCR US$ 2/1.000 páginas; texto US$ 0,15/US$ 0,60 por 1M de tokens entrada/saída). Limites por segundo dependem do nível da conta.",
    "<b>Vercel:</b> plano exato (Hobby vs. Pro) a confirmar no painel de billing.",
], "Small")

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(GREY)
    canvas.drawString(20*mm, 12*mm, "Glauber — Relatório de Capacidade de Uso Real · 03/07/2026 · Confidencial")
    canvas.drawRightString(190*mm, 12*mm, "Página %d" % doc.page)
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.4); canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm,
    title="Glauber — Relatório de Capacidade de Uso Real", author="Glauber")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK ->", OUT)
