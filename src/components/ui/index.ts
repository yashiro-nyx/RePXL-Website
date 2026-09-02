export { Accordion } from './Accordion'
export { BackButton } from './BackButton'
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button'
export { ConditionBadge, type Condition, type ConditionBadgeProps } from './ConditionBadge'
export { CornerBracket, type CornerBracketProps } from './CornerBracket'
export { FilmStripLoader } from './FilmStripLoader'
export { LegalModal } from './LegalModal'
export { LoginRequiredModal } from './LoginRequiredModal'
export { LogoutConfirmModal } from './LogoutConfirmModal'
export { PasswordInput } from './PasswordInput'
// PHAddressSelect and PhoneInput are NOT re-exported here — they must be imported
// directly from their own files to keep the address dataset (~840KB) out of the
// shared chunk. Import them as:
//   import { PHAddressSelect } from '@/components/ui/PHAddressSelect'
//   import { PhoneInput } from '@/components/ui/PhoneInput'
// or lazy-load via next/dynamic for even better bundle splitting.
export { RevealText, type RevealTextProps } from './RevealText'
export { Skeleton, type SkeletonProps } from './Skeleton'