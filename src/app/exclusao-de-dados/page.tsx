import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Exclusão de dados | Paula Chiaradia" };

export default function ExclusaoDeDadosPage() {
  return (
    <LegalPage title="Exclusão de dados">
      <p>
        Você pode pedir a exclusão dos dados pessoais que mantemos sobre você, incluindo mensagens trocadas pelo
        WhatsApp, pelo Instagram ou por e-mail.
      </p>

      <h2>Como solicitar</h2>
      <ol>
        <li>
          Envie um e-mail para <a href={`mailto:${COMPANY.email}?subject=Exclus%C3%A3o%20de%20dados`}>{COMPANY.email}</a>{" "}
          com o assunto “Exclusão de dados”;
        </li>
        <li>Informe o nome, o telefone e/ou o e-mail usados no contato conosco;</li>
        <li>Se preferir, envie o mesmo pedido por mensagem no WhatsApp ou no Direct do Instagram.</li>
      </ol>

      <h2>Prazo</h2>
      <p>
        Confirmamos o recebimento e concluímos a exclusão em até 15 dias. Dados que precisamos manter por obrigação legal
        (por exemplo, registros fiscais de compras) são preservados apenas pelo prazo exigido em lei.
      </p>

      <h2>Dados de compras na Hotmart</h2>
      <p>
        Dados de cadastro e pagamento na Hotmart são controlados pela própria plataforma. Para excluí-los, solicite
        também diretamente à Hotmart.
      </p>
    </LegalPage>
  );
}
