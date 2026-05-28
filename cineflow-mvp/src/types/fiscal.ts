// src/types/fiscal.ts
// Sprint 1B — Tipos para fornecedores, regimes e audit log

export type Fornecedor = {
  id: string;
  org_id: string;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  tipo: "pj" | "pf" | "mei" | "outro";
  email: string | null;
  telefone: string | null;
  dados_bancarios: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipo_conta?: "corrente" | "poupanca" | "pix";
    chave_pix?: string;
  };
  ativo: boolean;
  criado_em: string;
};

export type RegimeContratacao = {
  id: string;
  pessoa_id: string;
  projeto_id: string;
  tipo: "rpa" | "clt" | "mei" | "pj" | "diarista" | "voluntario";
  valor_bruto: number;
  valor_liquido: number;
  dias_contrato: number;
  dados_rpa: {
    inss_pct?: number;
    ir_pct?: number;
    observacao?: string;
  };
  ativo: boolean;
  criado_em: string;
};

export type AuditEntry = {
  id: string;
  tabela: string;
  registro_id: string;
  operacao: "insert" | "update" | "delete";
  dados_antes: Record<string, any> | null;
  dados_depois: Record<string, any> | null;
  user_id: string;
  projeto_id: string;
  criado_em: string;
};
