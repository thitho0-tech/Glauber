import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ConviteInfo {
  status: string;
  mensagem?: string;
  email?: string;
  pessoa_nome?: string;
  projeto_nome?: string;
  org_nome?: string;
  funcao?: string;
  departamento?: string;
}

export default function InviteAccept() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [info, setInfo] = useState<ConviteInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInfo({ status: "invalido", mensagem: "Token não informado na URL" });
      setCarregando(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("validar_convite", { p_token: token });
      if (error) {
        setInfo({ status: "erro", mensagem: error.message });
      } else {
        setInfo(data as ConviteInfo);
      }
      setCarregando(false);
    })();
  }, [token]);

  if (loading || carregando) return <Loading />;

  if (!info || info.status !== "pendente") {
    return (
      <div className="mx-auto mt-12 max-w-md p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Convite indisponível
            </CardTitle>
            <CardDescription>{info?.mensagem ?? "Convite não encontrado"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {info?.status === "cancelado" && (
              <p className="text-sm text-muted-foreground">
                Este link foi invalidado porque um novo convite foi gerado.
                Peça a quem te convidou pra reenviar o novo link.
              </p>
            )}
            <Button asChild variant="outline"><Link to="/login">Ir para login</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailEsperado = info.email!;
  const usuarioJaLogadoComEmailCerto = user?.email?.toLowerCase() === emailEsperado.toLowerCase();

  async function aceitarLogado() {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("aceitar_convite", { p_token: token });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const res = data as any;
    if (res?.status === "ok") {
      toast.success("Convite aceito! Bem-vindo(a).");
      navigate("/");
    } else {
      toast.error(res?.mensagem ?? "Falha ao aceitar");
    }
  }

  async function criarContaEAceitar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) { toast.error("Senha precisa ter pelo menos 8 caracteres"); return; }
    setSubmitting(true);
    try {
      // 1) chama Edge Function que cria o user JA confirmado via Admin API
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("aceitar-convite", {
        body: { token, password: senha },
      });
      if (edgeErr) throw edgeErr;
      const ed: any = edgeData;
      if (!ed?.ok) {
        throw new Error(ed?.mensagem ?? ed?.error ?? "Falha ao processar convite");
      }

      // 2) Loga com a senha (a conta agora existe e está confirmada)
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: emailEsperado,
        password: senha,
      });
      if (loginErr) {
        // Se a conta já existia e a senha não bate, orienta a usar "Esqueci a senha"
        throw new Error("Já existe uma conta com esse e-mail. Senha não confere — use 'Esqueci a senha' no login.");
      }

      // 3) Aceita o convite (agora autenticado)
      const { data: acData, error: acErr } = await supabase.rpc("aceitar_convite", { p_token: token });
      if (acErr) throw acErr;
      const res = acData as any;
      if (res?.status === "ok") {
        toast.success("Conta criada e convite aceito!");
        navigate("/");
      } else {
        throw new Error(res?.mensagem ?? "Falha ao aceitar convite");
      }
    } catch (err: any) {
      toast.error(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Convite para projeto
          </CardTitle>
          <CardDescription>
            Você foi convidado(a) para participar de um projeto no Glauber.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted p-3 text-sm">
            <p><span className="text-muted-foreground">Produtora:</span> <strong>{info.org_nome}</strong></p>
            <p><span className="text-muted-foreground">Projeto:</span> <strong>{info.projeto_nome}</strong></p>
            {info.funcao && <p><span className="text-muted-foreground">Função:</span> <strong>{info.funcao}</strong>{info.departamento ? <Badge variant="outline" className="ml-2">{info.departamento}</Badge> : null}</p>}
            <p><span className="text-muted-foreground">E-mail:</span> <strong>{info.email}</strong></p>
          </div>

          {usuarioJaLogadoComEmailCerto ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-700">
                <CheckCircle2 className="inline h-4 w-4" /> Você já está logado(a) como <strong>{user!.email}</strong>.
              </p>
              <Button onClick={aceitarLogado} disabled={submitting} className="w-full">
                {submitting ? "Aceitando..." : "Aceitar convite"}
              </Button>
            </div>
          ) : user ? (
            <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              <p className="text-amber-800 dark:text-amber-200">
                Você está logado(a) como <strong>{user.email}</strong>, mas este convite é para <strong>{emailEsperado}</strong>.
              </p>
              <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}>
                Sair e logar com {emailEsperado}
              </Button>
            </div>
          ) : (
            <form onSubmit={criarContaEAceitar} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Crie uma senha para sua conta {emailEsperado}. Se já tiver conta, digite a senha atual.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha (mínimo 8 caracteres)</Label>
                <Input
                  id="senha"
                  type="password"
                  minLength={8}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Processando..." : "Criar conta e aceitar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
