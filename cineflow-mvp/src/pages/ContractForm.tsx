import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loading } from "@/components/ui/loading"
import { usePermissions } from "@/hooks/usePermissions"
import { ContratoAnexos } from "@/components/contracts/ContratoAnexos"
import { exportarContratoEmPdf, type ContratoParaPdf } from "@/lib/contratoTemplate"
import { valorPorExtenso } from "@/lib/valorPorExtenso"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, Plus, Trash2, FileDown, Lock, Save } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────

type ContratoStatus = "rascunho" | "enviado_assinatura" | "assinado" | "vigente" | "encerrado" | "cancelado"
type ContratoTipo = "servicos_tecnicos" | "roteirista" | "direcao" | "elenco" | "fornecedor" | "cessao_direitos" | "coproducao" | "outro"

interface FormState {
  tipo: ContratoTipo
  status: ContratoStatus
  numero: string
  funcao_av_id: string
  pessoa_id: string
  lei_incentivo: string
  termo_numero: string
  contratada_tipo: "pj" | "pf"
  objeto: string
  valor: string
  data_assinatura: string
  vigencia_inicio: string
  vigencia_fim: string
  observacoes: string
}

interface Contratante { razao_social: string; cnpj: string; endereco: string; rep_legal: string; cpf_rep: string; email: string }
interface Contratada { razao_social: string; cnpj: string; cpf: string; nome: string; endereco: string; rep_legal: string; email: string; rg: string; orgao_rg: string; nacionalidade: string; estado_civil: string; profissao: string; banco: string; agencia: string; conta: string; pix: string }
interface Interveniente { nome: string; nome_artistico: string; cpf: string; rg: string; orgao_rg: string; nacionalidade: string; estado_civil: string; profissao: string; endereco: string; email: string }
interface Prazos { prep_inicio: string; prep_fim: string; prod_inicio: string; prod_fim: string; pos_inicio: string; pos_fim: string }
interface Partes { contratante: Contratante; contratada: Contratada; interveniente: Interveniente; prazos: Prazos }
interface Clausulas { cessao_direitos: boolean; exclusividade: boolean; confidencialidade_anos: string; multa_rescisoria_pct: string; credito_formato: string; foro: string }
interface Parcela { valor: string; percentual: string; gatilho: string; data_prevista: string }

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultForm: FormState = {
  tipo: "servicos_tecnicos", status: "rascunho", numero: "",
  funcao_av_id: "__none__", pessoa_id: "__none__", lei_incentivo: "__none__",
  termo_numero: "", contratada_tipo: "pf", objeto: "", valor: "",
  data_assinatura: "", vigencia_inicio: "", vigencia_fim: "", observacoes: "",
}

const defaultContratante: Contratante = { razao_social: "", cnpj: "", endereco: "", rep_legal: "", cpf_rep: "", email: "" }
const defaultContratada: Contratada = { razao_social: "", cnpj: "", cpf: "", nome: "", endereco: "", rep_legal: "", email: "", rg: "", orgao_rg: "", nacionalidade: "", estado_civil: "", profissao: "", banco: "", agencia: "", conta: "", pix: "" }
const defaultInterv: Interveniente = { nome: "", nome_artistico: "", cpf: "", rg: "", orgao_rg: "", nacionalidade: "", estado_civil: "", profissao: "", endereco: "", email: "" }
const defaultPrazos: Prazos = { prep_inicio: "", prep_fim: "", prod_inicio: "", prod_fim: "", pos_inicio: "", pos_fim: "" }
const defaultPartes: Partes = { contratante: defaultContratante, contratada: defaultContratada, interveniente: defaultInterv, prazos: defaultPrazos }
const defaultClausulas: Clausulas = { cessao_direitos: false, exclusividade: false, confidencialidade_anos: "", multa_rescisoria_pct: "", credito_formato: "", foro: "" }

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ContratoStatus, string> = {
  rascunho: "Rascunho", enviado_assinatura: "Enviado p/ Assinatura", assinado: "Assinado",
  vigente: "Vigente", encerrado: "Encerrado", cancelado: "Cancelado",
}

