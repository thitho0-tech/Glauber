import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "sonner"
import { Upload, Loader2, AlertCircle, FileText } from "lucide-react"

type ContratoStatus = "rascunho" | "enviado_assinatura" | "assinado" | "vigente" | "encerrado" | "cancelado"
type ContratoTipo = "servicos_tecnicos" | "roteirista" | "direcao" | "elenco" | "fornecedor" | "cessao_direitos" | "coproducao" | "outro"
type AnexoRotulo = "minuta" | "assinado" | "aditivo" | "outro"

type Step = "idle" | "uploading" | "analisando" | "confirmando" | "salvando"

const TIPO_LABELS: Record<ContratoTipo, string> = {
  servicos_tecnicos: "Serviços Técnicos",
  roteirista: "Roteirista",
  direcao: "Direção",
  elenco: "Elenco",
  fornecedor: "Fornecedor/Locação",
  cessao_direitos: "Cessão de Direitos",
  coproducao: "Coprodução/Apoio",
  outro: "Outro",
}

const STATUS_LABELS: Record<ContratoStatus, string> = {
  rascunho: "Rascunho",
  enviado_assinatura: "Enviado p/ Assinatura",
  assinado: "Assinado",
  vigente: "Vigente",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
}

interface Props {
  projetoId: string
  open: boolean
  onClose: () => void
}

export function AnexarContratoDialog({ projetoId, open, onClose }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("idle")
  const [uploadPath, setUploadPath] = useState<string | null>(null)
  const [uploadMime, setUploadMime] = useState<string | null>(null)
  const [uploadTamanho, setUploadTamanho] = useState<number | null>(null)
  const [uploadNome, setUploadNome] = useState<string>("")
  const [erroUpload, setErroUpload] = useState<string>("")

  const [tipo, setTipo] = useState<ContratoTipo>("servicos_tecnicos")
  const [contratada, setContratada] = useState<string>("")
  const [valor, setValor] = useState<string>("")
  const [status, setStatus] = useState<ContratoStatus>("assinado")
  const [rotulo, setRotulo] = useState<AnexoRotulo>("assinado")

  function resetar() {
    setStep("idle")
    setUploadPath(null)
    setUploadMime(null)
    setUploadTamanho(null)
    setUploadNome("")
    setErroUpload("")
    setTipo("servicos_tecnicos")
    setContratada("")
    setValor("")
    setStatus("assinado")
    setRotulo("assinado")
  }

  useEffect(() => {
    if (!open) resetar()
  }, [open])

  function handleFechar() {
    resetar()
    onClose()
  }

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setErroUpload("Arquivo muito grande (máx 10 MB)")
      return
    }
    const ext = file.name.split(".").pop() ?? "bin"
    const path = `contratos/${projetoId}/pending/${crypto.randomUUID()}.${ext}`

    setStep("uploading")
    setErroUpload("")
    setUploadNome(file.name)

    const { error: upErr } = await supabase.storage
      .from("documentos")
      .upload(path, file, { upsert: false })

    if (upErr) {
      setErroUpload(upErr.message)
      setStep("idle")
      return
    }

    setUploadPath(path)
    setUploadMime(file.type || null)
    setUploadTamanho(file.size)

    // Tentar análise com IA
    setStep("analisando")
    try {
      const { data: urlData, error: urlErr } = await supabase.storage
        .from("documentos")
        .createSignedUrl(path, 300)

      if (!urlErr && urlData?.signedUrl) {
        const { data: aiData, error: aiErr } = await supabase.functions.invoke("analisar-contrato", {
          body: { arquivo_url: urlData.signedUrl },
        })
        if (!aiErr && aiData?.ok) {
          if (aiData.tipo && Object.keys(TIPO_LABELS).includes(aiData.tipo)) {
            setTipo(aiData.tipo as ContratoTipo)
          }
          if (aiData.contratada) setContratada(String(aiData.contratada))
          if (aiData.valor != null && !isNaN(parseFloat(String(aiData.valor)))) {
            setValor(String(aiData.valor))
          }
        } else {
          toast.info("Não consegui ler automaticamente — preencha os campos.")
        }
      } else {
        toast.info("Não consegui ler automaticamente — preencha os campos.")
      }
    } catch {
      toast.info("Não consegui ler automaticamente — preencha os campos.")
    }

    setStep("confirmando")
  }

  async function handleSalvar() {
    if (!uploadPath) return
    setStep("salvando")

    const { data: { user } } = await supabase.auth.getUser()

    const { data: contratoData, error: cErr } = await supabase
      .from("contratos")
      .insert({
        projeto_id: projetoId,
        tipo,
        status,
        valor: valor !== "" ? parseFloat(valor) : null,
        partes: contratada ? { contratada: { razao_social: contratada } } : {},
      })
      .select("id")
      .single()

    if (cErr) {
      toast.error(cErr.message)
      setStep("confirmando")
      return
    }

    const contratoId = contratoData.id

    const { error: aErr } = await supabase.from("contrato_anexos").insert({
      contrato_id: contratoId,
      projeto_id: projetoId,
      rotulo,
      arquivo_path: uploadPath,
      mime: uploadMime,
      tamanho: uploadTamanho,
      enviado_por: user?.id ?? null,
    })

    if (aErr) {
      toast.error("Contrato criado, mas falhou ao registrar o anexo: " + aErr.message)
    } else {
      toast.success("Contrato salvo com sucesso")
    }

    qc.invalidateQueries({ queryKey: ["contratos", projetoId] })
    handleFechar()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anexar contrato pronto</DialogTitle>
          <DialogDescription>
            Envie o PDF/imagem do contrato. A IA tentará identificar tipo, contratada e valor automaticamente.
          </DialogDescription>
        </DialogHeader>

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

        {/* Step: idle */}
        {step === "idle" && (
          <div className="space-y-3">
            {erroUpload && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erroUpload}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed h-20 flex-col gap-1"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Selecionar arquivo (PDF / JPG / PNG ≤ 10 MB)</span>
            </Button>
          </div>
        )}

        {/* Step: uploading / analisando */}
        {(step === "uploading" || step === "analisando") && (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">
              {step === "uploading" ? "Enviando arquivo..." : "Analisando documento com IA…"}
            </p>
          </div>
        )}

        {/* Step: confirmando / salvando */}
        {(step === "confirmando" || step === "salvando") && (
          <div className="space-y-4">
            {/* File preview */}
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-muted-foreground">{uploadNome}</span>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de contrato</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as ContratoTipo)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_LABELS) as [ContratoTipo, string][]).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contratada */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Contratada (nome ou razão social)</Label>
              <Input
                className="h-9"
                value={contratada}
                onChange={(e) => setContratada(e.target.value)}
                placeholder="Nome ou razão social..."
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor total (R$)</Label>
              <Input
                className="h-9"
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ContratoStatus)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [ContratoStatus, string][]).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rótulo do anexo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rótulo do documento</Label>
                <Select value={rotulo} onValueChange={(v) => setRotulo(v as AnexoRotulo)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assinado">Assinado</SelectItem>
                    <SelectItem value="minuta">Minuta</SelectItem>
                    <SelectItem value="aditivo">Aditivo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleFechar} disabled={step === "salvando" || step === "uploading" || step === "analisando"}>
            Cancelar
          </Button>
          {(step === "confirmando" || step === "salvando") && (
            <Button onClick={handleSalvar} disabled={step === "salvando"}>
              {step === "salvando" ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Salvar contrato"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
