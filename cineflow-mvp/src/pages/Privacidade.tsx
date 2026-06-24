import { Link } from "react-router-dom";
import personaLogo from "@/assets/persona-glauber.png";

// Troque aqui o e-mail de contato de privacidade se passar a usar um domínio próprio (ex.: privacidade@glauber.app.br)
const CONTATO = "thitho0@gmail.com";
const ATUALIZADO = "junho de 2026";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-[#1F3864]">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <img src={personaLogo} alt="Glauber" className="h-10 w-auto object-contain" />
          <div>
            <p className="text-base font-bold text-[#1F3864]">Glauber</p>
            <p className="text-xs text-slate-500">Gestão de produção audiovisual</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Política de Privacidade</h1>
          <p className="text-sm text-slate-500">Última atualização: {ATUALIZADO}</p>
        </div>

        <p className="text-sm leading-relaxed text-slate-700">
          Esta Política de Privacidade explica como o <strong>Glauber</strong> ("nós", "aplicativo"),
          uma plataforma de gestão de produção audiovisual, coleta, usa, armazena e protege os
          dados das pessoas que o utilizam. Tratamos seus dados em conformidade com a Lei Geral de
          Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>

        <Secao titulo="1. Dados que coletamos">
          <p>Coletamos apenas o necessário para o funcionamento do aplicativo:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone e função/cargo na produção.</li>
            <li><strong>Login social (Google e Facebook):</strong> quando você opta por entrar com Google ou Facebook, recebemos seu nome, endereço de e-mail e foto de perfil para criar e identificar sua conta. Não publicamos nada em seu nome nem acessamos suas listas de contatos.</li>
            <li><strong>Conteúdo de produção:</strong> projetos, equipes, escalas, agendas, ordens do dia, roteiros e documentos que você cadastra ou envia ao usar a plataforma.</li>
            <li><strong>Dados técnicos:</strong> registros de acesso (logs) e cookies estritamente necessários para manter sua sessão autenticada.</li>
          </ul>
        </Secao>

        <Secao titulo="2. Como usamos seus dados">
          <ul className="list-disc space-y-1 pl-5">
            <li>Autenticar seu acesso e manter sua conta.</li>
            <li>Permitir a colaboração na sua equipe de produção (agenda, ordens do dia, comunicação interna).</li>
            <li>Enviar notificações operacionais e e-mails relacionados ao seu uso (convites, alertas de eventos).</li>
            <li>Garantir a segurança e o bom funcionamento do serviço.</li>
          </ul>
          <p>Não usamos seus dados para publicidade e não vendemos seus dados a terceiros.</p>
        </Secao>

        <Secao titulo="3. Compartilhamento e provedores">
          <p>
            Seus dados ficam visíveis apenas para os membros do seu projeto, conforme as permissões
            definidas. Para operar, utilizamos provedores de infraestrutura que processam dados em
            nosso nome: <strong>Supabase</strong> (banco de dados e autenticação), <strong>Vercel</strong> (hospedagem),
            <strong> Google</strong> e <strong>Meta/Facebook</strong> (apenas quando você usa login social) e
            o serviço de e-mail do Google (envio de notificações). Não compartilhamos seus dados para
            outras finalidades.
          </p>
        </Secao>

        <Secao titulo="4. Armazenamento e segurança">
          <p>
            Os dados são armazenados em servidores seguros (Supabase, região América do Sul) com
            criptografia em trânsito e regras de acesso por linha (RLS), de forma que cada pessoa só
            acessa o que lhe é permitido dentro do seu projeto.
          </p>
        </Secao>

        <Secao titulo="5. Seus direitos (LGPD)">
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Confirmar a existência de tratamento e acessar seus dados.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusão dos seus dados.</li>
            <li>Revogar o consentimento e desconectar o login social.</li>
          </ul>
          <p>
            Para exercer esses direitos, escreva para <a className="font-medium text-[#1F3864] underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>.
          </p>
        </Secao>

        <Secao titulo="6. Exclusão de dados">
          <p>
            Para solicitar a exclusão da sua conta e dos dados associados, envie um e-mail para{" "}
            <a className="font-medium text-[#1F3864] underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>{" "}
            com o assunto "Exclusão de dados". Atenderemos a solicitação em até 30 dias, ressalvadas
            as informações que devamos manter por obrigação legal. Caso tenha entrado pelo login do
            Facebook ou Google, a exclusão remove o vínculo com esses provedores.
          </p>
        </Secao>

        <Secao titulo="7. Retenção">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa ou pelo tempo necessário para
            cumprir as finalidades acima e obrigações legais. Após esse período, os dados são
            eliminados ou anonimizados.
          </p>
        </Secao>

        <Secao titulo="8. Menores de idade">
          <p>
            O Glauber é destinado a profissionais de produção audiovisual e não é direcionado a
            menores de 18 anos. Não coletamos intencionalmente dados de menores.
          </p>
        </Secao>

        <Secao titulo="9. Alterações nesta política">
          <p>
            Podemos atualizar esta Política periodicamente. A data de "Última atualização" no topo
            indica a versão vigente. Mudanças relevantes serão comunicadas pelos canais do aplicativo.
          </p>
        </Secao>

        <Secao titulo="10. Contato">
          <p>
            Dúvidas sobre esta Política ou sobre seus dados? Fale com a gente pelo e-mail{" "}
            <a className="font-medium text-[#1F3864] underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>.
          </p>
        </Secao>

        <div className="border-t pt-6">
          <Link to="/login" className="text-sm font-medium text-[#1F3864] underline">← Voltar para o Glauber</Link>
        </div>
      </main>
    </div>
  );
}
