const un = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const dz = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const ct = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function grupo(n: number): string {
  if (n === 0) return ''
  if (n < 20) return un[n]
  if (n < 100) {
    const r = n % 10
    return r ? `${dz[Math.floor(n / 10)]} e ${un[r]}` : dz[Math.floor(n / 10)]
  }
  if (n === 100) return 'cem'
  const r = n % 100
  return r ? `${ct[Math.floor(n / 100)]} e ${grupo(r)}` : ct[Math.floor(n / 100)]
}

function milhar(n: number): string {
  const partes: string[] = []
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000)
    partes.push(`${grupo(m)} ${m === 1 ? 'milhão' : 'milhões'}`)
    n %= 1_000_000
  }
  if (n >= 1_000) {
    const k = Math.floor(n / 1_000)
    partes.push(k === 1 ? 'mil' : `${grupo(k)} mil`)
    n %= 1_000
  }
  if (n > 0) partes.push(grupo(n))
  return partes.join(' e ')
}

export function valorPorExtenso(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor) || valor < 0) return ''
  if (valor === 0) return 'zero reais'
  const inteiro = Math.floor(valor)
  const cents = Math.round((valor - inteiro) * 100)
  const parteReais = inteiro > 0 ? `${milhar(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}` : ''
  const parteCents = cents > 0 ? `${milhar(cents)} ${cents === 1 ? 'centavo' : 'centavos'}` : ''
  if (!parteCents) return parteReais
  if (!parteReais) return parteCents
  return `${parteReais} e ${parteCents}`
}
