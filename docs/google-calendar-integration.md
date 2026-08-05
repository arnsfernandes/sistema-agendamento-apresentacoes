# Integração com o Google Agenda

## 1. Papel do Google Agenda
O Google Agenda atua como a fonte da verdade oficial para os seguintes dados e estados:
* **Título:** Nome descritivo do evento/apresentação comercial.
* **Data e horário:** Data e hora de início programados.
* **Duração:** Tempo total estimado do evento.
* **Recorrência:** Configuração de repetições (quando aplicável).
* **Link do Meet:** Link da videoconferência do Google Meet gerado automaticamente para a apresentação.
* **Existência do evento:** O status de existência real e validade do evento da agenda.

*Nota:* Os clientes cadastrados nas participações comerciais **não** são adicionados como convidados diretamente pelo Google Agenda.

## 2. Papel do Supabase
O Supabase armazena os dados de negócio e mantém o espelho local necessário das apresentações.
* **Armazenamento de Clientes:** Cadastro e perfil de contatos comerciais.
* **Armazenamento de Participações:** Vínculo de cada cliente a uma respectiva apresentação comercial.
* **Espelho Local:** Mantém os dados locais necessários das apresentações para exibição e relacionamento com participantes.
* **Armazenamento de Identificadores:** Guarda os identificadores únicos do evento (`google_event_id`) e da agenda (`google_calendar_id`) necessários para as chamadas de API.
* **Histórico:** Preserva o histórico de participações e apresentações passadas conforme as regras de negócio.

## 3. Implementado
* **Conexão:** Integração e conexão com a conta Google.
* **Agenda:** Seleção e mapeamento da agenda de trabalho.
* **Criação de Apresentação:** Inclusão e agendamento automático de novas reuniões contendo links gerados para o Google Meet.
* **Edição de Apresentação:** Atualização das informações de agendamentos existentes.
* **Exclusão de Apresentação:** Deleção física de agendamentos no Google e na base local.
* **Movimentação em Lote:** Migração automática de todos os participantes de uma apresentação antes de sua exclusão.
* **Serverless Functions:** Edge Functions dedicadas ao ciclo de vida e controle das apresentações.
* **Resiliência do Delete:** Tratamento de erros HTTP `404` e `410` no Google Agenda como sucesso silencioso (evento já removido).
* **Processamento Atômico:** RPC `mover_participantes_e_excluir_apresentacao` para execução transacional das ações de movimentação e exclusão locais.
* **Controle de Migration:** Criação do script de migration versionado em `supabase/migrations/20260805194000_mover_participantes_e_excluir_apresentacao.sql`.
* **Detecção de conflitos:** Detecção de conflitos de horário antes de criar ou editar uma apresentação.

## 4. Confirmado, mas ainda não implementado
* Sincronização por período visível.
* Recorrência semanal.
* Edição e exclusão de uma ocorrência ou de toda a série.
* Reconciliação de alterações feitas diretamente no Google Agenda.
* Controle completo da conta Google responsável.
* Apresentações pendentes de sincronização.
