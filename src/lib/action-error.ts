'use client'
import { useToastStore } from '@/stores/toastStore'

export function reportActionFailure(message = 'We could not confirm the change. Please refresh and try again.') {
  useToastStore.getState().addToast(message, 'error')
}
