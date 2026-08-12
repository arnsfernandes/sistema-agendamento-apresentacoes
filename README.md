# Meety - Sistema de Agendamento de Apresentações Comerciais

Meety é um sistema interno para organizar apresentações comerciais, centralizando clientes, participantes e reuniões em uma interface integrada ao Google Agenda.

## Objetivo

Facilitar o trabalho de atendentes no agendamento e acompanhamento de apresentações comerciais, evitando a necessidade de editar manualmente o Google Agenda.

Cada usuário do Meety possui um ambiente privado, com seus próprios clientes, apresentações e integração com o Google.

## Principais Funções do MVP

* **Autenticação:** cadastro, login e recuperação de acesso utilizando Supabase Auth.
* **Calendário mensal:** visualização das apresentações e participantes por dia.
* **Gestão de apresentações:** criação, edição, exclusão e consulta de apresentações.
* **Apresentações recorrentes:** criação e gerenciamento de séries recorrentes integradas ao Google Agenda.
* **Gestão de clientes:** cadastro, edição, busca e consulta de clientes.
* **Gestão de participantes:** adicionar, editar, cancelar, reativar e remover participantes das apresentações.
* **Remarcação:** mover participantes para outra apresentação disponível.
* **Google Agenda:** criação e atualização dos eventos correspondentes às apresentações.
* **Google Meet:** geração de reunião do Google Meet no próprio evento do Google Agenda.
* **Mensagem para WhatsApp:** geração de mensagem pronta com as informações da apresentação e link correspondente.
* **Sincronização:** atualização das apresentações quando eventos são alterados ou removidos diretamente no Google Agenda.
* **Temas:** suporte aos modos claro e escuro.

## Ambiente por Usuário e Agenda

Cada usuário conecta sua própria conta Google e seleciona a agenda que deseja utilizar no Meety.

Os dados ficam associados ao contexto formado pelo usuário, conta Google e agenda selecionada.

Isso permite que diferentes agendas mantenham seus próprios:

* clientes;
* apresentações;
* recorrências;
* participantes;
* histórico;
* identificadores dos eventos Google;
* links do Google Meet.

Ao selecionar novamente uma conta e agenda utilizadas anteriormente, o contexto correspondente volta a ser exibido.

No MVP, apenas uma integração Google fica ativa por usuário de cada vez.

## Integração com Google Agenda

O Google Agenda é a referência para os dados relacionados ao calendário, como:

* data;
* horário;
* duração;
* recorrência;
* existência do evento;
* link do Google Meet.

O Supabase mantém os dados internos do Meety, como:

* clientes;
* participantes;
* vínculos entre clientes e apresentações;
* histórico;
* informações de atendimento;
* contexto da integração Google.

Alterações realizadas pelo Meety são enviadas ao Google Agenda por meio de Supabase Edge Functions.

Alterações feitas diretamente no Google também podem ser identificadas durante a sincronização e refletidas no sistema conforme as regras de negócio.

## Stack Principal

* **Frontend:** React, Vite, JavaScript e CSS
* **Autenticação:** Supabase Auth
* **Banco de Dados:** Supabase / PostgreSQL
* **Backend Serverless:** Supabase Edge Functions com Deno e TypeScript
* **API Externa:** Google Calendar API
* **Deploy do Frontend:** Vercel

## Estrutura Básica

```text
├── docs/
│   ├── business-rules.md
│   └── google-calendar-integration.md
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── services/
│   │   └── supabaseClient.js
│   ├── utils/
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
│
├── supabase/
│   ├── functions/
│   └── migrations/
│
└── package.json
```

### `src/components`

Contém os componentes visuais da aplicação, incluindo views, calendário, painéis e modais.

### `src/services`

Centraliza o acesso aos dados e integrações utilizados pelo frontend, incluindo o cliente do Supabase.

### `supabase/functions`

Contém as Edge Functions responsáveis principalmente pela comunicação segura com a API do Google Calendar.

### `supabase/migrations`

Mantém o histórico de alterações da estrutura do banco de dados, funções e regras de acesso.

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://<seu-projeto-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<sua-chave-publica>
VITE_APP_URL=http://localhost:5173
```

Em desenvolvimento, `VITE_APP_URL` deve apontar para o endereço local da aplicação.

Em produção, deve apontar para a URL publicada na Vercel.

## Executando Localmente

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

## Validação

Execute o linter:

```bash
npm run lint
```

Execute o build de produção:

```bash
npm run build
```

## Deploy

O frontend está conectado à Vercel e pode ser publicado a partir das atualizações enviadas ao repositório.

As Edge Functions do Supabase podem ser publicadas individualmente com:

```bash
supabase functions deploy <nome-da-funcao>
```

## Documentação Adicional

Mais detalhes sobre regras e integração estão disponíveis em:

* [Regras de Negócio](docs/business-rules.md)
* [Integração com Google Agenda](docs/google-calendar-integration.md)