const TIPO_LABELS: Record<ContratoTipo, string> = {
  servicos_tecnicos: "Prestação de Serviços Técnicos", roteirista: "Roteirista", direcao: "Direção",
  elenco: "Elenco", fornecedor: "Fornecedor/Locação", cessao_direitos: "Cessão de Direitos",
  coproducao: "Coprodução/Apoio", outro: "Outro",
}

const LEI_OPTS = ["__none__", "SIC", "Funcultura", "Lei Paulo Gustavo", "RioFilme", "Lei Rouanet", "Nenhum/Privado", "Outro"]

// ─── Helper components ────────────────────────────────────────────────────────

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div className={cn("grid gap-3", cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>{children}</div>
}

function F({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

function Inp({ value, onChange, type = "text", placeholder = "", disabled = false }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean }) {
  return <Input className="h-8 text-sm" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContractForm() {
  const { id: projetoId, contratoId } = useParams<{ id: string; contratoId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNovo = contratoId === "novo"

  const { can, isLoading: permsLoading } = usePermissions(projetoId)
  const canVer = can("contratos", "ver")
  const canEdit = can("contratos", "editar")

  const [form, setForm] = useState<FormState>(defaultForm)
  const [partes, setPartes] = useState<Partes>(defaultPartes)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [clausulas, setClausulas] = useState<Clausulas>(defaultClausulas)
  const [exportando, setExportando] = useState(false)

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))
  const updCt = (k: keyof Contratante, v: string) => setPartes(p => ({ ...p, contratante: { ...p.contratante, [k]: v } }))
  const updCd = (k: keyof Contratada, v: string) => setPartes(p => ({ ...p, contratada: { ...p.contratada, [k]: v } }))
  const updInv = (k: keyof Interveniente, v: string) => setPartes(p => ({ ...p, interveniente: { ...p.interveniente, [k]: v } }))
  const updPrazos = (k: keyof Prazos, v: string) => setPartes(p => ({ ...p, prazos: { ...p.prazos, [k]: v } }))
  const updCl = <K extends keyof Clausulas>(k: K, v: Clausulas[K]) => setClausulas(c => ({ ...c, [k]: v }))
  const addParcela = () => setParcelas(prev => [...prev, { valor: "", percentual: "", gatilho: "", data_prevista: "" }])
  const removeParcela = (i: number) => setParcelas(prev => prev.filter((_, idx) => idx !== i))
  const updParcela = <K extends keyof Parcela>(i: number, k: K, v: Parcela[K]) => setParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p))

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: projeto } = useQuery({
    queryKey: ["projeto-min", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projetos").select("id, nome").eq("id", projetoId!).single()
      if (error) throw error
      return data
    },
  })

  const { data: contrato, isLoading: loadingContrato } = useQuery({
    queryKey: ["contrato-form", contratoId],
    enabled: !isNovo && !!contratoId && canVer,
    queryFn: async () => {
      const { data, error } = await supabase.from("contratos").select("*").eq("id", contratoId!).single()
      if (error) throw error
      return data
    },
  })

  const { data: funcoes } = useQuery({
    queryKey: ["funcoes-av"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcoes_av").select("id, nome, departamento").order("departamento").order("nome")
      if (error) throw error
      return data as { id: string; nome: string; departamento: string }[]
    },
  })

  const { data: membros } = useQuery({
    queryKey: ["projeto-membros-select", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoas(id, nome)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
      if (error) throw error
      return (data ?? []).map((m: any) => {
        const p = Array.isArray(m.pessoas) ? m.pessoas[0] : m.pessoas
        return p ? { ppId: m.id as string, id: p.id as string, nome: p.nome as string } : null
      }).filter(Boolean) as { ppId: string; id: string; nome: string }[]
    },
  })

  // ── Load existing ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!contrato) return
    setForm({
      tipo: contrato.tipo ?? "servicos_tecnicos",
      status: contrato.status ?? "rascunho",
      numero: contrato.numero ?? "",
      funcao_av_id: contrato.funcao_av_id ?? "__none__",
      pessoa_id: contrato.pessoa_id ?? "__none__",
      lei_incentivo: contrato.lei_incentivo ?? "__none__",
      termo_numero: contrato.termo_numero ?? "",
      contratada_tipo: contrato.contratada_tipo ?? "pf",
      objeto: contrato.objeto ?? "",
      valor: contrato.valor != null ? String(contrato.valor) : "",
      data_assinatura: contrato.data_assinatura ?? "",
      vigencia_inicio: contrato.vigencia_inicio ?? "",
      vigencia_fim: contrato.vigencia_fim ?? "",
      observacoes: contrato.observacoes ?? "",
    })
    if (contrato.partes && typeof contrato.partes === "object") {
      setPartes({ ...defaultPartes, ...(contrato.partes as Partial<Partes>) })
    }
    if (Array.isArray(contrato.parcelas)) {
      setParcelas((contrato.parcelas as Partial<Parcela>[]).map(p => ({
        valor: p.valor != null ? String(p.valor) : "",
        percentual: p.percentual != null ? String(p.percentual) : "",
        gatilho: p.gatilho ?? "",
        data_prevista: p.data_prevista ?? "",
      })))
    }
    if (contrato.clausulas && typeof contrato.clausulas === "object") {
      const cl = contrato.clausulas as Record<string, unknown>
      setClausulas({
        cessao_direitos: !!cl.cessao_direitos,
        exclusividade: !!cl.exclusividade,
        confidencialidade_anos: cl.confidencialidade_anos != null ? String(cl.confidencialidade_anos) : "",
        multa_rescisoria_pct: cl.multa_rescisoria_pct != null ? String(cl.multa_rescisoria_pct) : "",
        credito_formato: (cl.credito_formato as string) ?? "",
        foro: (cl.foro as string) ?? "",
      })
    }
  }, [contrato])

  // ── Save ──────────────────────────────────────────────────────────────────────

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        projeto_id: projetoId!,
        tipo: form.tipo,
        status: form.status,
        numero: form.numero || null,
        funcao_av_id: form.funcao_av_id === "__none__" ? null : form.funcao_av_id || null,
        pessoa_id: form.pessoa_id === "__none__" ? null : form.pessoa_id || null,
        lei_incentivo: form.lei_incentivo === "__none__" ? null : form.lei_incentivo || null,
        termo_numero: form.termo_numero || null,
        contratada_tipo: form.contratada_tipo,
        objeto: form.objeto || null,
        valor: form.valor !== "" ? parseFloat(form.valor) : null,
        data_assinatura: form.data_assinatura || null,
        vigencia_inicio: form.vigencia_inicio || null,
        vigencia_fim: form.vigencia_fim || null,
        observacoes: form.observacoes || null,
        partes,
        parcelas: parcelas.map(p => ({
          valor: p.valor !== "" ? parseFloat(p.valor) : null,
          percentual: p.percentual !== "" ? parseFloat(p.percentual) : null,
          gatilho: p.gatilho || "",
          data_prevista: p.data_prevista || null,
        })),
        clausulas: {
          cessao_direitos: clausulas.cessao_direitos,
          exclusividade: clausulas.exclusividade,
          confidencialidade_anos: clausulas.confidencialidade_anos !== "" ? parseFloat(clausulas.confidencialidade_anos) : null,
          multa_rescisoria_pct: clausulas.multa_rescisoria_pct !== "" ? parseFloat(clausulas.multa_rescisoria_pct) : null,
          credito_formato: clausulas.credito_formato || "",
          foro: clausulas.foro || "",
        },
      }
      if (isNovo) {
        const { data, error } = await supabase.from("contratos").insert(payload).select("id").single()
        if (error) throw error
        return data.id as string
      } else {
        const { error } = await supabase.from("contratos").update(payload).eq("id", contratoId!)
        if (error) throw error
        return null
      }
    },
    onSuccess: (newId) => {
      toast.success(isNovo ? "Contrato criado" : "Contrato salvo")
      if (isNovo && newId) {
        navigate(`/projetos/${projetoId}/producao/contratos/${newId}`, { replace: true })
      } else {
        qc.invalidateQueries({ queryKey: ["contrato-form", contratoId] })
      }
      qc.invalidateQueries({ queryKey: ["contratos", projetoId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── PDF export ────────────────────────────────────────────────────────────────

  async function exportarPdf() {
    if (isNovo || !contratoId) { toast.error("Salve o contrato antes de exportar."); return }
    const funcaoNome = funcoes?.find(f => f.id === form.funcao_av_id)?.nome ?? ""
    const contratoData: ContratoParaPdf = {
      tipo: form.tipo, numero: form.numero || null, status: form.status,
      lei_incentivo: form.lei_incentivo === "__none__" ? null : form.lei_incentivo || null,
      termo_numero: form.termo_numero || null, objeto: form.objeto || null,
      valor: form.valor !== "" ? parseFloat(form.valor) : null,
      data_assinatura: form.data_assinatura || null, vigencia_inicio: form.vigencia_inicio || null,
      vigencia_fim: form.vigencia_fim || null, observacoes: form.observacoes || null,
      contratada_tipo: form.contratada_tipo, funcao_nome: funcaoNome,
      projeto_nome: projeto?.nome ?? "", partes,
      parcelas: parcelas.map(p => ({
        valor: p.valor !== "" ? parseFloat(p.valor) : null,
        percentual: p.percentual !== "" ? parseFloat(p.percentual) : null,
        gatilho: p.gatilho, data_prevista: p.data_prevista || null,
      })),
      clausulas: {
        cessao_direitos: clausulas.cessao_direitos, exclusividade: clausulas.exclusividade,
        confidencialidade_anos: clausulas.confidencialidade_anos !== "" ? parseFloat(clausulas.confidencialidade_anos) : null,
        multa_rescisoria_pct: clausulas.multa_rescisoria_pct !== "" ? parseFloat(clausulas.multa_rescisoria_pct) : null,
        credito_formato: clausulas.credito_formato, foro: clausulas.foro,
      },
    }
    setExportando(true)
    try {
      const blob = await exportarContratoEmPdf(contratoData)
      const filename = `contrato_${form.numero || contratoId}_${Date.now()}.pdf`
      const path = `contratos/${projetoId}/${contratoId}/${filename}`
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, blob, { upsert: false, contentType: "application/pdf" })
      if (!upErr) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from("contrato_anexos").insert({
          contrato_id: contratoId, projeto_id: projetoId, rotulo: "gerado",
          arquivo_path: path, mime: "application/pdf", tamanho: blob.size,
          enviado_por: user?.id ?? null,
        })
        qc.invalidateQueries({ queryKey: ["contrato-anexos", contratoId] })
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      toast.success("PDF gerado e salvo como anexo")
    } catch (e: unknown) {
      toast.error("Erro ao gerar PDF: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExportando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (permsLoading) return <Loading />
  if (!canVer) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <Lock className="h-10 w-10" />
      <p className="text-sm">Conteúdo restrito.</p>
    </div>
  )
  if (!isNovo && loadingContrato) return <Loading />

  const isPj = form.contratada_tipo === "pj"
  const valorNum = form.valor !== "" ? parseFloat(form.valor) : null
  const extenso = valorPorExtenso(valorNum)

  const deptoGrupos: Record<string, typeof funcoes> = {}
  funcoes?.forEach(f => {
    if (!deptoGrupos[f.departamento]) deptoGrupos[f.departamento] = []
    deptoGrupos[f.departamento]!.push(f)
  })

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to={`/projetos/${projetoId}/producao/contratos`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Contratos
        </Link>
        <div className="flex gap-2">
          {!isNovo && canEdit && (
            <Button variant="outline" size="sm" onClick={exportarPdf} disabled={exportando}>
              <FileDown className="h-4 w-4" />
              {exportando ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4" />
              {save.isPending ? "Salvando..." : isNovo ? "Criar contrato" : "Salvar alterações"}
            </Button>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold">{isNovo ? "Novo contrato" : "Editar contrato"} <span className="text-muted-foreground font-normal text-base">— {projeto?.nome}</span></h2>

      {!canEdit && <p className="text-xs text-muted-foreground">Somente leitura — você não tem permissão para editar.</p>}

      {/* ── Bloco A: Identificação ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">A — Identificação do contrato</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row cols={3}>
            <F label="Tipo *">
              <Select value={form.tipo} onValueChange={v => setF("tipo", v as ContratoTipo)} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_LABELS) as [ContratoTipo, string][]).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Status *">
              <Select value={form.status} onValueChange={v => setF("status", v as ContratoStatus)} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_LABELS) as [ContratoStatus, string][]).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Nº do contrato"><Inp value={form.numero} onChange={v => setF("numero", v)} placeholder="Ex: 001/2026" disabled={!canEdit} /></F>
          </Row>
          <Row>
            <F label="Função contratada (catálogo)">
              <Select value={form.funcao_av_id} onValueChange={v => setF("funcao_av_id", v)} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar função..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {Object.entries(deptoGrupos).map(([depto, fns]) => (
                    <div key={depto}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{depto}</div>
                      {fns?.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Pessoa (membro da equipe)">
              <Select value={form.pessoa_id} onValueChange={v => setF("pessoa_id", v)} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vincular membro..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {membros?.map(m => (
                    <SelectItem key={m.ppId} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </Row>
          <Row>
            <F label="Lei / Edital de incentivo">
              <Select value={form.lei_incentivo} onValueChange={v => setF("lei_incentivo", v)} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {LEI_OPTS.filter(o => o !== "__none__").map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Nº Termo de Compromisso / Execução"><Inp value={form.termo_numero} onChange={v => setF("termo_numero", v)} placeholder="Ex: TC-SIC-2026-001" disabled={!canEdit} /></F>
          </Row>
        </CardContent>
      </Card>

      {/* ── Bloco B: Contratante ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">B — Contratante (Produtora)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row>
            <F label="Razão Social *"><Inp value={partes.contratante.razao_social} onChange={v => updCt("razao_social", v)} disabled={!canEdit} /></F>
            <F label="CNPJ *"><Inp value={partes.contratante.cnpj} onChange={v => updCt("cnpj", v)} placeholder="00.000.000/0000-00" disabled={!canEdit} /></F>
          </Row>
          <F label="Endereço / Sede"><Inp value={partes.contratante.endereco} onChange={v => updCt("endereco", v)} disabled={!canEdit} /></F>
          <Row cols={3}>
            <F label="Representante Legal *"><Inp value={partes.contratante.rep_legal} onChange={v => updCt("rep_legal", v)} disabled={!canEdit} /></F>
            <F label="CPF do Representante"><Inp value={partes.contratante.cpf_rep} onChange={v => updCt("cpf_rep", v)} placeholder="000.000.000-00" disabled={!canEdit} /></F>
            <F label="E-mail"><Inp value={partes.contratante.email} onChange={v => updCt("email", v)} type="email" disabled={!canEdit} /></F>
          </Row>
        </CardContent>
      </Card>

      {/* ── Bloco C: Contratada ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">C — Contratada</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* PJ / PF toggle */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo de pessoa *</Label>
            <div className="inline-flex rounded-md border overflow-hidden">
              {(["pf", "pj"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setF("contratada_tipo", t)}
                  className={cn(
                    "px-5 py-1.5 text-sm font-medium transition-colors",
                    form.contratada_tipo === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                    !canEdit && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {t === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                </button>
              ))}
            </div>
          </div>

          {isPj ? (
            <>
              <Row>
                <F label="Razão Social *"><Inp value={partes.contratada.razao_social} onChange={v => updCd("razao_social", v)} disabled={!canEdit} /></F>
                <F label="CNPJ *"><Inp value={partes.contratada.cnpj} onChange={v => updCd("cnpj", v)} placeholder="00.000.000/0000-00" disabled={!canEdit} /></F>
              </Row>
              <F label="Endereço"><Inp value={partes.contratada.endereco} onChange={v => updCd("endereco", v)} disabled={!canEdit} /></F>
              <Row cols={3}>
                <F label="Representante Legal"><Inp value={partes.contratada.rep_legal} onChange={v => updCd("rep_legal", v)} disabled={!canEdit} /></F>
                <F label="E-mail"><Inp value={partes.contratada.email} onChange={v => updCd("email", v)} type="email" disabled={!canEdit} /></F>
              </Row>
            </>
          ) : (
            <>
              <Row>
                <F label="Nome Completo *"><Inp value={partes.contratada.nome} onChange={v => updCd("nome", v)} disabled={!canEdit} /></F>
                <F label="CPF *"><Inp value={partes.contratada.cpf} onChange={v => updCd("cpf", v)} placeholder="000.000.000-00" disabled={!canEdit} /></F>
              </Row>
              <Row cols={3}>
                <F label="RG"><Inp value={partes.contratada.rg} onChange={v => updCd("rg", v)} disabled={!canEdit} /></F>
                <F label="Órgão expedidor"><Inp value={partes.contratada.orgao_rg} onChange={v => updCd("orgao_rg", v)} placeholder="SSP-PE" disabled={!canEdit} /></F>
                <F label="Profissão"><Inp value={partes.contratada.profissao} onChange={v => updCd("profissao", v)} disabled={!canEdit} /></F>
              </Row>
              <Row cols={3}>
                <F label="Nacionalidade"><Inp value={partes.contratada.nacionalidade} onChange={v => updCd("nacionalidade", v)} placeholder="Brasileiro(a)" disabled={!canEdit} /></F>
                <F label="Estado Civil"><Inp value={partes.contratada.estado_civil} onChange={v => updCd("estado_civil", v)} disabled={!canEdit} /></F>
                <F label="E-mail"><Inp value={partes.contratada.email} onChange={v => updCd("email", v)} type="email" disabled={!canEdit} /></F>
              </Row>
              <F label="Endereço"><Inp value={partes.contratada.endereco} onChange={v => updCd("endereco", v)} disabled={!canEdit} /></F>
            </>
          )}

          {/* Dados bancários — sempre visível */}
          <div className="pt-1 border-t">
            <p className="text-xs text-muted-foreground font-medium mb-2">Dados bancários</p>
            <Row cols={4}>
              <F label="Banco"><Inp value={partes.contratada.banco} onChange={v => updCd("banco", v)} disabled={!canEdit} /></F>
              <F label="Agência"><Inp value={partes.contratada.agencia} onChange={v => updCd("agencia", v)} disabled={!canEdit} /></F>
              <F label="Conta"><Inp value={partes.contratada.conta} onChange={v => updCd("conta", v)} disabled={!canEdit} /></F>
              <F label="PIX"><Inp value={partes.contratada.pix} onChange={v => updCd("pix", v)} disabled={!canEdit} /></F>
            </Row>
          </div>
        </CardContent>
      </Card>

      {/* ── Bloco D: Interveniente (só PJ) ───────────────────────────────────── */}
      {isPj && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">D — Interveniente-Anuente (pessoa física da contratada PJ)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row>
              <F label="Nome Completo *"><Inp value={partes.interveniente.nome} onChange={v => updInv("nome", v)} disabled={!canEdit} /></F>
              <F label="Nome Artístico"><Inp value={partes.interveniente.nome_artistico} onChange={v => updInv("nome_artistico", v)} disabled={!canEdit} /></F>
            </Row>
            <Row cols={3}>
              <F label="CPF *"><Inp value={partes.interveniente.cpf} onChange={v => updInv("cpf", v)} placeholder="000.000.000-00" disabled={!canEdit} /></F>
              <F label="RG"><Inp value={partes.interveniente.rg} onChange={v => updInv("rg", v)} disabled={!canEdit} /></F>
              <F label="Órgão expedidor"><Inp value={partes.interveniente.orgao_rg} onChange={v => updInv("orgao_rg", v)} placeholder="SSP-PE" disabled={!canEdit} /></F>
            </Row>
            <Row cols={3}>
              <F label="Nacionalidade"><Inp value={partes.interveniente.nacionalidade} onChange={v => updInv("nacionalidade", v)} placeholder="Brasileiro(a)" disabled={!canEdit} /></F>
              <F label="Estado Civil"><Inp value={partes.interveniente.estado_civil} onChange={v => updInv("estado_civil", v)} disabled={!canEdit} /></F>
              <F label="Profissão"><Inp value={partes.interveniente.profissao} onChange={v => updInv("profissao", v)} disabled={!canEdit} /></F>
            </Row>
            <Row>
              <F label="Endereço"><Inp value={partes.interveniente.endereco} onChange={v => updInv("endereco", v)} disabled={!canEdit} /></F>
              <F label="E-mail"><Inp value={partes.interveniente.email} onChange={v => updInv("email", v)} type="email" disabled={!canEdit} /></F>
            </Row>
          </CardContent>
        </Card>
      )}

      {/* ── Bloco E: Objeto e Prazos ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">E — Objeto e Prazos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <F label="Objeto do contrato *">
            <Textarea
              className="text-sm resize-none"
              rows={3}
              value={form.objeto}
              onChange={e => setF("objeto", e.target.value)}
              placeholder="Descreva os serviços contratados..."
              disabled={!canEdit}
            />
          </F>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Período de preparação / pré-produção</p>
              <Row>
                <F label="Início"><Inp type="date" value={partes.prazos.prep_inicio} onChange={v => updPrazos("prep_inicio", v)} disabled={!canEdit} /></F>
                <F label="Fim"><Inp type="date" value={partes.prazos.prep_fim} onChange={v => updPrazos("prep_fim", v)} disabled={!canEdit} /></F>
              </Row>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Período de produção / gravações *</p>
              <Row>
                <F label="Início"><Inp type="date" value={partes.prazos.prod_inicio} onChange={v => updPrazos("prod_inicio", v)} disabled={!canEdit} /></F>
                <F label="Fim"><Inp type="date" value={partes.prazos.prod_fim} onChange={v => updPrazos("prod_fim", v)} disabled={!canEdit} /></F>
              </Row>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Período de pós-produção</p>
              <Row>
                <F label="Início"><Inp type="date" value={partes.prazos.pos_inicio} onChange={v => updPrazos("pos_inicio", v)} disabled={!canEdit} /></F>
                <F label="Fim"><Inp type="date" value={partes.prazos.pos_fim} onChange={v => updPrazos("pos_fim", v)} disabled={!canEdit} /></F>
              </Row>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Vigência do contrato</p>
              <Row>
                <F label="Início"><Inp type="date" value={form.vigencia_inicio} onChange={v => setF("vigencia_inicio", v)} disabled={!canEdit} /></F>
                <F label="Fim"><Inp type="date" value={form.vigencia_fim} onChange={v => setF("vigencia_fim", v)} disabled={!canEdit} /></F>
              </Row>
            </div>
          </div>
          <F label="Data de assinatura">
            <Input className="h-8 text-sm w-48" type="date" value={form.data_assinatura} onChange={e => setF("data_assinatura", e.target.value)} disabled={!canEdit} />
          </F>
        </CardContent>
      </Card>

      {/* ── Bloco F: Remuneração ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">F — Remuneração</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row>
            <F label="Valor total bruto (R$) *">
              <Input
                className="h-8 text-sm"
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={e => setF("valor", e.target.value)}
                disabled={!canEdit}
              />
            </F>
            <div className="flex flex-col justify-end pb-0.5">
              {extenso && <p className="text-xs text-muted-foreground italic mt-1">{extenso}</p>}
            </div>
          </Row>

          {/* Parcelas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Parcelamento</p>
              {canEdit && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addParcela}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar parcela
                </Button>
              )}
            </div>
            {parcelas.length === 0 && <p className="text-xs text-muted-foreground">Pagamento à vista (sem parcelamento registrado).</p>}
            {parcelas.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_1fr_120px_auto] gap-2 items-end">
                <F label={`${i + 1}ª — Valor (R$)`}>
                  <Input className="h-8 text-sm" type="number" step="0.01" value={p.valor} onChange={e => updParcela(i, "valor", e.target.value)} disabled={!canEdit} />
                </F>
                <F label="ou %">
                  <Input className="h-8 text-sm" type="number" step="0.01" value={p.percentual} onChange={e => updParcela(i, "percentual", e.target.value)} disabled={!canEdit} />
                </F>
                <F label="Gatilho / Condição">
                  <Input className="h-8 text-sm" value={p.gatilho} onChange={e => updParcela(i, "gatilho", e.target.value)} placeholder='Ex: "na assinatura"' disabled={!canEdit} />
                </F>
                <F label="Data prevista">
                  <Input className="h-8 text-sm" type="date" value={p.data_prevista} onChange={e => updParcela(i, "data_prevista", e.target.value)} disabled={!canEdit} />
                </F>
                {canEdit && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 self-end" onClick={() => removeParcela(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Bloco G: Cláusulas ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">G — Cláusulas e Condições</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row>
            <label className={cn("flex items-center gap-2 cursor-pointer", !canEdit && "opacity-50 cursor-not-allowed")}>
              <input type="checkbox" className="rounded" checked={clausulas.cessao_direitos} onChange={e => updCl("cessao_direitos", e.target.checked)} disabled={!canEdit} />
              <span className="text-sm">Cessão de direitos autorais</span>
            </label>
            <label className={cn("flex items-center gap-2 cursor-pointer", !canEdit && "opacity-50 cursor-not-allowed")}>
              <input type="checkbox" className="rounded" checked={clausulas.exclusividade} onChange={e => updCl("exclusividade", e.target.checked)} disabled={!canEdit} />
              <span className="text-sm">Exclusividade durante a vigência</span>
            </label>
          </Row>
          <Row cols={3}>
            <F label="Confidencialidade (anos)">
              <Input className="h-8 text-sm" type="number" min="0" value={clausulas.confidencialidade_anos} onChange={e => updCl("confidencialidade_anos", e.target.value)} disabled={!canEdit} />
            </F>
            <F label="Multa rescisória (%)">
              <Input className="h-8 text-sm" type="number" min="0" max="100" value={clausulas.multa_rescisoria_pct} onChange={e => updCl("multa_rescisoria_pct", e.target.value)} disabled={!canEdit} />
            </F>
            <F label="Foro (comarca)"><Inp value={clausulas.foro} onChange={v => updCl("foro", v)} placeholder="Ex: Recife/PE" disabled={!canEdit} /></F>
          </Row>
          <F label="Crédito na obra (formato)">
            <Input className="h-8 text-sm" value={clausulas.credito_formato} onChange={e => updCl("credito_formato", e.target.value)} placeholder='Ex: "Direção de Fotografia: Nome Sobrenome"' disabled={!canEdit} />
          </F>
          <F label="Observações gerais">
            <Textarea
              className="text-sm resize-none"
              rows={3}
              value={form.observacoes}
              onChange={e => setF("observacoes", e.target.value)}
              disabled={!canEdit}
            />
          </F>
        </CardContent>
      </Card>

      {/* ── Bloco H: Anexos ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">H — Documentos Anexos</CardTitle></CardHeader>
        <CardContent>
          {isNovo ? (
            <p className="text-sm text-muted-foreground">Salve o contrato para poder anexar documentos.</p>
          ) : (
            <ContratoAnexos contratoId={contratoId!} projetoId={projetoId!} canEdit={canEdit} />
          )}
        </CardContent>
      </Card>

      {/* Botão salvar fixo no fundo em mobile */}
      {canEdit && (
        <div className="flex justify-end gap-2 pb-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Salvando..." : isNovo ? "Criar contrato" : "Salvar alterações"}
          </Button>
        </div>
      )}
    </div>
  )
}
