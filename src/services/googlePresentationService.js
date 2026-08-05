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

export const createGooglePresentation = async (presentationData) => {
  try {
    const { data, error } = await supabase.functions.invoke('google-presentation-create', {
      body: {
        title: presentationData.title,
        date: presentationData.date,
        startTime: presentationData.startTime,
        endTime: presentationData.endTime
      }
    })

    if (error) throw error
    if (!data || !data.presentation) {
      throw new Error('Retorno da função inválido.')
    }

    return data.presentation
  } catch (err) {
    console.error('Erro ao criar apresentação:', err)
    await handleFunctionError(err, 'Não foi possível criar a apresentação comercial. Tente novamente.')
  }
}

export const updateGooglePresentation = async (presentationData) => {
  try {
    const { error } = await supabase.functions.invoke('google-presentation-update', {
      body: {
        presentationId: presentationData.presentationId,
        title: presentationData.title,
        date: presentationData.date,
        startTime: presentationData.startTime,
        endTime: presentationData.endTime
      }
    })

    if (error) throw error
  } catch (err) {
    console.error('Erro ao atualizar apresentação comercial:', err)
    await handleFunctionError(err, 'Não foi possível atualizar a apresentação comercial. Tente novamente.')
  }
}

export const deleteGooglePresentation = async (presentationId, deleteParticipants) => {
  try {
    const { error } = await supabase.functions.invoke('google-presentation-delete', {
      body: { presentationId, deleteParticipants }
    })

    if (error) throw error
  } catch (err) {
    console.error('Erro ao excluir apresentação comercial:', err)
    await handleFunctionError(err, 'Não foi possível excluir a apresentação comercial. Tente novamente.')
  }
}

export const moveParticipantsAndDeletePresentation = async (sourcePresentationId, targetPresentationId) => {
  try {
    const { error } = await supabase.functions.invoke('google-presentation-move-and-delete', {
      body: {
        sourcePresentationId,
        targetPresentationId
      }
    })

    if (error) throw error
  } catch (err) {
    console.error('Erro ao mover participantes e excluir apresentação:', err)
    await handleFunctionError(err, 'Não foi possível mover os participantes e excluir a apresentação. Tente novamente.')
  }
}
