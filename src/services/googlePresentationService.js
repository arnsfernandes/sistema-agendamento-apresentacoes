import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

const handleFunctionError = async (err, defaultMessage) => {
  let errorMsg = defaultMessage
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json()
      if (body && body.error) {
        errorMsg = body.error
      }
    } catch (_) {}
  } else if (err && err.message) {
    errorMsg = err.message
  }
  throw new Error(errorMsg)
}

const invokeFunction = async (functionName, body, defaultMessage) => {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body })
    if (error) throw error
    return data
  } catch (err) {
    console.error(`Erro ao executar a Edge Function ${functionName}:`, err)
    await handleFunctionError(err, defaultMessage)
  }
}

export const createGooglePresentation = async (presentationData) => {
  const data = await invokeFunction('google-presentation-create', {
    title: presentationData.title,
    date: presentationData.date,
    startTime: presentationData.startTime,
    endTime: presentationData.endTime,
    isRecurring: presentationData.isRecurring,
    recurringDays: presentationData.recurringDays,
    recurrenceEndOption: presentationData.recurrenceEndOption,
    recurrenceEndDate: presentationData.recurrenceEndDate
  }, 'Não foi possível criar a apresentação comercial. Tente novamente.')

  if (!data || !data.presentation) {
    throw new Error('Retorno da função inválido.')
  }
  return data.presentation
}

export const updateGooglePresentation = async (presentationData) => {
  await invokeFunction('google-presentation-update', {
    presentationId: presentationData.presentationId,
    title: presentationData.title,
    date: presentationData.date,
    startTime: presentationData.startTime,
    endTime: presentationData.endTime,
    etag: presentationData.etag,
    editScope: presentationData.editScope
  }, 'Não foi possível atualizar a apresentação comercial. Tente novamente.')
}

export const deleteGooglePresentation = async (presentationId, deleteParticipants, deleteScope = 'occurrence') => {
  await invokeFunction('google-presentation-delete', {
    presentationId,
    deleteParticipants,
    deleteScope
  }, 'Não foi possível excluir a apresentação comercial. Tente novamente.')
}

export const moveParticipantsAndDeletePresentation = async (sourcePresentationId, targetPresentationId) => {
  await invokeFunction('google-presentation-move-and-delete', {
    sourcePresentationId,
    targetPresentationId
  }, 'Não foi possível mover os participantes e excluir a apresentação. Tente novamente.')
}

export const generateMeetLink = async (presentationId) => {
  const data = await invokeFunction('google-presentation-generate-meet', {
    presentationId
  }, 'Não foi possível gerar a conferência Google Meet. Tente novamente.')
  
  return data?.meetLink
}
