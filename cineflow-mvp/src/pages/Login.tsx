import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import personaLogo from "@/assets/persona-glauber.png";
import novaLogo from "@/assets/nova-logo-glauber.jpeg";
import { toast } from "sonner";

const APP_URL = window.location.origin;
// Login social: Google liberado em produção (provider configurado no Supabase em 24/06/2026).
const SOCIAL_LOGIN_ENABLED = true;
// Facebook: trocar para true quando o provider Facebook estiver configurado no Supabase.
const FACEBOOK_LOGIN_ENABLED = false;

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

          {SOCIAL_LOGIN_ENABLED && (<>
          {/* ── Separador ───────────────────────────────────── */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">ou entre com</span></div>
          </div>

          {/* ── Login social ─────────────────────────────────── */}
          <div className={FACEBOOK_LOGIN_ENABLED ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
            <Button
              type="button"
              variant="outline"
              onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: APP_URL + "/" } })}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
            {FACEBOOK_LOGIN_ENABLED && (
            <Button
              type="button"
              variant="outline"
              onClick={() => supabase.auth.signInWithOAuth({ provider: "facebook", options: { redirectTo: APP_URL + "/" } })}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
            )}
          </div>
          </>)}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Crie sua produtora
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
