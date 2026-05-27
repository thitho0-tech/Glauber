export type Papel =
  | "owner" | "admin_financeiro" | "diretor_producao"
  | "diretor" | "ad" | "chefe_departamento" | "equipe";

export type Departamento =
  | "producao" | "direcao" | "camera" | "arte" | "som"
  | "figurino" | "maquiagem" | "pos" | "elenco" | "outros";

export type TipoProjeto =
  | "curta" | "longa" | "serie" | "publicidade"
  | "clipe" | "documentario" | "outro";

export type StatusProjeto =
  | "pre_producao" | "producao" | "pos_producao"
  | "concluido" | "cancelado";

export type StatusDespesa = "pendente" | "aprovada" | "rejeitada";
export type StatusValidacao = "ok" | "warn" | "fail";

export interface Org { id: string; nome: string; cnpj: string | null; plano: string; criado_em: string; }
export interface Membership { id: string; org_id: string; user_id: string; papel: Papel; departamento: string | null; ativo: boolean; }
export interface Edital { id: string; nome: string; orgao: string; vigencia: string | null; prazo_prestacao_meses: number | null; observacoes: string | null; }
export interface RubricaEdital { id: string; edital_id: string; codigo: string; nome: string; perc_max: number | null; observacoes: string | null; }

export interface Projeto {
  id: string;
  org_id: string;
  nome: string;
  tipo: TipoProjeto;
  status: StatusProjeto;
  edital_id: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  orcamento_total: number;
  criado_em: string;
}

export interface Pessoa {
  id: string;
  org_id: string;
  nome: string;
  funcao: string | null;
  departamento: Departamento | null;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  valor_diaria: number;
  foto_url: string | null;
}

export interface Locacao {
  id: string;
  org_id: string;
  nome: string;
  endereco: string | null;
  lat: number | null;
  lng: number | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  valor_diaria: number | null;
  restricoes: string | null;
  fotos_urls: string[] | null;
}

export interface DiaFilmagem {
  id: string;
  projeto_id: string;
  data: string;
  chamada_geral: string | null;
  locacao_id: string | null;
  status: "planejado" | "confirmado" | "em_filmagem" | "concluido" | "adiado";
  observacoes: string | null;
}

export interface Escala {
  id: string;
  dia_id: string;
  pessoa_id: string;
  papel: string | null;
  hora_chamada: string | null;
  hora_almoco: string | null;
  transporte: string | null;
  observacoes: string | null;
}

export interface OrdemDoDia {
  id: string;
  dia_id: string;
  versao: number;
  dados_json: Record<string, unknown>;
  token_publico: string | null;
  publicada_em: string | null;
  publicada_por: string | null;
  criado_em: string;
}

export interface Orcamento { id: string; projeto_id: string; versao: number; total: number; aprovado_em: string | null; }
export interface LinhaOrcamento { id: string; orcamento_id: string; rubrica_codigo: string | null; descricao: string; valor_previsto: number; valor_realizado: number; }

export interface Despesa {
  id: string;
  projeto_id: string;
  linha_orcamento_id: string | null;
  descricao: string;
  valor: number;
  data: string;
  departamento: string | null;
  comprovante_url: string | null;
  cnpj_emitente: string | null;
  numero_nf: string | null;
  status: StatusDespesa;
  criado_em: string;
}

export interface ValidacaoEdital { id: string; despesa_id: string; status: StatusValidacao; mensagem: string | null; gerada_em: string; }
