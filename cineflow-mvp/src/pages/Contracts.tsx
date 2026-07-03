import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loading } from "@/components/ui/loading"
import { Empty } from "@/components/ui/empty"
import { usePermissions } from "@/hooks/usePermissions"
import { AnexarContratoDialog } from "@/components/contracts/AnexarContratoDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileSignature, Lock, Plus, Paperclip, Search, ExternalLink, Trash2, Upload, Eye } from "lucide-react"
import { toast } from "sonner"

type ContratoStatus = "rascunho" | "enviado_assinatura" | "assinado" | "vigente" | "encerrado" | "cancelado"
type ContratoTipo = "servicos_tecnicos" | "roteirista" | "direcao" | "elenco" | "fornecedor" | "cessao_direitos" | "coproducao" | "outro"

type ContratoRow = {
  id: string
  tipo: ContratoTipo | null
  status: ContratoStatus | null
  valor: number | null
  origem: string | null
  funcao_av_id: string | null
  pessoa_id: string | null
  partes: Record<string, unknown> | null
  criado_em: string
  contrato_anexos: { count: number }[]
}

const STATUS_LABELS: Record<ContratoStatus, string> = {
  rascunho: "Rascunho",
  enviado_assinatura: "Enviado p/ Assinatura",
  assinado: "Assinado",
  vigente: "Vigente",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
}

const STATUS_CLASSES: Record<ContratoStatus, string> = {
  rascunho: "bg-gray-100 text-gray-700 border-gray-200",
  enviado_assinatura: "bg-amber-100 text-amber-700 border-amber-200",
  assinado: "bg-blue-100 text-blue-700 border-blue-200",
  vigente: "bg-green-100 text-green-700 border-green-200",
  encerrado: "bg-purple-100 text-purple-700 border-purple-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
}

const TIPO_LABELS: Record<ContratoTipo, string> = {
  servicos_tecnicos: "Serviços Técnicos",
  roteirista: "Roteirista",
  direcao: "Direção",
  elenco: "Elenco",
  fornecedor: "Fornecedor",
  cessao_direitos: "Cessão de Direitos",
  coproducao: "Coprodução",
  outro: "Outro",
}

