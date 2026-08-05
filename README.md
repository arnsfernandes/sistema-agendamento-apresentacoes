# Sistema de Agendamento de Apresentações Comerciais

Este sistema gerencia e agenda apresentações comerciais, permitindo criar, editar e excluir apresentações integradas ao Google Agenda e o controle unificado de participantes.

## Objetivo
O objetivo do sistema é facilitar o controle de reuniões de demonstração e apresentações comerciais, vinculando clientes e permitindo ações como agendamento, remarcação, cancelamento e movimentação de participantes em lote de forma atômica e segura.

## Tecnologias Utilizadas
* **Frontend:** React, Vite, JavaScript, CSS (Vanilla)
* **Backend & Banco de Dados:** Supabase, PostgreSQL (RPC/Functions)
* **Servidor Serverless:** Supabase Edge Functions (Deno)
* **Integração Externa:** Google Calendar API

## Instruções para Desenvolvimento

### Instalação das dependências
```bash
npm install
```

### Execução local em ambiente de desenvolvimento
```bash
npm run dev
```

### Geração da build de produção
```bash
npm run build
```

## Documentação Adicional
Para detalhes aprofundados sobre o funcionamento e regras do projeto, consulte:
* [Regras de Negócio](docs/business-rules.md)
* [Integração com Google Agenda](docs/google-calendar-integration.md)
