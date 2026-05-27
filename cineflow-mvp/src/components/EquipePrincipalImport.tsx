import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, ScanText, X, Trash2 } from "lucide-react";
import { parseTeamCsv, templateCsv, validarEmail, type TeamRow } from "@/lib/parseTeamCsv";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  rows: TeamRow[];
  onChange: (rows: TeamRow[]) => void;
}

export function EquipePrincipalImport({ rows, onChange }: Props) {
  const [texto, setTexto] = useState("");
  const [ocrRodando, setOcrRodando] = useState(false);

  function aplicarTexto(t: string) {
    setTexto(t);
    const parsed = parseTeamCsv(t);
    if (parsed.length === 0 && t.trim().length > 0) {
      toast.error("Não consegui detectar linhas — confira o separador (vírgula/tab/ponto-e-vírgula)");
    }
    onChange(parsed);
  }

  function baixarTemplate() {
    const blob = new Blob([templateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cineflow-equipe-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function carregarCsv(file: File) {
    const t = await file.text();
    aplicarTexto(t);
    toast.success("Arquivo importado: " + file.name);
  }

  async function extrairPdf(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo maior que 8MB. Comprima ou divida o PDF antes.");
      return;
    }
    setOcrRodando(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const arquivo_base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("ocr-text-extract", {
        body: { arquivo_base64, mime: file.type || "application/pdf" },
      });
      if (error) throw error;
      const res: any = data;
      if (res?.error) throw new Error(res.error);
      const markdown: string = res?.markdown ?? "";
      if (!markdown) {
        toast.error("OCR não retornou texto");
        return;
      }
      aplicarTexto(markdown);
      toast.success("OCR extraiu " + (res?.paginas ?? 1) + " página(s)");
    } catch (e: any) {
      toast.error("Falha no OCR: " + (e?.message ?? String(e)));
    } finally {
      setOcrRodando(false);
    }
  }

  function alterar(idx: number, patch: Partial<TeamRow>) {
    const novo = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(novo);
  }

  function remover(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  function adicionarLinha() {
    onChange([...rows, { nome: "", funcao: "", email: "", convidar: false }]);
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Cadastrar equipe principal (opcional)</p>
          <p className="text-xs text-muted-foreground">
            Importe planilha/PDF ou cole o texto. Você pode pular e cadastrar depois.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={baixarTemplate}>
          <Download className="h-3.5 w-3.5" /> Template
        </Button>
      </div>

      <Tabs defaultValue="colar">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="colar">Colar texto</TabsTrigger>
          <TabsTrigger value="csv">Arquivo CSV</TabsTrigger>
          <TabsTrigger value="pdf">PDF / imagem (OCR)</TabsTrigger>
        </TabsList>

        <TabsContent value="colar" className="space-y-2 pt-2">
          <Label htmlFor="bulk-text" className="text-xs">
            Cole no formato Nome, Função, E-mail (separadores: vírgula / tab / ponto-e-vírgula)
          </Label>
          <Textarea
            id="bulk-text"
            value={texto}
            onChange={(e) => aplicarTexto(e.target.value)}
            placeholder={"Ana Silva, Diretora, ana@exemplo.com\nJoão Souza, DOP, joao@exemplo.com"}
            rows={4}
            className="font-mono text-xs"
          />
        </TabsContent>

        <TabsContent value="csv" className="space-y-2 pt-2">
          <Label htmlFor="csv-file" className="text-xs">
            Selecione um arquivo .csv (formato Nome, Função, E-mail)
          </Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) carregarCsv(f);
            }}
          />
        </TabsContent>

        <TabsContent value="pdf" className="space-y-2 pt-2">
          <Label htmlFor="pdf-file" className="text-xs">
            Selecione PDF ou imagem. OCR (Mistral) vai extrair o texto e preencher a tabela.
          </Label>
          <Input
            id="pdf-file"
            type="file"
            accept=".pdf,image/*"
            disabled={ocrRodando}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) extrairPdf(f);
            }}
          />
          {ocrRodando && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ScanText className="h-3.5 w-3.5 animate-pulse" /> Processando OCR...
            </p>
          )}
        </TabsContent>
      </Tabs>

      {rows.length > 0 ? (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Nome</TableHead>
                <TableHead className="w-[28%]">Função no projeto</TableHead>
                <TableHead className="w-[32%]">E-mail</TableHead>
                <TableHead className="w-[8%] text-center">Convidar</TableHead>
                <TableHead className="w-[4%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                const emailOk = !r.email || validarEmail(r.email);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <Input value={r.nome} onChange={(e) => alterar(i, { nome: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.funcao} onChange={(e) => alterar(i, { funcao: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.email}
                        onChange={(e) => alterar(i, { email: e.target.value.toLowerCase() })}
                        className={"h-8 " + (!emailOk ? "border-destructive" : "")}
                        placeholder="email@exemplo.com"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={!!r.convidar}
                        disabled={!emailOk || !r.email}
                        onChange={(e) => alterar(i, { convidar: e.target.checked })}
                        title={!r.email ? "Sem e-mail, não pode convidar" : "Enviar convite por e-mail ao criar projeto"}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell>
                      <Button type="button" size="icon" variant="ghost" onClick={() => remover(i)} className="h-8 w-8">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {rows.length} pessoa(s) · {rows.filter((r) => r.convidar && validarEmail(r.email)).length} receberão convite
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>
                <Trash2 className="h-3.5 w-3.5" /> Limpar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={adicionarLinha}>
                <Upload className="h-3.5 w-3.5" /> Linha em branco
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background p-3 text-center text-xs text-muted-foreground">
          Nenhuma pessoa adicionada ainda. Vai criar o projeto e cadastrar manualmente depois.
        </p>
      )}
    </div>
  );
}
