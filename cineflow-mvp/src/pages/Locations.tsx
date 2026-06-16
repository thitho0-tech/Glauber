import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, ChevronLeft, Trash2, ExternalLink, Camera } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";

function FotoThumb({ path, onView }: { path: string; onView: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("documentos").createSignedUrl(path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl); });
  }, [path]);
  return (
    <button
      onClick={() => url && onView(url)}
      className="w-14 h-14 rounded border overflow-hidden bg-muted flex items-center justify-center shrink-0"
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

// Extrai lat/lng de uma URL do Google Maps no formato @-8.05,-34.88 ou ?q=-8.05,-34.88 etc.
function extractLatLng(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,        // ...@lat,lng
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,    // ?q=lat,lng
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,   // ?ll=lat,lng
    /[?&]center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/, // waze
    /[?&]latlng=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

export default function Locations() {
  const { id } = useParams();
  const { can } = usePermissions(id);
  const canEdit = can('locacoes', 'editar');
  const [open, setOpen] = useState(false);
  const [mapsUrl, setMapsUrl] = useState("");
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [fotoViewer, setFotoViewer] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();

  const { data: locacoes, isLoading } = useQuery({
    queryKey: ["locacoes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("locacoes").select("*").eq("projeto_id", id!).eq("etapa", "oficial").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Produtora não encontrada");
      const url = String(form.get("maps_url") ?? "");
      const coords = extractLatLng(url);
      const payload: any = {
        org_id: orgId,
        projeto_id: id,
        nome: form.get("nome"),
        endereco: form.get("endereco") || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        maps_url: url || null,
        waze_url: form.get("waze_url") || null,
        valor_diaria: form.get("valor_diaria") ? Number(form.get("valor_diaria")) : null,
        restricoes: form.get("restricoes") || null,
        responsavel_nome: form.get("responsavel_nome") || null,
        responsavel_contato: form.get("responsavel_contato") || null,
        comentarios: form.get("comentarios") || null,
      };
      const { error } = await supabase.from("locacoes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação adicionada");
      qc.invalidateQueries({ queryKey: ["locacoes", id] });
      setOpen(false);
      setMapsUrl("");
      setLatLng(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (lid: string) => {
      const { error } = await supabase.rpc("soft_delete_item", { p_tabela: "locacoes", p_id: lid });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação movida para a lixeira. Acesse Configurações → Lixeira para restaurar.");
      qc.invalidateQueries({ queryKey: ["locacoes", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  function onMapsUrlChange(v: string) {
    setMapsUrl(v);
    setLatLng(extractLatLng(v));
  }

  function wazeFromLatLng(loc: any) {
    if (loc.waze_url) return loc.waze_url;
    if (loc.lat && loc.lng) return `https://waze.com/ul?ll=${loc.lat},${loc.lng}&navigate=yes`;
    return null;
  }

  function mapsFromLatLng(loc: any) {
    if (loc.maps_url) return loc.maps_url;
    if (loc.lat && loc.lng) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    if (loc.endereco) return `https://www.google.com/maps/search/${encodeURIComponent(loc.endereco)}`;
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projetos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Locações</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova locação</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <form onSubmit={(e) => { e.preventDefault(); criar.mutate(new FormData(e.currentTarget)); }} className="space-y-4" autoComplete="off">
              <DialogHeader><DialogTitle>Nova locação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label htmlFor="nome">Nome</Label><Input id="nome" name="nome" required /></div>
                <div className="space-y-1.5"><Label htmlFor="endereco">Endereço completo</Label><Input id="endereco" name="endereco" /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="maps_url">Link do Google Maps</Label>
                  <Input id="maps_url" name="maps_url" placeholder="https://www.google.com/maps/..." value={mapsUrl} onChange={(e) => onMapsUrlChange(e.target.value)} />
                  {latLng && (
                    <p className="text-xs text-emerald-600">Coordenadas detectadas: {latLng.lat}, {latLng.lng}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waze_url">Link do Waze (opcional)</Label>
                  <Input id="waze_url" name="waze_url" placeholder="https://waze.com/ul?..." />
                </div>
                <div className="space-y-1.5"><Label htmlFor="valor_diaria">Valor da diária (R$)</Label><Input id="valor_diaria" name="valor_diaria" type="number" step="0.01" /></div>
                <div className="space-y-1.5"><Label htmlFor="restricoes">Restrições</Label><Textarea id="restricoes" name="restricoes" rows={3} placeholder="Horários permitidos, ruído, autorizações, etc." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="responsavel_nome">Responsável pelo local</Label><Input id="responsavel_nome" name="responsavel_nome" placeholder="Nome do responsável" /></div>
                  <div className="space-y-1.5"><Label htmlFor="responsavel_contato">Contato do responsável</Label><Input id="responsavel_contato" name="responsavel_contato" placeholder="Tel/email" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="comentarios">Comentários / regras internas</Label><Textarea id="comentarios" name="comentarios" rows={2} placeholder="Regras da locação, acordos, observações da produção..." /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Salvando..." : "Adicionar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!locacoes?.length ? (
        <Empty icon={<MapPin className="h-5 w-5" />} title="Sem locações cadastradas" action={canEdit ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova locação</Button> : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locacoes.map((l: any) => {
            const mapsHref = mapsFromLatLng(l);
            const wazeHref = wazeFromLatLng(l);
            return (
              <Card key={l.id}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{l.nome}</h3>
                    {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => remover.mutate(l.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{l.endereco ?? "—"}</p>
                  {l.lat && l.lng && (
                    <p className="text-xs text-muted-foreground">GPS: {Number(l.lat).toFixed(5)}, {Number(l.lng).toFixed(5)}</p>
                  )}
                  {l.responsavel_nome && <p className="text-xs">Resp.: {l.responsavel_nome}{l.responsavel_contato ? ` · ${l.responsavel_contato}` : ""}</p>}
                  {l.valor_diaria && <p className="text-sm font-medium">Diária: {formatBRL(l.valor_diaria)}</p>}
                  {l.restricoes && <p className="text-xs text-muted-foreground">⚠️ {l.restricoes}</p>}
                  {l.comentarios && <p className="text-xs text-muted-foreground italic">{l.comentarios}</p>}
                  {Array.isArray(l.fotos_urls) && l.fotos_urls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(l.fotos_urls as string[]).map((path: string, i: number) => (
                        <FotoThumb key={i} path={path} onView={setFotoViewer} />
                      ))}
                    </div>
                  )}
                  {(mapsHref || wazeHref) && (
                    <div className="flex gap-2 pt-2">
                      {mapsHref && (
                        <Button asChild size="sm" variant="outline">
                          <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Maps
                          </a>
                        </Button>
                      )}
                      {wazeHref && (
                        <Button asChild size="sm" variant="outline">
                          <a href={wazeHref} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Waze
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!fotoViewer} onOpenChange={(o) => { if (!o) setFotoViewer(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Foto</DialogTitle></DialogHeader>
          {fotoViewer && <img src={fotoViewer} alt="Foto da locação" className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