function fmtBRL(v: number | null): string {
  if (v == null) return "—"
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function contratadaNome(partes: Record<string, unknown> | null): string {
  if (!partes) return "—"
  const c = partes.contratada as Record<string, string> | undefined
  return c?.razao_social || c?.nome || "—"
}

export default function Contracts() {
  const { id: projetoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can, isLoading: permsLoading } = usePermissions(projetoId)
  const canVer = can("contratos", "ver")
  const canEdit = can("contratos", "editar")

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("__all__")
  const [filterTipo, setFilterTipo] = useState<string>("__all__")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [anexarOpen, setAnexarOpen] = useState(false)

  const { data: contratos, isLoading } = useQuery({
    queryKey: ["contratos", projetoId],
    enabled: !!projetoId && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, tipo, status, valor, origem, funcao_av_id, pessoa_id, partes, criado_em, contrato_anexos(count)")
        .eq("projeto_id", projetoId!)
        .order("criado_em", { ascending: false })
      if (error) throw error
      return data as ContratoRow[]
    },
  })

  const deletar = useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar paths dos anexos para remover do storage
      const { data: anexos } = await supabase
        .from("contrato_anexos")
        .select("arquivo_path")
        .eq("contrato_id", id)

      // 2. Remover arquivos do bucket (evita órfãos — cascade só apaga as linhas)
      if (anexos && anexos.length > 0) {
        const paths = (anexos as { arquivo_path: string }[]).map((a) => a.arquivo_path).filter(Boolean)
        if (paths.length > 0) {
          await supabase.storage.from("documentos").remove(paths)
        }
      }

      // 3. Excluir contrato (on delete cascade limpa contrato_anexos)
      const { error } = await supabase.from("contratos").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Contrato excluído")
      setDeletingId(null)
      qc.invalidateQueries({ queryKey: ["contratos", projetoId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function visualizarContrato(id: string) {
    const { data: anexos, error } = await supabase
      .from("contrato_anexos")
      .select("arquivo_path")
      .eq("contrato_id", id)
      .order("criado_em", { ascending: false })
      .limit(1)

    if (error || !anexos || anexos.length === 0) {
      toast.error("Nenhum documento encontrado")
      return
    }

    const path = (anexos[0] as { arquivo_path: string }).arquivo_path
    if (!path) {
      toast.error("Caminho do arquivo não encontrado")
      return
    }

    const { data: urlData, error: urlErr } = await supabase.storage
      .from("documentos")
      .createSignedUrl(path, 300)

    if (urlErr || !urlData?.signedUrl) {
      toast.error("Erro ao abrir o documento")
      return
    }

    window.open(urlData.signedUrl, "_blank")
  }

  if (permsLoading) return <Loading />
  if (!canVer) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <Lock className="h-10 w-10" />
      <p className="text-sm">Conteúdo restrito. Você não tem permissão para visualizar esta seção.</p>
    </div>
  )
  if (isLoading) return <Loading />

  const filtered = (contratos ?? []).filter((c) => {
    if (filterStatus !== "__all__" && c.status !== filterStatus) return false
    if (filterTipo !== "__all__" && c.tipo !== filterTipo) return false
    if (search) {
      const nome = contratadaNome(c.partes).toLowerCase()
      if (!nome.includes(search.toLowerCase())) return false
    }
    return true
  })

  // Contrato sendo deletado (para exibir nome no dialog)
  const contratoParaDeletar = contratos?.find((c) => c.id === deletingId)

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Contratos</h2>
          <span className="text-sm text-muted-foreground">({contratos?.length ?? 0})</span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnexarOpen(true)}
            >
              <Upload className="h-4 w-4" /> Anexar contrato pronto
            </Button>
            <Button size="sm" onClick={() => navigate(`/projetos/${projetoId}/producao/contratos/novo`)}>
              <Plus className="h-4 w-4" /> Novo contrato
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9 w-52"
            placeholder="Buscar por contratada..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABELS) as ContratoStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {(Object.keys(TIPO_LABELS) as ContratoTipo[]).map((t) => (
              <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <Empty
          title="Nenhum contrato encontrado"
          description={contratos?.length ? "Tente ajustar os filtros." : "Crie o primeiro contrato ou anexe um já existente."}
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Contratada</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Docs</th>
                <th className="px-4 py-3 text-center font-medium min-w-[180px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const count = (c.contrato_anexos?.[0] as unknown as { count: number | string } | undefined)?.count
                const nAnexos = count != null ? parseInt(String(count), 10) : 0
                const isUpload = c.origem === "upload"
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.tipo ? (TIPO_LABELS[c.tipo] ?? c.tipo) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{contratadaNome(c.partes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(c.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      {c.status ? (
                        <Badge className={`text-[11px] border ${STATUS_CLASSES[c.status]}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {nAnexos > 0 ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          {nAnexos}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {isUpload && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => visualizarContrato(c.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={isUpload ? "h-7 gap-1 text-xs text-muted-foreground" : "h-7 gap-1"}
                          onClick={() => navigate(`/projetos/${projetoId}/producao/contratos/${c.id}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {isUpload ? "Form." : "Abrir"}
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeletingId(c.id)}
                            title="Excluir contrato"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir contrato?</DialogTitle>
            <DialogDescription>
              {contratoParaDeletar
                ? `"${contratadaNome(contratoParaDeletar.partes)}" — ${contratoParaDeletar.tipo ? (TIPO_LABELS[contratoParaDeletar.tipo] ?? contratoParaDeletar.tipo) : "sem tipo"}`
                : null}
              <br />
              Esta ação remove o contrato e todos os anexos. Não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={deletar.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deletar.mutate(deletingId)}
              disabled={deletar.isPending}
            >
              {deletar.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de anexar contrato pronto */}
      {projetoId && (
        <AnexarContratoDialog
          projetoId={projetoId}
          open={anexarOpen}
          onClose={() => setAnexarOpen(false)}
        />
      )}
    </div>
  )
}
