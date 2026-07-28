import type { FC, ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

const Container: FC<ContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`mx-auto w-full max-w-container px-6 md:px-10 lg:px-16 ${className}`}>
      {children}
    </div>
  )
}

export { Container }
