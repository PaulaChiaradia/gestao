import { Controller, LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Política de Privacidade | Paula Chiaradia" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica como <Controller /> (“nós”) coleta, usa, armazena e protege os dados pessoais de
        clientes, alunos e pessoas que entram em contato conosco, em conformidade com a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Compras de cursos e produtos digitais:</strong> nome, e-mail, telefone, documento, cidade, estado,
          produto adquirido, valor e forma de pagamento, recebidos da plataforma Hotmart.
        </li>
        <li>
          <strong>Atendimento:</strong> nome, telefone, nome de usuário e o conteúdo das mensagens trocadas conosco pelo
          WhatsApp, pelo Direct do Instagram ou por e-mail.
        </li>
        <li>
          <strong>Solicitações de palestras e treinamentos:</strong> empresa, cidade, data e número de participantes do
          evento e dados do responsável pelo contato.
        </li>
        <li>
          <strong>Dados agregados de redes sociais e anúncios:</strong> métricas de alcance e desempenho fornecidas pela
          Meta (Instagram e Facebook), sem identificação individual de quem viu os anúncios.
        </li>
      </ul>

      <h2>2. Para que usamos os dados</h2>
      <ul>
        <li>Responder mensagens, tirar dúvidas e prestar atendimento;</li>
        <li>Entregar os produtos adquiridos e dar suporte aos alunos;</li>
        <li>Elaborar propostas de palestras, treinamentos e consultorias;</li>
        <li>Acompanhar indicadores de vendas e de marketing de forma agregada;</li>
        <li>Enviar comunicações quando houver consentimento ou relação de cliente.</li>
      </ul>
      <p>
        As bases legais são a execução de contrato, o legítimo interesse no atendimento e na gestão do negócio, o
        cumprimento de obrigações legais e, quando aplicável, o consentimento.
      </p>

      <h2>3. Atendimento automatizado</h2>
      <p>
        Parte das mensagens recebidas pode ser respondida por um assistente automatizado com inteligência artificial,
        que tira dúvidas frequentes e encaminha a conversa para uma pessoa da equipe quando necessário. Você pode pedir
        atendimento humano a qualquer momento.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Não vendemos dados pessoais. Os dados são tratados com fornecedores necessários à operação:</p>
      <ul>
        <li>Hotmart (venda e entrega de produtos digitais);</li>
        <li>Meta Platforms (WhatsApp, Instagram e anúncios);</li>
        <li>Supabase e Vercel (armazenamento e hospedagem do sistema);</li>
        <li>Anthropic (processamento das mensagens pelo assistente automatizado).</li>
      </ul>
      <p>Alguns desses fornecedores armazenam dados fora do Brasil, com salvaguardas contratuais adequadas.</p>

      <h2>5. Armazenamento e segurança</h2>
      <p>
        Os dados ficam em ambiente protegido, com acesso restrito à equipe autorizada e controle por perfil de acesso.
        Mantemos os dados pelo tempo necessário às finalidades acima e às obrigações legais.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Você pode solicitar a qualquer momento a confirmação do tratamento, o acesso, a correção, a anonimização, a
        portabilidade ou a exclusão dos seus dados, além de revogar consentimentos. Veja como pedir a exclusão em{" "}
        <a href="/exclusao-de-dados">Exclusão de dados</a>.
      </p>

      <h2>7. Contato</h2>
      <p>
        Dúvidas sobre esta política ou sobre seus dados: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalPage>
  );
}
