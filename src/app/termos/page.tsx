import { Controller, LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Termos de Uso | Paula Chiaradia" };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes termos regem o uso dos canais de atendimento (WhatsApp, Instagram e e-mail) e dos serviços digitais
        oferecidos por <Controller />.
      </p>

      <h2>1. Atendimento</h2>
      <p>
        Nossos canais servem para tirar dúvidas sobre cursos, produtos digitais, consultorias, palestras e treinamentos.
        Algumas respostas podem ser enviadas por um assistente automatizado; a qualquer momento você pode pedir para
        falar com uma pessoa da equipe. As informações enviadas pelo assistente têm caráter informativo; condições
        comerciais valem somente quando confirmadas em proposta ou na página oficial de venda.
      </p>

      <h2>2. Compras de produtos digitais</h2>
      <p>
        Cursos e produtos digitais são vendidos e entregues pela plataforma Hotmart, que também processa pagamentos,
        reembolsos e garantias, conforme os termos da própria Hotmart e as condições de cada página de venda.
      </p>

      <h2>3. Conteúdo e propriedade intelectual</h2>
      <p>
        Os materiais, aulas, métodos e conteúdos disponibilizados são de uso pessoal e não podem ser reproduzidos,
        revendidos ou distribuídos sem autorização por escrito.
      </p>

      <h2>4. Conduta</h2>
      <p>
        Não são permitidas mensagens ofensivas, spam ou uso dos canais para fins diferentes do atendimento. Contatos com
        esse comportamento podem ser bloqueados.
      </p>

      <h2>5. Dados pessoais</h2>
      <p>
        O tratamento de dados pessoais segue a nossa <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>6. Contato</h2>
      <p>
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
    </LegalPage>
  );
}
