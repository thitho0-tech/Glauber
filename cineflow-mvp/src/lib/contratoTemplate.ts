import { valorPorExtenso } from './valorPorExtenso'

export type ContratoPartes = {
  contratante: { razao_social: string; cnpj: string; endereco: string; rep_legal: string; cpf_rep: string; email: string }
  contratada: { razao_social: string; cnpj: string; cpf: string; nome: string; endereco: string; rep_legal: string; email: string; rg: string; orgao_rg: string; nacionalidade: string; estado_civil: string; profissao: string; banco: string; agencia: string; conta: string; pix: string }
  interveniente: { nome: string; nome_artistico: string; cpf: string; rg: string; orgao_rg: string; nacionalidade: string; estado_civil: string; profissao: string; endereco: string; email: string }
  prazos: { prep_inicio: string; prep_fim: string; prod_inicio: string; prod_fim: string; pos_inicio: string; pos_fim: string }
}

export type ContratoClausulas = {
  cessao_direitos: boolean; exclusividade: boolean
  confidencialidade_anos: number | null; multa_rescisoria_pct: number | null
  credito_formato: string; foro: string
}

export type ContratoParcela = {
  valor: number | null; percentual: number | null; gatilho: string; data_prevista: string | null
}

export interface ContratoParaPdf {
  tipo: string
  numero: string | null
  status: string
  lei_incentivo: string | null
  termo_numero: string | null
  objeto: string | null
  valor: number | null
  data_assinatura: string | null
  vigencia_inicio: string | null
  vigencia_fim: string | null
  observacoes: string | null
  contratada_tipo: 'pj' | 'pf'
  funcao_nome: string
  projeto_nome: string
  partes: ContratoPartes
  parcelas: ContratoParcela[]
  clausulas: ContratoClausulas
}

function d(s: string | null | undefined): string {
  if (!s) return '___________'
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR')
  } catch {
    return s
  }
}

function v(s: string | null | undefined): string {
  return s || '___________'
}

function brl(n: number | null | undefined): string {
  if (n == null) return '___________'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function tipoLabel(tipo: string): string {
  const map: Record<string, string> = {
    servicos_tecnicos: 'PRESTAÇÃO DE SERVIÇOS TÉCNICOS',
    roteirista: 'PRESTAÇÃO DE SERVIÇOS — ROTEIRISTA',
    direcao: 'PRESTAÇÃO DE SERVIÇOS — DIREÇÃO',
    elenco: 'PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS — ELENCO',
    fornecedor: 'PRESTAÇÃO DE SERVIÇOS — FORNECEDOR',
    cessao_direitos: 'CESSÃO DE DIREITOS AUTORAIS',
    coproducao: 'COPRODUÇÃO / APOIO',
    outro: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
  }
  return map[tipo] ?? 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS'
}

function quad(titulo: string, conteudo: object[]): object[] {
  return [
    { text: titulo, style: 'quadroTitle', margin: [0, 12, 0, 4] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }] },
    ...conteudo,
  ]
}

function campo(label: string, valor: string, col = false): object {
  return col
    ? { columns: [{ text: label + ': ', bold: true, width: 120 }, { text: valor }], margin: [0, 3, 0, 0] }
    : { text: [{ text: label + ': ', bold: true }, valor], margin: [0, 3, 0, 0] }
}

