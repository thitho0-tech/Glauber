import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, Drama, UserCheck, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

type Personagem = {
  id: string;
  nome: string;
  descricao: string | null;
  idade_aparente: string | null;
  caracteristicas: string | null;
  ator_nome: string | null;
  ficha: Record<string, any> | null;
  menor_de_idade: boolean | null;
  responsavel: Record<string, any> | null;
  autorizacao_imagem_url: string | null;
};

type ProjetoPessoa = {
  id: string;
  personagem_id: string | null;
  pessoa: { nome: string };
};

type FichaState = {
  ator_nome: string;
  menor_de_idade: boolean;
  // medidas — dentro de ficha jsonb
  altura: string;
  peso: string;
  manequim: string;
  calcado: string;
  calca: string;
  camisa: string;
  tatuagens: string;
  cabelo: string;
  cor_olhos: string;
  // carreira
  drt: string;
  agenciado: boolean;
  contato_agente: string;
  // mídias (paths no storage)
  foto_rosto_url: string;
  foto_corpo_url: string;
  portfolio_url: string;
  autorizacao_imagem_url: string;
  // responsável (para menor)
  resp_nome: string;
  resp_telefone: string;
  resp_email: string;
  resp_parentesco: string;
};

function initFicha(p: Personagem): FichaState {
  const f = p.ficha ?? {};
  const r = p.responsavel ?? {};
  return {
    ator_nome: p.ator_nome ?? "",
    menor_de_idade: p.menor_de_idade ?? false,
    altura: f.altura ?? "",
    peso: f.peso ?? "",
    manequim: f.manequim ?? "",
    calcado: f.calcado ?? "",
    calca: f.calca ?? "",
    camisa: f.camisa ?? "",
    tatuagens: f.tatuagens ?? "",
    cabelo: f.cabelo ?? "",
    cor_olhos: f.cor_olhos ?? "",
    drt: f.drt ?? "",
    agenciado: f.agenciado ?? false,
    contato_agente: f.contato_agente ?? "",
    foto_rosto_url: f.foto_rosto_url ?? "",
    foto_corpo_url: f.foto_corpo_url ?? "",
    portfolio_url: f.portfolio_url ?? "",
    autorizacao_imagem_url: p.autorizacao_imagem_url ?? "",
    resp_nome: r.nome ?? "",
    resp_telefone: r.telefone ?? "",
    resp_email: r.email ?? "",
    resp_parentesco: r.parentesco ?? "",
  };
}

