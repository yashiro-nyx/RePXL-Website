import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-display-lg text-repixl-text-light">
        404
      </h1>
      <p className="font-mono text-sm text-repixl-muted">
        Frame not found.
      </p>
      <Link
        href="/"
        className="mt-4 text-sm text-repixl-red hover:underline"
      >
        Back to home
      </Link>
    </main>
  )
}
