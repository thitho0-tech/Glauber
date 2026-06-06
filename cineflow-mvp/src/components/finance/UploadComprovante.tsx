import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ImageIcon, ExternalLink, Loader2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadComprovanteProps {
  despesaId: string;
  projectId: string;
  orgId: string;
  currentPath?: string | null;
  onUploaded: (path: string) => void;
}

type UploadState = "idle" | "uploading" | "uploaded" | "error";

function fileIcon(path: string) {
  if (path.match(/\.(jpg|jpeg|png|webp)$/i)) return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function UploadComprovante({ despesaId, projectId, orgId, currentPath, onUploaded }: UploadComprovanteProps) {
  const [state, setState] = useState<UploadState>(currentPath ? "uploaded" : "idle");
  const [path, setPath] = useState<string | null>(currentPath ?? null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`Arquivo muito grande (máx ${MAX_MB}MB)`);
      setState("error");
      return;
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `${orgId}/${projectId}/${despesaId}/${crypto.randomUUID()}.${ext}`;

    setState("uploading");
    setErrorMsg("");

    const { error: upErr } = await supabase.storage
      .from("comprovantes")
      .upload(storagePath, file, { upsert: false });

    if (upErr) {
      setErrorMsg(upErr.message);
      setState("error");
      return;
    }

    // Salvar path na despesa
    const { error: dbErr } = await supabase
      .from("despesas")
      .update({ comprovante_url: storagePath })
      .eq("id", despesaId);

    if (dbErr) {
      setErrorMsg(dbErr.message);
      setState("error");
      return;
    }

    setPath(storagePath);
    setState("uploaded");
    onUploaded(storagePath);
    toast.success("Comprovante enviado");
  }

  async function openSignedUrl() {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("comprovantes")
      .createSignedUrl(path, 3600);
    if (error) { toast.error("Erro ao gerar link"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remover() {
    if (!path) return;
    const { error } = await supabase.storage.from("comprovantes").remove([path]);
    if (error) { toast.error("Erro ao remover arquivo"); return; }
    await supabase.from("despesas").update({ comprovante_url: null }).eq("id", despesaId);
    setPath(null);
    setState("idle");
    toast.success("Comprovante removido");
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {state === "idle" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Anexar comprovante / NF
        </Button>
      )}

      {state === "uploading" && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando arquivo...
        </div>
      )}

      {state === "uploaded" && path && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          {fileIcon(path)}
          <span className="flex-1 truncate text-xs text-muted-foreground">{path.split("/").pop()}</span>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={openSignedUrl} title="Ver comprovante">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={remover} title="Remover">
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setState("idle")}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
