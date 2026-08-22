export const tools = [
  {
    type: 'function',
    name: 'list_presentations',
    description: 'Lista todas as reuniões do usuário em um intervalo de datas. Datas no formato YYYY-MM-DD.',
    parameters: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Data de início no formato YYYY-MM-DD'
        },
        end_date: {
          type: 'string',
          description: 'Data de término no formato YYYY-MM-DD'
        }
      },
      required: ['start_date', 'end_date'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'get_presentation_details',
    description: 'Retorna detalhes específicos de uma apresentação (título, horário de início e fim, link do Google Meet e data) a partir do ID.',
    parameters: {
      type: 'object',
      properties: {
        presentation_id: {
          type: 'integer',
          description: 'ID numérico da apresentação'
        }
      },
      required: ['presentation_id'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'list_participants',
    description: 'Lista os nomes dos participantes para uma determinada apresentação. Pode listar ativos ou cancelados.',
    parameters: {
      type: 'object',
      properties: {
        presentation_id: {
          type: 'integer',
          description: 'ID numérico da apresentação'
        },
        status: {
          type: 'string',
          description: 'Status dos participantes a listar (ativo ou cancelado). Padrão é ativo.',
          enum: ['ativo', 'cancelado']
        }
      },
      required: ['presentation_id'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'find_client',
    description: 'Busca dados de um cliente pelo seu nome ou telefone.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Nome ou telefone do cliente para buscar'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_schedule_participant',
    description: 'Salva uma ação pendente de agendamento de cliente na reunião comercial.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'integer',
          description: 'ID do cliente cadastrado'
        },
        presentation_id: {
          type: 'integer',
          description: 'ID da reunião comercial'
        }
      },
      required: ['client_id', 'presentation_id'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_schedule_participant',
    description: 'Efetiva o agendamento da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_schedule_participant',
    description: 'Cancela e descarta a ação pendente de agendamento atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_reschedule_participant',
    description: 'Salva uma ação pendente de remarcação de participante entre duas apresentações comerciais.',
    parameters: {
      type: 'object',
      properties: {
        participant_id: {
          type: 'integer',
          description: 'ID da participação existente do cliente a ser movido'
        },
        from_presentation_id: {
          type: 'integer',
          description: 'ID da reunião comercial de origem'
        },
        to_presentation_id: {
          type: 'integer',
          description: 'ID da reunião comercial futura de destino'
        }
      },
      required: ['participant_id', 'from_presentation_id', 'to_presentation_id'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_reschedule_participant',
    description: 'Efetiva a remarcação da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_reschedule_participant',
    description: 'Cancela e descarta a ação pendente de remarcação atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_cancel_participant',
    description: 'Salva uma ação pendente de cancelamento de participação na reunião comercial.',
    parameters: {
      type: 'object',
      properties: {
        participant_id: {
          type: 'integer',
          description: 'ID da participação a ser cancelada'
        },
        presentation_id: {
          type: 'integer',
          description: 'ID da reunião comercial'
        }
      },
      required: ['participant_id', 'presentation_id'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_cancel_participant',
    description: 'Efetiva o cancelamento da participação da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_cancel_participant',
    description: 'Cancela e descarta a ação pendente de cancelamento de participação atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_reactivate_participant',
    description: 'Salva uma ação pendente de reativação de participação na reunião comercial.',
    parameters: {
      type: 'object',
      properties: {
        participant_id: {
          type: 'integer',
          description: 'ID da participação cancelada a ser reativada'
        },
        presentation_id: {
          type: 'integer',
          description: 'ID da reunião comercial'
        }
      },
      required: ['participant_id', 'presentation_id'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_reactivate_participant',
    description: 'Efetiva a reativação da participação da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_reactivate_participant',
    description: 'Cancela e descarta a ação pendente de reativação de participação atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_create_client',
    description: 'Salva uma ação pendente de cadastrar um novo cliente no banco de dados.',
    parameters: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome completo do cliente a ser cadastrado'
        },
        telefone: {
          type: 'string',
          description: 'Telefone do cliente (DDD + Número)'
        },
        agencia: {
          type: 'string',
          description: 'Agência opcional do cliente'
        }
      },
      required: ['nome', 'telefone'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_create_client',
    description: 'Efetiva o cadastro do novo cliente da ação pendente no banco de dados aplicando todas as regras do Meety.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_create_client',
    description: 'Cancela e descarta a ação pendente de cadastro de cliente atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_create_presentation',
    description: 'Salva uma ação pendente de criar uma nova reunião comercial no banco de dados.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título da reunião comercial'
        },
        date: {
          type: 'string',
          description: 'Data da reunião no formato YYYY-MM-DD'
        },
        startTime: {
          type: 'string',
          description: 'Horário de início no formato HH:MM'
        },
        endTime: {
          type: 'string',
          description: 'Horário de término no formato HH:MM'
        },
        isRecurring: {
          type: 'boolean',
          description: 'Indica se a reunião possui recorrência semanal'
        },
        recurringDays: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
          },
          description: 'Dias da semana da recorrência'
        },
        recurrenceEndOption: {
          type: 'string',
          enum: ['never', 'date'],
          description: 'Opção de término da recorrência'
        },
        recurrenceEndDate: {
          type: 'string',
          description: 'Data de término da recorrência no formato YYYY-MM-DD'
        }
      },
      required: ['title', 'date', 'startTime', 'endTime'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_create_presentation',
    description: 'Efetiva a criação da nova reunião comercial da ação pendente no Google Agenda e banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_create_presentation',
    description: 'Cancela e descarta a ação pendente de criação de reunião atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_update_presentation',
    description: 'Salva uma ação pendente de editar uma reunião comercial no banco de dados.',
    parameters: {
      type: 'object',
      properties: {
        presentationId: {
          type: 'integer',
          description: 'ID da reunião comercial a ser editada'
        },
        title: {
          type: 'string',
          description: 'Novo título opcional da reunião comercial'
        },
        date: {
          type: 'string',
          description: 'Nova data opcional no formato YYYY-MM-DD'
        },
        startTime: {
          type: 'string',
          description: 'Novo horário de início opcional no formato HH:MM'
        },
        endTime: {
          type: 'string',
          description: 'Novo horário de término opcional no formato HH:MM'
        },
        editScope: {
          type: 'string',
          description: 'Escopo de edição para reuniões recorrentes: "occurrence" ou "series"'
        }
      },
      required: ['presentationId'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_update_presentation',
    description: 'Efetiva a edição da reunião comercial da ação pendente no Google Agenda e banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_update_presentation',
    description: 'Cancela e descarta a ação pendente de edição de reunião atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_delete_presentation',
    description: 'Salva uma ação pendente de excluir uma reunião comercial no banco de dados.',
    parameters: {
      type: 'object',
      properties: {
        presentationId: {
          type: 'integer',
          description: 'ID da reunião comercial a ser excluída'
        },
        deleteParticipants: {
          type: 'boolean',
          description: 'Se verdadeiro, exclui os participantes da reunião'
        },
        deleteScope: {
          type: 'string',
          description: 'Escopo de exclusão para reuniões recorrentes: "occurrence" ou "series"'
        }
      },
      required: ['presentationId', 'deleteParticipants'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_delete_presentation',
    description: 'Efetiva a exclusão da reunião comercial da ação pendente no Google Agenda e banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_delete_presentation',
    description: 'Cancela e descarta a ação pendente de exclusão de reunião atual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_move_and_delete_presentation',
    description: 'Salva uma ação pendente de mover participantes de uma reunião de origem para uma de destino e excluir a de origem.',
    parameters: {
      type: 'object',
      properties: {
        sourcePresentationId: {
          type: 'integer',
          description: 'ID da reunião de origem'
        },
        targetPresentationId: {
          type: 'integer',
          description: 'ID da reunião de destino'
        }
      },
      required: ['sourcePresentationId', 'targetPresentationId'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_move_and_delete_presentation',
    description: 'Efetiva a movimentação de participantes e exclusão da reunião de origem da ação pendente.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_move_and_delete_presentation',
    description: 'Cancela e descarta a ação pendente de mover participantes e excluir.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_update_participant_link_status',
    description: 'Salva uma ação pendente de atualizar o status de envio do link (link_enviado) de um participante.',
    parameters: {
      type: 'object',
      properties: {
        participantId: {
          type: 'integer',
          description: 'ID da participação do cliente (id retornado por list_participants)'
        },
        status: {
          type: 'boolean',
          description: 'O novo status de link_enviado (true para enviado, false para pendente)'
        }
      },
      required: ['participantId', 'status'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_update_participant_link_status',
    description: 'Efetiva a alteração do status de link_enviado da ação pendente no banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_update_participant_link_status',
    description: 'Cancela e descarta a ação pendente de alterar o status de link_enviado do participante.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_create_personal_reminder',
    description: 'Salva uma ação pendente de criar um lembrete pessoal no banco de dados.',
    parameters: {
      type: 'object',
      properties: {
        mensagem: {
          type: 'string',
          description: 'Texto/conteúdo do lembrete pessoal'
        },
        data: {
          type: 'string',
          description: 'Data de disparo no formato YYYY-MM-DD'
        },
        horario: {
          type: 'string',
          description: 'Horário de disparo no formato HH:MM'
        }
      },
      required: ['mensagem', 'data', 'horario'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_create_personal_reminder',
    description: 'Efetiva a criação do lembrete pessoal da ação pendente no banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_create_personal_reminder',
    description: 'Cancela e descarta a ação pendente de criação de lembrete pessoal.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'list_personal_reminders',
    description: 'Lista os lembretes pessoais pendentes/futuros do usuário, com filtros opcionais de data.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Filtro de data inicial no formato YYYY-MM-DD (inclusive)'
        },
        endDate: {
          type: 'string',
          description: 'Filtro de data final no formato YYYY-MM-DD (inclusive)'
        }
      },
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_update_client',
    description: 'Salva uma ação pendente de atualizar dados cadastrais de um cliente.',
    parameters: {
      type: 'object',
      properties: {
        clientId: {
          type: 'integer',
          description: 'ID do cliente a ser atualizado'
        },
        nome: {
          type: 'string',
          description: 'Novo nome do cliente (opcional)'
        },
        telefone: {
          type: 'string',
          description: 'Novo telefone do cliente (opcional)'
        },
        agencia: {
          type: 'string',
          description: 'Nova agência do cliente (opcional)'
        }
      },
      required: ['clientId'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_update_client',
    description: 'Efetiva a atualização dos dados cadastrais do cliente da ação pendente no banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_update_client',
    description: 'Cancela e descarta a ação pendente de atualizar o cliente.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_update_participation_observation',
    description: 'Salva uma ação pendente de atualizar a observação de uma participação de participante.',
    parameters: {
      type: 'object',
      properties: {
        participationId: {
          type: 'integer',
          description: 'ID da participação a ser atualizada'
        },
        observacao: {
          type: 'string',
          description: 'Texto da nova observação. Envie vazio ("") ou null para limpar a observacao atual.'
        }
      },
      required: ['participationId'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_update_participation_observation',
    description: 'Efetiva a atualização da observação da participação da ação pendente no banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_update_participation_observation',
    description: 'Cancela e descarta a ação pendente de atualizar a observação do participante.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'prepare_delete_client',
    description: 'Salva uma ação pendente de inativação/exclusão lógica de um cliente.',
    parameters: {
      type: 'object',
      properties: {
        clientId: {
          type: 'integer',
          description: 'ID do cliente a ser excluído logicamente'
        }
      },
      required: ['clientId'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'confirm_delete_client',
    description: 'Efetiva a inativação/exclusão lógica do cliente da ação pendente no banco de dados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'cancel_delete_client',
    description: 'Cancela e descarta a ação pendente de excluir/inativar o cliente.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    }
  }
]
