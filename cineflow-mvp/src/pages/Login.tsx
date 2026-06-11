import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import personaLogo from "@/assets/persona-logo.jpeg";
import novaLogo from "@/assets/nova-logo-glauber.jpeg";
import { toast } from "sonner";

// ── Validação de senha (mínimo 8 caracteres) ─────────────────
function validarSenha(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  return null;
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Magic Link
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const erro = validarSenha(senha);
    if (erro) { setSenhaErro(erro); return; }
    setSenhaErro(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    nav("/", { replace: true });
  }

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setMagicSent(true);
    toast.success("Magic Link enviado! Verifique seu e-mail.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3">
            <img src={personaLogo} alt="" className="h-14 w-auto object-contain" />
            <img src={novaLogo} alt="Glauber" className="h-14 w-auto object-contain" />
          </div>
          <CardTitle className="mt-3 text-2xl">Entrar no Glauber</CardTitle>
          <CardDescription>Gestão de produções audiovisuais</CardDescription>
        </CardHeader>
        <CardContent>
          {/* ── Tab: Senha vs Magic Link ─────────────────────── */}
          <div className="flex rounded-lg border overflow-hidden mb-5 text-sm font-medium">
            <button
              className={`flex-1 py-2 transition-colors ${!magicMode ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
              onClick={() => { setMagicMode(false); setMagicSent(false); }}
            >
              Senha
            </button>
            <button
              className={`flex-1 py-2 transition-colors ${magicMode ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
              onClick={() => { setMagicMode(true); setMagicSent(false); }}
            >
              Magic Link
            </button>
          </div>

          {/* ── Formulário Senha ─────────────────────────────── */}
          {!magicMode && (
            <form onSubmit={entrar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setSenhaErro(null); }}
                  required
                />
                {senhaErro && (
                  <p className="text-xs text-destructive">{senhaErro}</p>
                )}
              </div>
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-sm text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
            </form>
          )}

          {/* ── Formulário Magic Link ────────────────────────── */}
          {magicMode && !magicSent && (
            <form onSubmit={enviarMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-magic">E-mail</Label>
                <Input
                  id="email-magic"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Enviar Magic Link
              </Button>
            </form>
          )}

          {/* ── Magic Link enviado ───────────────────────────── */}
          {magicMode && magicSent && (
            <div className="text-center space-y-3 py-4">
              <Mail className="h-10 w-10 text-primary mx-auto" />
              <p className="font-medium">Verifique seu e-mail</p>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de acesso para <strong>{email}</strong>.
                O link expira em 1 hora.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMagicSent(false)}
              >
                Reenviar
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Crie sua produtora
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
