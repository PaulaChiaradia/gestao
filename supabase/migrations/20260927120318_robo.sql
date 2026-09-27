-- Robô de atendimento: configurações e base de conhecimento

create table public.bot_settings (
  id int primary key default 1 check (id = 1),  -- linha única
  enabled boolean not null default false,
  assistant_name text not null,
  tone text not null,
  greeting text,
  business_hours text,
  pricing_policy text not null default 'produtos' check (pricing_policy in ('todos', 'produtos', 'nenhum')),
  qualify_questions text,
  handoff_rules text,
  model text not null default 'claude-opus-5',
  effort text not null default 'low' check (effort in ('low', 'medium', 'high')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table public.bot_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  active boolean not null default true,
  needs_review boolean not null default false,
  review_note text,
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.bot_settings enable row level security;
alter table public.bot_knowledge enable row level security;

create policy "Admin e gestor veem o robô" on public.bot_settings
  for select to authenticated using (public.has_role(array['admin', 'gestor']::public.app_role[]));
create policy "Admin e gestor editam o robô" on public.bot_settings
  for update to authenticated
  using (public.has_role(array['admin', 'gestor']::public.app_role[]))
  with check (public.has_role(array['admin', 'gestor']::public.app_role[]));

create policy "Admin e gestor veem a base" on public.bot_knowledge
  for select to authenticated using (public.has_role(array['admin', 'gestor']::public.app_role[]));
create policy "Admin e gestor editam a base" on public.bot_knowledge
  for all to authenticated
  using (public.has_role(array['admin', 'gestor']::public.app_role[]))
  with check (public.has_role(array['admin', 'gestor']::public.app_role[]));

insert into public.bot_settings (assistant_name, tone, greeting, business_hours, pricing_policy, qualify_questions, handoff_rules) values (
  'Assistente da Paula Chiaradia',
  'Cordial, próxima e profissional, em português do Brasil. Frases curtas, próprias para WhatsApp e Direct. No máximo um emoji por mensagem. Trate a pessoa pelo nome quando souber. Nunca invente informações: se não estiver na base, diga que vai confirmar com a equipe.',
  'Olá! Aqui é o assistente da Paula Chiaradia. Como posso te ajudar hoje?',
  'Segunda a sexta, das 9h às 18h. Fora desse horário, avise que a equipe responde no próximo dia útil.',
  'produtos',
  E'Para pedidos de palestra ou treinamento, pergunte (uma ou duas perguntas por mensagem, sem formulário):\n- Nome da empresa ou instituição\n- Cidade e estado do evento\n- Data prevista\n- Número aproximado de participantes\n- Formato: presencial ou online\n- Público e objetivo (ex.: equipe de vendas de loja de acessórios)',
  E'Passe a conversa para a equipe quando:\n- o pedido de palestra ou treinamento estiver qualificado (dados acima coletados);\n- a pessoa pedir para falar com a Paula ou com uma pessoa;\n- houver reclamação, problema de pagamento, acesso ao curso ou pedido de reembolso;\n- a pergunta não estiver respondida na base de conhecimento.'
);

insert into public.bot_knowledge (category, sort, title, content, needs_review, review_note) values
('Sobre', 1, 'Quem é Paula Chiaradia',
 E'Paula Chiaradia é consultora de imagem e moda, com formação em jornalismo, marketing, moda, consultoria de imagem e coloração pessoal. Já atendeu mais de 5 mil clientes, inclusive fora do Brasil. É membro da AICI (Associação Internacional de Consultores de Imagem) e apresenta um quadro de moda na TV Band. Hoje seu foco principal é ajudar lojistas de acessórios a aumentar o ticket médio usando técnicas da consultoria de imagem.',
 true, 'O tempo de experiência aparece como 16, 18 e 19 anos em lugares diferentes (Linktree, página do ebook e bio do Instagram). Confirme o número certo e inclua aqui.'),

('Produtos', 2, 'Curso Do Básico ao Expert em Combinações de Acessórios',
 E'Curso online, 100% gravado, para fazer no próprio ritmo. Para donas de lojas de acessórios e vendedoras que querem vender mais com combinações estratégicas, ganhar segurança no atendimento e aumentar o ticket médio.\n\nMódulos (9): Fundamentos da Percepção de Valor; Brincos Estratégicos; Colares que Elevam o Look; Harmonia de Pulseiras e Braceletes; Anéis que Vendem Mais; Acessórios de Cabelo com Intenção; Combinações Inteligentes; Acessórios para Cada Ocasião; Fechamento de Look e Fechamento de Venda.\n\nBônus: grupo exclusivo de suporte no WhatsApp e guia cromático em PDF.\nPreço: R$ 297 à vista ou 12x de R$ 30,72 (preço cheio R$ 397).\nGarantia: 7 dias incondicional, pela Hotmart.\nPágina: https://pv.paulachiaradia.com.br/la',
 true, 'Confira se o preço promocional de R$ 297 continua valendo.'),

('Produtos', 3, 'Ebook Guia Prático de Combinações de Acessórios',
 E'Ebook em PDF com dicas práticas de combinação para usar no atendimento do dia a dia, com ilustrações e técnicas de imagem aplicadas ao varejo de acessórios. Ajuda a ganhar segurança e autoridade no balcão e a valorizar a loja.\nPreço: R$ 49,90 ou 7x de R$ 8,16 (preço cheio R$ 197).\nPágina: https://pv.paulachiaradia.com.br/guiapratico\nQuem quer se aprofundar pode seguir para o curso completo.',
 false, null),

('Palestras e treinamentos', 4, 'Palestras e treinamentos para empresas',
 E'A Paula faz palestras e treinamentos para empresas, associações comerciais, redes de lojas e eventos, com temas de imagem, estilo e vendas no varejo de acessórios.\nValores e datas são definidos pela equipe depois de entender o evento: não informe preços de palestra. Colete os dados de qualificação e diga que a equipe retorna com a proposta.',
 true, 'Liste os temas de palestra disponíveis, formatos (presencial/online), duração e cidades atendidas.'),

('Serviços', 5, 'Consultoria de imagem individual',
 E'A Paula também atende consultoria de imagem individual. O agendamento é feito pelo WhatsApp (12) 99774-6242.',
 true, 'Confirme se a consultoria individual continua sendo oferecida, como funciona e se o número de agendamento é esse.'),

('Comunidade', 6, 'Grupo gratuito de WhatsApp para lojistas',
 E'Existe um grupo gratuito no WhatsApp para lojistas de acessórios, com conteúdos e novidades.\nLink para entrar: https://chat.whatsapp.com/JTVi58LhkBSCZAyJhck857',
 false, null),

('Canais', 7, 'Onde acompanhar a Paula',
 E'Instagram: @paulachiaradia_consultoria\nYouTube: canal Paula Chiaradia Consultora de Imagem\nLinks de tudo: linktr.ee/paulachiaradia_consultoria',
 false, null),

('Suporte', 8, 'Acesso ao curso e reembolso',
 E'Os cursos são entregues pela Hotmart. Depois da compra, o acesso chega no e-mail usado na compra (confira a caixa de spam) e fica na área de membros da Hotmart.\nReembolso: dentro dos 7 dias de garantia, pode ser pedido diretamente na Hotmart, em "Minhas compras".\nSe a pessoa não conseguir acessar, peça o e-mail usado na compra e passe para a equipe.',
 false, null);
