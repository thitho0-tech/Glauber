// Utilitários de telefone BR — usados no convite por WhatsApp e na validação do cadastro.

/** Só os dígitos do telefone. */
export function soDigitos(tel?: string | null): string {
  return (tel ?? "").replace(/\D/g, "");
}

/**
 * Telefone tem DDD? Exige no mínimo DDD (2) + 8 dígitos = 10.
 * Aceita também com DDI 55 na frente (12-13 dígitos).
 */
export function temDDD(tel?: string | null): boolean {
  const d = soDigitos(tel);
  if (d.startsWith("55") && d.length >= 12) return true; // 55 + DDD + numero
  return d.length >= 10; // DDD + numero (fixo 10, celular 11)
}

/**
 * Número normalizado para o WhatsApp (com DDI 55).
 * Retorna null se não houver DDD suficiente.
 */
export function waNumero(tel?: string | null): string | null {
  const d = soDigitos(tel);
  if (!d) return null;
  if (d.startsWith("55") && d.length >= 12) return d; // já tem DDI
  if (d.length >= 10 && d.length <= 11) return "55" + d; // assume Brasil
  return null;
}

/**
 * Link direto para o contato no WhatsApp com mensagem pré-preenchida.
 * Se não houver número válido, cai no compartilhamento genérico (sem contato).
 */
export function waLink(tel: string | null | undefined, texto: string): string {
  const num = waNumero(tel);
  const msg = encodeURIComponent(texto);
  return num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
}
