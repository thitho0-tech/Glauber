import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loading } from "@/components/ui/loading"
import { Upload, FileText, ImageIcon, ExternalLink, Loader2, Trash2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Rotulo = "minuta" | "gerado" | "assinado" | "aditivo" | "outro"

type Anexo = {
  id: string
  contrato_id: string
  rotulo: Rotulo
  arquivo_path: string
  mime: string | null
  tamanho: number | null
  enviado_por: string | null
  criado_em: string
}

const ROTULO_LABELS: Record<Rotulo, string> = {
  minuta: "Minuta",
  gerado: "Gerado pelo sistema",
  assinado: "Assinado",
  aditivo: "Aditivo",
  outro: "Outro",
}

const ROTULO_COLORS: Record<Rotulo, string> = {
  minuta: "bg-gray-100 text-gray-700",
  gerado: "bg-blue-100 text-blue-700",
  assinado: "bg-green-100 text-green-700",
  aditivo: "bg-amber-100 text-amber-700",
  outro: "bg-slate-100 text-slate-700",
}

function formatBytes(b: number | null): string {
  if (!b) return ""
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(path: string) {
  if (/\.(jpg|jpeg|png|webp)$/i.test(path)) return <ImageIcon className="h-4 w-4 shrink-0" />
  return <FileText className="h-4 w-4 shrink-0" />
}

interface Props {
  contratoId: string
  projetoId: string
  canEdit: boolean
}

export function ContratoAnexos({ contratoId, projetoId, canEdit }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [rotulo, setRotulo] = useState<Rotulo>("minuta")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const { data: anexos, isLoading } = useQuery({
    queryKey: ["contrato-anexos", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_anexos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("criado_em", { ascending: false })
      if (error) throw error
      return data as Anexo[]
    },
  })

  async function handleFile(file: File) {
    const MAX_MB = 10
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`Arquivo muito grande (máx ${MAX_MB} MB)`)
      return
    }
    const ext = file.name.split(".").pop() ?? "bin"
    const path = `contratos/${projetoId}/${contratoId}/${crypto.randomUUID()}.${ext}`
    setUploading(true)
    setUploadError("")
    const { error: upErr } = await supabase.storage
      .from("documentos")
      .upload(path, file, { upsert: false })
    if (upErr) {
      setUploadError(upErr.message)
      setUploading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { error: dbErr } = await supabase.from("contrato_anexos").insert({
      contrato_id: contratoId,
      projeto_id: projetoId,
      rotulo,
      arquivo_path: path,
      mime: file.type || null,
      tamanho: file.size,
      enviado_por: user?.id ?? null,
    })
    if (dbErr) {
      await supabase.storage.from("documentos").remove([path])
      setUploadError(dbErr.message)
      setUploading(false)
      return
    }
    setUploading(false)
    toast.success("Arquivo enviado")
    qc.invalidateQueries({ queryKey: ["contrato-anexos", contratoId] })
  }

  const deletar = useMutation({
    mutationFn: async (anexo: Anexo) => {
      const { error: stErr } = await supabase.storage.from("documentos").remove([anexo.arquivo_path])
      if (stErr) throw stErr
      const { error: dbErr } = await supabase.from("contrato_anexos").delete().eq("id", anexo.id)
      if (dbErr) throw dbErr
    },
    onSuccess: () => {
      toast.success("Arquivo removido")
      qc.invalidateQueries({ queryKey: ["contrato-anexos", contratoId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function abrirAnexo(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 300)
    if (error) { toast.error("Erro ao gerar link"); return }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      {/* Upload row */}
      {canEdit && (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ""
            }}
          />
          <div className="flex items-center gap-2">
            <Select value={rotulo} onValueChange={(v) => setRotulo(v as Rotulo)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minuta">Minuta</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="aditivo">Aditivo</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Anexar arquivo (PDF/JPG/PNG ≤ 10 MB)</>
              )}
            </Button>
          </div>
          {uploadError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {(!anexos || anexos.length === 0) ? (
        <p className="text-sm text-muted-foreground py-2">Nenhum documento anexado.</p>
      ) : (
        <div className="space-y-2">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              {fileIcon(a.arquivo_path)}
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {a.arquivo_path.split("/").pop()}
              </span>
              <Badge className={`text-[10px] ${ROTULO_COLORS[a.rotulo]}`}>
                {ROTULO_LABELS[a.rotulo]}
              </Badge>
              {a.tamanho && (
                <span className="text-[10px] text-muted-foreground">{formatBytes(a.tamanho)}</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => abrirAnexo(a.arquivo_path)}
                title="Visualizar"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deletar.mutate(a)}
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
