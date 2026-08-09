'use client';

import { Check, Copy } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useCallback, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const codeBlockVariants = cva('flex min-w-0 flex-col overflow-hidden text-left', {
  variants: {
    variant: {
      /**
       * A relative tint rather than a fixed colour, so the block reads as a
       * distinct surface on any ground — page, card, or the dark code stage —
       * without needing a border to announce itself.
       */
      panel: 'rounded-lg bg-foreground/[0.045]',
      /** No surface. Only for code already inside its own framed container. */
      bare: 'bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'panel',
  },
});

export type CodeToken = { text: string; tone?: 'plain' | 'accent' | 'muted' };

/** One rendered line. Tokens let callers colour parts without shipping a highlighter. */
export type CodeLine = CodeToken[];

interface CodeBlockProps extends VariantProps<typeof codeBlockVariants> {
  lines: CodeLine[];
  /** Filename or label shown in the header bar. */
  title?: ReactNode;
  /** Trailing header slot — language, byte count, whatever fits. */
  meta?: ReactNode;
  showLineNumbers?: boolean;
  /** Plain-text source for the copy button; omit to hide copying. */
  copyText?: string;
  className?: string;
  'aria-label'?: string;
}

const toneClass: Record<NonNullable<CodeToken['tone']>, string> = {
  plain: 'text-foreground',
  accent: 'text-primary',
  muted: 'text-muted-foreground',
};

function CodeBlock({
  lines,
  title,
  meta,
  showLineNumbers = true,
  copyText,
  variant,
  className,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [copyText]);

  return (
    <figure className={cn(codeBlockVariants({ variant }), className)} {...props}>
      {title || meta || copyText ? (
        <figcaption className="flex min-h-9 items-center justify-between gap-3 px-4 font-mono text-[0.66rem] text-muted-foreground">
          <span className="truncate">{title}</span>
          <span className="flex shrink-0 items-center gap-2">
            {meta}
            {copyText ? (
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? 'Copied' : 'Copy code'}
                className="grid size-7 place-items-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : (
                  <Copy aria-hidden="true" className="size-3.5" />
                )}
              </button>
            ) : null}
          </span>
        </figcaption>
      ) : null}

      <pre className="overflow-x-auto px-4 py-3 font-mono text-[clamp(0.72rem,1vw,0.82rem)] leading-[1.85]">
        <code className="grid">
          {lines.map((tokens, lineIndex) => (
            // Lines are positional and never reordered, so the index is a stable key.
            <span key={lineIndex} className="grid grid-cols-[2.5rem_minmax(0,1fr)]">
              {showLineNumbers ? (
                <span aria-hidden="true" className="select-none text-muted-foreground/60">
                  {String(lineIndex + 1).padStart(2, '0')}
                </span>
              ) : null}
              <span className="whitespace-pre">
                {tokens.map((token, tokenIndex) => (
                  <span key={tokenIndex} className={toneClass[token.tone ?? 'plain']}>
                    {token.text}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

export { CodeBlock, codeBlockVariants };