export default function Cast() {
  const { id: projetoId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [openNovo, setOpenNovo] = useState(false);
  const [novo, setNovo] = useState<Partial<Personagem>>({});
  const [editing, setEditing] = useState<Personagem | null>(null);
  const [fichaOpen, setFichaOpen] = useState<Personagem | null>(null);
  const [fichaData, setFichaData] = useState<FichaState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const { data: personagens, isLoading } = useQuery({
    queryKey: ["personagens", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personagens")
        .select("id, nome, descricao, idade_aparente, caracteristicas, ator_nome, ficha, menor_de_idade, responsavel, autorizacao_imagem_url")
        .eq("projeto_id", projetoId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Personagem[];
    },
  });

  const { data: elenco } = useQuery({
    queryKey: ["elenco-pp", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, personagem_id, pessoa:pessoas(nome)")
        .eq("projeto_id", projetoId!);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        personagem_id: r.personagem_id,
        pessoa: { nome: r.pessoa?.nome ?? "—" },
      })) as ProjetoPessoa[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!novo.nome) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("personagens").insert({
        projeto_id: projetoId!,
        nome: novo.nome,
        descricao: novo.descricao || null,
        idade_aparente: novo.idade_aparente || null,
        caracteristicas: novo.caracteristicas || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Personagem criado");
      setOpenNovo(false);
      setNovo({});
      qc.invalidateQueries({ queryKey: ["personagens", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("personagens").update({
        nome: editing.nome,
        descricao: editing.descricao,
        idade_aparente: editing.idade_aparente,
        caracteristicas: editing.caracteristicas,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Personagem atualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["personagens", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personagens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personagens", projetoId] }),
  });

  const escalarAtor = useMutation({
    mutationFn: async ({ personagemId, projetoPessoaId }: { personagemId: string; projetoPessoaId: string | null }) => {
      if (!projetoPessoaId) {
        const { error } = await supabase.from("projeto_pessoas").update({ personagem_id: null }).eq("personagem_id", personagemId);
        if (error) throw error;
      } else {
        await supabase.from("projeto_pessoas").update({ personagem_id: null }).eq("personagem_id", personagemId);
        const { error } = await supabase.from("projeto_pessoas").update({ personagem_id: personagemId }).eq("id", projetoPessoaId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Escalação atualizada");
      qc.invalidateQueries({ queryKey: ["elenco-pp", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarFicha = useMutation({
    mutationFn: async () => {
      if (!fichaOpen || !fichaData) return;
      const pid = fichaOpen.id;
      const urls: Record<string, string> = {
        foto_rosto_url: fichaData.foto_rosto_url,
        foto_corpo_url: fichaData.foto_corpo_url,
        portfolio_url: fichaData.portfolio_url,
        autorizacao_imagem_url: fichaData.autorizacao_imagem_url,
      };

      for (const [field, file] of Object.entries(pendingFiles)) {
        const ext = file.name.split(".").pop();
        const path = `personagens/${pid}/${field}.${ext}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        urls[field] = path;
      }

      const fichaJsonb: Record<string, any> = {
        altura: fichaData.altura || null,
        peso: fichaData.peso || null,
        manequim: fichaData.manequim || null,
        calcado: fichaData.calcado || null,
        calca: fichaData.calca || null,
        camisa: fichaData.camisa || null,
        tatuagens: fichaData.tatuagens || null,
        cabelo: fichaData.cabelo || null,
        cor_olhos: fichaData.cor_olhos || null,
        drt: fichaData.drt || null,
        agenciado: fichaData.agenciado,
        contato_agente: fichaData.contato_agente || null,
        foto_rosto_url: urls.foto_rosto_url || null,
        foto_corpo_url: urls.foto_corpo_url || null,
        portfolio_url: urls.portfolio_url || null,
      };

      const responsavelJsonb = fichaData.menor_de_idade ? {
        nome: fichaData.resp_nome || null,
        telefone: fichaData.resp_telefone || null,
        email: fichaData.resp_email || null,
        parentesco: fichaData.resp_parentesco || null,
      } : null;

      const { error } = await supabase.from("personagens").update({
        ator_nome: fichaData.ator_nome || null,
        ficha: fichaJsonb,
        menor_de_idade: fichaData.menor_de_idade,
        responsavel: responsavelJsonb,
        autorizacao_imagem_url: urls.autorizacao_imagem_url || null,
      }).eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ficha salva");
      setFichaOpen(null);
      setFichaData(null);
      setPendingFiles({});
      qc.invalidateQueries({ queryKey: ["personagens", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function verArquivo(path: string) {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Não foi possível gerar link");
  }

  function setFile(field: string, file: File) {
    setPendingFiles((prev) => ({ ...prev, [field]: file }));
  }

  if (isLoading) return <Loading />;

  const atoresDoProjeto = elenco ?? [];

  return (
    <div className="space-y-6">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Drama className="h-6 w-6" /> Elenco
        </h1>
        <Button onClick={() => setOpenNovo(true)}><Plus className="h-4 w-4" /> Novo personagem</Button>
      </div>

      {(!personagens || personagens.length === 0) ? (
        <Empty icon={<Drama className="h-5 w-5" />} title="Sem personagens"
          description="Cadastre os personagens do roteiro antes de escalar atores." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {personagens.map((p) => {
            const atorEscalado = atoresDoProjeto.find((a) => a.personagem_id === p.id);
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.nome}</CardTitle>
                    {p.idade_aparente && <p className="text-xs text-muted-foreground">Idade: {p.idade_aparente}</p>}
                    {p.ator_nome && <p className="text-xs text-muted-foreground">Ator: {p.ator_nome}</p>}
                    {p.menor_de_idade && <Badge variant="secondary" className="text-xs mt-1">Menor de idade</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setFichaOpen(p);
                      setFichaData(initFicha(p));
                      setPendingFiles({});
                    }}>
                      <FileText className="h-4 w-4" /> Ficha
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                  {p.caracteristicas && <p className="text-xs italic text-muted-foreground">{p.caracteristicas}</p>}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Ator escalado</Label>
                    <select
                      value={atorEscalado?.id ?? ""}
                      onChange={(e) => escalarAtor.mutate({ personagemId: p.id, projetoPessoaId: e.target.value || null })}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">— sem ator —</option>
                      {atoresDoProjeto.map((a) => (
                        <option key={a.id} value={a.id} disabled={!!a.personagem_id && a.personagem_id !== p.id}>
                          {a.pessoa.nome}{a.personagem_id && a.personagem_id !== p.id ? " (escalado em outro)" : ""}
                        </option>
                      ))}
                    </select>
                    {atorEscalado && <Badge variant="outline">{atorEscalado.pessoa.nome}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: novo personagem */}
      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo personagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pn">Nome</Label>
              <Input id="pn" value={novo.nome ?? ""} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pi">Idade aparente</Label>
              <Input id="pi" value={novo.idade_aparente ?? ""} onChange={(e) => setNovo({ ...novo, idade_aparente: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd">Descrição</Label>
              <Textarea id="pd" value={novo.descricao ?? ""} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc">Características</Label>
              <Textarea id="pc" value={novo.caracteristicas ?? ""} onChange={(e) => setNovo({ ...novo, caracteristicas: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar personagem */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar personagem</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Idade aparente</Label>
                <Input value={editing.idade_aparente ?? ""} onChange={(e) => setEditing({ ...editing, idade_aparente: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Características</Label>
                <Textarea value={editing.caracteristicas ?? ""} onChange={(e) => setEditing({ ...editing, caracteristicas: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: ficha completa */}
      <Dialog open={!!fichaOpen} onOpenChange={(o) => { if (!o) { setFichaOpen(null); setFichaData(null); setPendingFiles({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ficha — {fichaOpen?.nome}</DialogTitle>
          </DialogHeader>
          {fichaData && (
            <div className="space-y-5">
              {/* Ator */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Ator / Atriz</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome do ator</Label>
                    <Input value={fichaData.ator_nome} onChange={(e) => setFichaData({ ...fichaData, ator_nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>DRT</Label>
                    <Input placeholder="Registro profissional" value={fichaData.drt} onChange={(e) => setFichaData({ ...fichaData, drt: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={fichaData.agenciado}
                      onChange={(e) => setFichaData({ ...fichaData, agenciado: e.target.checked })} />
                    <span className="text-sm">Agenciado</span>
                  </label>
                  {fichaData.agenciado && (
                    <div className="space-y-1.5">
                      <Label>Contato do agente</Label>
                      <Input placeholder="Nome · telefone · email" value={fichaData.contato_agente}
                        onChange={(e) => setFichaData({ ...fichaData, contato_agente: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>

              {/* Medidas */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Medidas físicas</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {([
                    ["altura", "Altura"],
                    ["peso", "Peso"],
                    ["manequim", "Manequim"],
                    ["calcado", "Calçado"],
                    ["calca", "Calça"],
                    ["camisa", "Camisa"],
                  ] as [keyof FichaState, string][]).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input value={fichaData[field] as string}
                        onChange={(e) => setFichaData({ ...fichaData, [field]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-3 mt-3">
                  {([
                    ["tatuagens", "Tatuagens"],
                    ["cabelo", "Cabelo"],
                    ["cor_olhos", "Cor dos olhos"],
                  ] as [keyof FichaState, string][]).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input value={fichaData[field] as string}
                        onChange={(e) => setFichaData({ ...fichaData, [field]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Menor de idade */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={fichaData.menor_de_idade}
                    onChange={(e) => setFichaData({ ...fichaData, menor_de_idade: e.target.checked })} />
                  <span className="text-sm font-medium">Menor de idade</span>
                </label>
                {fichaData.menor_de_idade && (
                  <div className="border rounded-md p-3 space-y-3">
                    <p className="text-xs text-muted-foreground">Dados do responsável legal</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Nome do responsável</Label>
                        <Input value={fichaData.resp_nome} onChange={(e) => setFichaData({ ...fichaData, resp_nome: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Parentesco</Label>
                        <Input placeholder="mãe, pai, tutor..." value={fichaData.resp_parentesco}
                          onChange={(e) => setFichaData({ ...fichaData, resp_parentesco: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Telefone</Label>
                        <Input value={fichaData.resp_telefone} onChange={(e) => setFichaData({ ...fichaData, resp_telefone: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>E-mail</Label>
                        <Input type="email" value={fichaData.resp_email} onChange={(e) => setFichaData({ ...fichaData, resp_email: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Declaração de autorização (upload)</Label>
                      <div className="flex items-center gap-2">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile("autorizacao_imagem_url", f); }} />
                        {fichaData.autorizacao_imagem_url && (
                          <Button size="sm" variant="outline" onClick={() => verArquivo(fichaData.autorizacao_imagem_url)}>Ver</Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Documentos/Mídia */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Mídia</h3>
                <div className="space-y-3">
                  {([
                    ["foto_rosto_url", "Foto do rosto", "image/*"],
                    ["foto_corpo_url", "Foto do corpo (corpo inteiro)", "image/*"],
                    ["portfolio_url", "Portfólio / book (PDF ou imagem)", ".pdf,image/*"],
                  ] as [keyof FichaState, string, string][]).map(([field, label, accept]) => (
                    <div key={field} className="space-y-1.5">
                      <Label>{label}</Label>
                      <div className="flex items-center gap-2">
                        <input type="file" accept={accept} className="text-sm"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(field as string, f); }} />
                        {fichaData[field] && (
                          <Button size="sm" variant="outline" onClick={() => verArquivo(fichaData[field] as string)}>Ver</Button>
                        )}
                        {pendingFiles[field] && (
                          <span className="text-xs text-emerald-600">Novo: {pendingFiles[field].name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFichaOpen(null); setFichaData(null); setPendingFiles({}); }}>
              Cancelar
            </Button>
            <Button onClick={() => salvarFicha.mutate()} disabled={salvarFicha.isPending}>
              {salvarFicha.isPending ? "Salvando..." : "Salvar ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
