import { useState } from "react";
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
import { Plus, MapPin, ChevronLeft, Trash2, ExternalLink } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";

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
  const [open, setOpen] = useState(false);
  const [mapsUrl, setMapsUrl] = useState("");
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();

  const { data: locacoes, isLoading } = useQuery({
    queryKey: ["locacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locacoes").select("*").order("nome");
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
        nome: form.get("nome"),
        endereco: form.get("endereco") || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        maps_url: url || null,
        waze_url: form.get("waze_url") || null,
        contato_nome: form.get("contato_nome") || null,
        contato_telefone: form.get("contato_telefone") || null,
        valor_diaria: form.get("valor_diaria") ? Number(form.get("valor_diaria")) : null,
        restricoes: form.get("restricoes") || null,
      };
      const { error } = await supabase.from("locacoes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação adicionada");
      qc.invalidateQueries({ queryKey: ["locacoes"] });
      setOpen(false);
      setMapsUrl("");
      setLatLng(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (lid: string) => {
      const { error } = await supabase.from("locacoes").delete().eq("id", lid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locacoes"] }),
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
          <DialogContent>
            <form onSubmit={(e) => { e.preventDefault(); criar.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="contato_nome">Responsável</Label><Input id="contato_nome" name="contato_nome" /></div>
                  <div className="space-y-1.5"><Label htmlFor="contato_telefone">Telefone</Label><Input id="contato_telefone" name="contato_telefone" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="valor_diaria">Valor da diária (R$)</Label><Input id="valor_diaria" name="valor_diaria" type="number" step="0.01" /></div>
                <div className="space-y-1.5"><Label htmlFor="restricoes">Restrições</Label><Textarea id="restricoes" name="restricoes" rows={3} placeholder="Horários permitidos, ruído, autorizações, etc." /></div>
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
        <Empty icon={<MapPin className="h-5 w-5" />} title="Sem locações cadastradas" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova locação</Button>} />
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
                    <Button size="icon" variant="ghost" onClick={() => remover.mutate(l.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{l.endereco ?? "—"}</p>
                  {l.lat && l.lng && (
                    <p className="text-xs text-muted-foreground">GPS: {Number(l.lat).toFixed(5)}, {Number(l.lng).toFixed(5)}</p>
                  )}
                  {l.contato_nome && <p className="text-xs">📞 {l.contato_nome} · {l.contato_telefone ?? "—"}</p>}
                  {l.valor_diaria && <p className="text-sm font-medium">Diária: {formatBRL(l.valor_diaria)}</p>}
                  {l.restricoes && <p className="text-xs text-muted-foreground">⚠️ {l.restricoes}</p>}
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
    </div>
  );
}
