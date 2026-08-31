import Link from 'next/link'

export function MinimalFooter() {
  return (
    <footer className="border-t border-repixl-muted/10 py-6 text-center no-print">
      <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted/50">
        &copy; {new Date().getFullYear()} RePXL
        <span className="mx-2">&middot;</span>
        <Link href="/privacy" className="hover:text-repixl-muted transition-colors">Privacy</Link>
        <span className="mx-2">&middot;</span>
        <Link href="/terms" className="hover:text-repixl-muted transition-colors">Terms</Link>
      </p>
    </footer>
  )
}
