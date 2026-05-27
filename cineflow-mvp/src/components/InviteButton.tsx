import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mail, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projetoPessoaId: string;
  pessoaEmail?: string | null;
  pessoaNome?: string | null;
}

export function InviteButton({ projetoPessoaId, pessoaEmail, pessoaNome }: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const gerar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("criar_convite", {
        p_projeto_pessoa_id: projetoPessoaId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (tok) => {
      setToken(tok);
      setOpen(true);
      toast.success("Convite enviado por e-mail para " + (pessoaEmail ?? "a pessoa"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const link = token ? `${window.location.origin}/convite?token=${token}` : "";

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => gerar.mutate()}
        disabled={gerar.isPending || !pessoaEmail}
        title={pessoaEmail ? "Gerar link de convite" : "Cadastre um e-mail para enviar convite"}
      >
        <Mail className="h-4 w-4" /> Convite
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite gerado</DialogTitle>
            <DialogDescription>
              Convite enviado para <strong>{pessoaEmail}</strong>. Se {pessoaNome ?? "a pessoa"} não receber, use o link abaixo (válido por 14 dias).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={link} readOnly className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado!"); }}
              >
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a
                  href={`https://wa.me/?text=${encodeURIComponent("Você foi convidado(a) para o projeto no Glauber: " + link)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
              >
                <a href={link} target="_blank" rel="noreferrer">Abrir</a>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
