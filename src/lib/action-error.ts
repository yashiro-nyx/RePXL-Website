'use client'
import { useToastStore } from '@/stores/toastStore'

export function reportActionFailure() {
  useToastStore.getState().addToast('We could not confirm the change. Please refresh and try again.', 'error')
}