function buildDocDefinition(c: ContratoParaPdf): unknown {
  const p = c.partes
  const cl = c.clausulas ?? {}
  const isPj = c.contratada_tipo === 'pj'

  const secContratante: object[] = [
    { text: 'CONTRATANTE', style: 'subTitle', margin: [0, 8, 0, 4] },
    campo('Razão Social', v(p.contratante.razao_social)),
    campo('CNPJ', v(p.contratante.cnpj)),
    campo('Endereço', v(p.contratante.endereco)),
    campo('Representante Legal', v(p.contratante.rep_legal)),
    campo('CPF do Representante', v(p.contratante.cpf_rep)),
    campo('E-mail', v(p.contratante.email)),
  ]

  const secContratada: object[] = [
    { text: `CONTRATADA (${isPj ? 'Pessoa Jurídica' : 'Pessoa Física'})`, style: 'subTitle', margin: [0, 8, 0, 4] },
  ]
  if (isPj) {
    secContratada.push(
      campo('Razão Social', v(p.contratada.razao_social)),
      campo('CNPJ', v(p.contratada.cnpj)),
      campo('Endereço', v(p.contratada.endereco)),
      campo('Representante Legal', v(p.contratada.rep_legal)),
      campo('E-mail', v(p.contratada.email)),
    )
  } else {
    secContratada.push(
      campo('Nome Completo', v(p.contratada.nome)),
      campo('CPF', v(p.contratada.cpf)),
      campo('RG / Órgão', `${v(p.contratada.rg)} / ${v(p.contratada.orgao_rg)}`),
      campo('Nacionalidade', v(p.contratada.nacionalidade)),
      campo('Estado Civil', v(p.contratada.estado_civil)),
      campo('Profissão', v(p.contratada.profissao)),
      campo('Endereço', v(p.contratada.endereco)),
      campo('E-mail', v(p.contratada.email)),
    )
  }

  const secBancario: object[] = [
    { text: 'DADOS BANCÁRIOS DA CONTRATADA', style: 'subTitle', margin: [0, 8, 0, 4] },
    {
      columns: [
        campo('Banco', v(p.contratada.banco)),
        campo('Agência', v(p.contratada.agencia)),
        campo('Conta', v(p.contratada.conta)),
        campo('PIX', v(p.contratada.pix)),
      ],
    },
  ]

  const secInterv: object[] = []
  if (isPj) {
    secInterv.push(
      { text: 'INTERVENIENTE-ANUENTE', style: 'subTitle', margin: [0, 8, 0, 4] },
      campo('Nome Completo', v(p.interveniente.nome)),
      campo('Nome Artístico', v(p.interveniente.nome_artistico)),
      campo('CPF', v(p.interveniente.cpf)),
      campo('RG / Órgão', `${v(p.interveniente.rg)} / ${v(p.interveniente.orgao_rg)}`),
      campo('Nacionalidade', v(p.interveniente.nacionalidade)),
      campo('Estado Civil', v(p.interveniente.estado_civil)),
      campo('Endereço', v(p.interveniente.endereco)),
      campo('E-mail', v(p.interveniente.email)),
    )
  }

  const prazos = p.prazos ?? {}
  const secObjeto: object[] = [
    campo('Obra/Produção', v(c.projeto_nome)),
    campo('Função Contratada', v(c.funcao_nome)),
    ...(c.lei_incentivo ? [campo('Lei/Edital', v(c.lei_incentivo))] : []),
    ...(c.termo_numero ? [campo('Nº Termo/Compromisso', v(c.termo_numero))] : []),
    { text: 'Objeto:', bold: true, margin: [0, 8, 0, 2] },
    { text: v(c.objeto), margin: [0, 0, 0, 6] },
    { text: 'Prazos:', bold: true, margin: [0, 6, 0, 2] },
    ...(prazos.prep_inicio ? [campo('Pré-produção', `${d(prazos.prep_inicio)} a ${d(prazos.prep_fim)}`)] : []),
    campo('Produção/Gravações', `${d(prazos.prod_inicio)} a ${d(prazos.prod_fim)}`),
    ...(prazos.pos_inicio ? [campo('Pós-produção', `${d(prazos.pos_inicio)} a ${d(prazos.pos_fim)}`)] : []),
    campo('Data de Assinatura', d(c.data_assinatura)),
    campo('Vigência', `${d(c.vigencia_inicio)} a ${d(c.vigencia_fim)}`),
  ]

  const parcelasContent: object[] = c.parcelas.length
    ? [
        { text: 'Parcelamento:', bold: true, margin: [0, 8, 0, 4] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*'],
            body: [
              [
                { text: 'Parcela', bold: true },
                { text: 'Valor', bold: true },
                { text: 'Gatilho / Condição', bold: true },
                { text: 'Data Prevista', bold: true },
              ],
              ...c.parcelas.map((p, i) => [
                `${i + 1}ª`,
                p.valor != null ? brl(p.valor) : p.percentual != null ? `${p.percentual}%` : '—',
                v(p.gatilho),
                p.data_prevista ? d(p.data_prevista) : '—',
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ]
    : []

  const secRemuneracao: object[] = [
    campo('Valor Total Bruto', brl(c.valor)),
    { text: `(${valorPorExtenso(c.valor)})`, italics: true, fontSize: 9, margin: [0, 1, 0, 4] },
    ...parcelasContent,
  ]

  const clausulasList: object[] = []
  let nCl = 1
  clausulasList.push({
    text: `CLÁUSULA ${nCl++}ª — DO OBJETO`,
    bold: true, margin: [0, 6, 0, 2],
  }, {
    text: `A CONTRATADA obriga-se a prestar os serviços descritos no QUADRO 2 deste instrumento, a título de ${v(c.funcao_nome)}, para a produção "${v(c.projeto_nome)}".`,
    margin: [0, 0, 0, 4],
  })
  clausulasList.push({
    text: `CLÁUSULA ${nCl++}ª — DA REMUNERAÇÃO`,
    bold: true, margin: [0, 6, 0, 2],
  }, {
    text: `Pela execução dos serviços, a CONTRATANTE pagará à CONTRATADA o valor total de ${brl(c.valor)} (${valorPorExtenso(c.valor)})${c.parcelas.length ? ', conforme parcelamento descrito no QUADRO 2' : ''}.`,
    margin: [0, 0, 0, 4],
  })
  if (cl.cessao_direitos) {
    clausulasList.push({
      text: `CLÁUSULA ${nCl++}ª — DA CESSÃO DE DIREITOS`,
      bold: true, margin: [0, 6, 0, 2],
    }, {
      text: 'A CONTRATADA cede à CONTRATANTE, em caráter definitivo e irretratável, todos os direitos autorais patrimoniais relativos aos serviços objeto deste contrato, para utilização em todo e qualquer suporte ou meio de divulgação, sem limitação de tempo ou território.',
      margin: [0, 0, 0, 4],
    })
  }
  if (cl.exclusividade) {
    clausulasList.push({
      text: `CLÁUSULA ${nCl++}ª — DA EXCLUSIVIDADE`,
      bold: true, margin: [0, 6, 0, 2],
    }, {
      text: 'Durante a vigência deste contrato, a CONTRATADA compromete-se a trabalhar com exclusividade para a CONTRATANTE nas atividades objeto deste instrumento.',
      margin: [0, 0, 0, 4],
    })
  }
  if (cl.confidencialidade_anos) {
    clausulasList.push({
      text: `CLÁUSULA ${nCl++}ª — DA CONFIDENCIALIDADE`,
      bold: true, margin: [0, 6, 0, 2],
    }, {
      text: `As partes comprometem-se a manter sigilo sobre todas as informações confidenciais relativas à produção pelo prazo de ${cl.confidencialidade_anos} (${milharPorExtenso(cl.confidencialidade_anos)}) ano(s) após o encerramento deste contrato.`,
      margin: [0, 0, 0, 4],
    })
  }
  if (cl.multa_rescisoria_pct) {
    clausulasList.push({
      text: `CLÁUSULA ${nCl++}ª — DA RESCISÃO E MULTA`,
      bold: true, margin: [0, 6, 0, 2],
    }, {
      text: `Em caso de rescisão imotivada por qualquer das partes, a parte infratora pagará à outra uma multa equivalente a ${cl.multa_rescisoria_pct}% (${cl.multa_rescisoria_pct} por cento) sobre o valor total deste contrato.`,
      margin: [0, 0, 0, 4],
    })
  }
  clausulasList.push({
    text: `CLÁUSULA ${nCl++}ª — DA NATUREZA DO VÍNCULO`,
    bold: true, margin: [0, 6, 0, 2],
  }, {
    text: 'A presente avença é celebrada em caráter civil, não gerando vínculo empregatício, nem obrigações de qualquer natureza trabalhista ou previdenciária.',
    margin: [0, 0, 0, 4],
  })
  if (cl.credito_formato) {
    clausulasList.push({
      text: `CLÁUSULA ${nCl++}ª — DO CRÉDITO NA OBRA`,
      bold: true, margin: [0, 6, 0, 2],
    }, {
      text: `Os créditos devidos à CONTRATADA constarão da obra no seguinte formato: "${v(cl.credito_formato)}".`,
      margin: [0, 0, 0, 4],
    })
  }
  clausulasList.push({
    text: `CLÁUSULA ${nCl++}ª — DO FORO`,
    bold: true, margin: [0, 6, 0, 2],
  }, {
    text: `Fica eleito o foro da ${cl.foro ? `Comarca de ${cl.foro}` : 'Comarca competente'} para dirimir quaisquer controvérsias oriundas do presente contrato.`,
    margin: [0, 0, 0, 4],
  })

  const secAssinatura: object[] = [
    {
      text: `${cl.foro || '___________'}, ${d(c.data_assinatura)}`,
      alignment: 'center',
      margin: [0, 20, 0, 30],
    },
    {
      columns: [
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }] },
            { text: v(p.contratante.razao_social), alignment: 'center', margin: [0, 4, 0, 0] },
            { text: 'CONTRATANTE', alignment: 'center', bold: true, fontSize: 9 },
          ],
        },
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }] },
            { text: isPj ? v(p.contratada.razao_social) : v(p.contratada.nome), alignment: 'center', margin: [0, 4, 0, 0] },
            { text: 'CONTRATADA', alignment: 'center', bold: true, fontSize: 9 },
          ],
        },
      ],
      columnGap: 40,
      margin: [0, 0, 0, 30],
    },
    ...(isPj ? [{
      columns: [
        { width: '*', text: '' },
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }] },
            { text: v(p.interveniente.nome), alignment: 'center', margin: [0, 4, 0, 0] },
            { text: 'INTERVENIENTE-ANUENTE', alignment: 'center', bold: true, fontSize: 9 },
          ],
          width: 200,
        },
        { width: '*', text: '' },
      ],
    }] : []),
    {
      columns: [
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] },
            { text: 'Testemunha 1', alignment: 'center', margin: [0, 4, 0, 0], fontSize: 9 },
          ],
        },
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] },
            { text: 'Testemunha 2', alignment: 'center', margin: [0, 4, 0, 0], fontSize: 9 },
          ],
        },
      ],
      columnGap: 40,
    },
  ]

  return {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.4 },
    styles: {
      title: { fontSize: 14, bold: true, alignment: 'center' as const },
      subtitle2: { fontSize: 11, alignment: 'center' as const },
      quadroTitle: { fontSize: 11, bold: true, color: '#1a1a1a' },
      subTitle: { fontSize: 10, bold: true, decoration: 'underline' as const },
    },
    content: [
      { text: tipoLabel(c.tipo), style: 'title', margin: [0, 0, 0, 4] },
      ...(c.numero ? [{ text: `Nº ${c.numero}`, style: 'subtitle2', margin: [0, 0, 0, 4] }] : []),
      { text: `Obra: ${v(c.projeto_nome)}`, style: 'subtitle2', margin: [0, 0, 0, 2] },
      ...(c.lei_incentivo ? [{ text: `Lei/Edital: ${v(c.lei_incentivo)}${c.termo_numero ? ` — Termo Nº ${c.termo_numero}` : ''}`, style: 'subtitle2', margin: [0, 0, 0, 2] }] : []),
      ...quad('QUADRO 1 — IDENTIFICAÇÃO DAS PARTES', [
        ...secContratante,
        ...secContratada,
        ...secBancario,
        ...secInterv,
      ]),
      ...quad('QUADRO 2 — OBJETO, PRAZO E REMUNERAÇÃO', [
        ...secObjeto,
        { text: 'Remuneração:', style: 'subTitle', margin: [0, 10, 0, 4] },
        ...secRemuneracao,
      ]),
      { text: 'CLÁUSULAS E CONDIÇÕES', style: 'quadroTitle', margin: [0, 16, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }] },
      ...clausulasList,
      ...(c.observacoes ? [
        { text: 'OBSERVAÇÕES', style: 'quadroTitle', margin: [0, 12, 0, 4] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }] },
        { text: c.observacoes, margin: [0, 4, 0, 0] },
      ] : []),
      { text: 'ASSINATURAS', style: 'quadroTitle', margin: [0, 16, 0, 8] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }] },
      ...secAssinatura,
    ],
  }
}

function milharPorExtenso(n: number): string {
  const palavras = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
  return n <= 10 ? palavras[n] : String(n)
}

export async function exportarContratoEmPdf(contrato: ContratoParaPdf): Promise<Blob> {
  const pdfMakeMod: any = await import('pdfmake/build/pdfmake')
  const pdfFontsMod: any = await import('pdfmake/build/vfs_fonts')
  const pdfMake: any = pdfMakeMod.default ?? pdfMakeMod
  const vfs =
    pdfFontsMod.vfs ??
    pdfFontsMod.pdfMake?.vfs ??
    pdfFontsMod.default?.vfs ??
    pdfFontsMod.default?.pdfMake?.vfs ??
    pdfFontsMod.default
  pdfMake.vfs = vfs
  const docDef = buildDocDefinition(contrato)
  return new Promise<Blob>((resolve) => {
    pdfMake.createPdf(docDef).getBlob((blob: Blob) => resolve(blob))
  })
}
