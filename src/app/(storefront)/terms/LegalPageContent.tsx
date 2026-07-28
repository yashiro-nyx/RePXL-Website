'use client'

export function LegalPageContent({ content }: { content: string }) {
  return (
    <div className="prose-repixl">
      {content.split('\n').map((line, i) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('### ')) {
          return <h3 key={i} className="mb-2 mt-6 font-display text-base font-semibold text-repixl-text-light">{trimmed.slice(4)}</h3>
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={i} className="mb-4 font-display text-display-md text-repixl-text-light">{trimmed.slice(3)}</h2>
        }
        if (trimmed.startsWith('- ')) {
          return <li key={i} className="ml-4 list-disc text-sm leading-relaxed text-repixl-text-light/70" dangerouslySetInnerHTML={{ __html: boldify(trimmed.slice(2)) }} />
        }
        if (trimmed === '') return <div key={i} className="h-3" />
        return <p key={i} className="text-sm leading-relaxed text-repixl-text-light/70" dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />
      })}
    </div>
  )
}

function boldify(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-repixl-text-light font-medium">$1</strong>')
}
