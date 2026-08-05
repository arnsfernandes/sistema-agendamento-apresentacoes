# Regras de Negócio

## 1. Confirmado e implementado
* **Clientes:** Ficam armazenados no Supabase e não são excluídos quando uma apresentação ou participação associada é removida.
* **Histórico:**
  * Apresentações passadas com participantes permanecem no histórico.
  * Clientes não são apagados pela exclusão de apresentações ou participações.
* **Restrição Temporal:**
  * Apresentações já encerradas não aceitam novos participantes.
  * Apresentações em andamento podem receber participantes até o horário final.
* **Ações de Participantes:** Participantes vinculados a uma apresentação comercial podem ser cancelados, reativados ou remarcados individualmente.
* **Unicidade:**
  * O mesmo cliente não pode estar vinculado a duas apresentações futuras diferentes.
  * O mesmo cliente não pode aparecer duplicado na mesma apresentação.
* **Movimentação em Lote antes da Exclusão:**
  * Todos os participantes ativos de uma apresentação de origem são migrados obrigatoriamente para a mesma apresentação futura de destino.
  * A presença de qualquer participante com status `cancelado` na origem bloqueia toda a operação, exigindo reativação prévia.
  * A existência de algum cliente da origem (ativo ou cancelado) já cadastrado na apresentação de destino bloqueia toda a migração.
  * Durante a movimentação, o campo de comentários (`observacao`) de cada participação é limpo (`NULL`).
  * O status de envio da mensagem (`link_enviado`) de cada participante é resetado para `FALSE`.
  * Os clientes não são excluídos.
  * A movimentação das participações ativas e a remoção física da apresentação de origem no banco de dados local ocorrem sob uma mesma transação atômica (RPC).

## 2. Confirmado, mas ainda não implementado
* Recorrência semanal com um ou mais dias da semana.
* Edição e exclusão de uma ocorrência ou de toda a série.
* Sincronização por período visível.
* Reconciliação de alterações feitas diretamente no Google Agenda.
* Controle da conta Google responsável.
* Detecção de conflitos antes de salvar.
* Tratamento de apresentações pendentes de sincronização.

## 3. Fora do MVP atual
* Recorrência diária, mensal, anual ou personalizada.
* Bloqueio em tempo real de edição concorrente de registros entre múltiplos usuários.
* Notificações avançadas (envios automáticos via e-mail ou WhatsApp).
* Convites de clientes pelo Google Agenda.
