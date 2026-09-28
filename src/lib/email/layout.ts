/**
 * The single RePXL email layout shell.
 *
 * Every outgoing customer email is composed as:
 *   [ neutral canvas ]
 *     [ RePXL wordmark header ]
 *     [ white card: optional accent top-rule, heading, body content ]
 *     [ minimal footer: brand line, optional support links, optional unsubscribe ]
 *
 * The layout owns the responsive/dark-mode/Gmail-compatibility concerns so
 * templates only supply a title and body HTML.
 */

import {
  EMAIL_COLORS as C,
  EMAIL_FONT_SANS,
  EMAIL_FONT_SERIF,
  EMAIL_FONT_MONO,
  EMAIL_MAX_WIDTH,
} from './tokens'
import { escapeHtml, safeUrl, siteOrigin } from './format'

export interface EmailFooterLink {
  label: string
  url: string
}

export interface EmailLayoutOptions {
  /** <title> + hidden preheader source when `preheader` is absent. */
  title: string
  /** Visible heading at the top of the card. Defaults to `title`. */
  heading?: string
  /** Hidden inbox-preview snippet. */
  preheader?: string
  /** Trusted, pre-escaped body HTML (compose with components.ts). */
  bodyHtml: string
  /** Optional support/account links shown in the footer. */
  footerLinks?: EmailFooterLink[]
  /**
   * Optional unsubscribe URL. Only supply this for PROMOTIONAL/marketing emails
   * — transactional and security emails must not include unsubscribe controls.
   */
  unsubscribeUrl?: string | null
  /** Optional small legal/sender note under the brand line. */
  footerNote?: string
}

/** Renders the full HTML document for an email. */
export function renderEmailLayout(options: EmailLayoutOptions): string {
  const { title, bodyHtml, preheader, footerLinks, unsubscribeUrl, footerNote } = options
  const heading = options.heading ?? title
  const site = siteOrigin()
  const year = new Date().getFullYear()

  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:${C.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : ''

  const footerLinksHtml =
    footerLinks && footerLinks.length > 0
      ? `<p style="margin:0 0 10px;font-family:${EMAIL_FONT_SANS};font-size:12px;line-height:1.6;color:${C.textMuted};">${footerLinks
          .map((l) => {
            const href = safeUrl(l.url, site)
            return href
              ? `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${C.textMuted};text-decoration:underline;">${escapeHtml(l.label)}</a>`
              : ''
          })
          .filter(Boolean)
          .join(`&nbsp;&nbsp;&middot;&nbsp;&nbsp;`)}</p>`
      : ''

  const safeUnsub = safeUrl(unsubscribeUrl, site)
  const unsubscribeHtml = safeUnsub
    ? `<p style="margin:0 0 10px;font-family:${EMAIL_FONT_SANS};font-size:12px;line-height:1.6;color:${C.textFaint};">You received this because you subscribed to RePXL updates. <a href="${safeUnsub}" target="_blank" rel="noopener noreferrer" style="color:${C.textFaint};text-decoration:underline;">Unsubscribe</a>.</p>`
    : ''

  const footerNoteHtml = footerNote
    ? `<p style="margin:0 0 12px;font-family:${EMAIL_FONT_SANS};font-size:12px;line-height:1.6;color:${C.textMuted};">${escapeHtml(footerNote)}</p>`
    : ''

  const headingHtml = heading
    ? `<h1 style="margin:0 0 18px;font-family:${EMAIL_FONT_SERIF};font-size:23px;font-weight:700;line-height:1.3;letter-spacing:-0.2px;color:${C.text};">${escapeHtml(heading)}</h1>`
    : ''

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.canvas}" style="background-color:${C.canvas};">
  <tr>
    <td align="center" style="padding:36px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:${EMAIL_MAX_WIDTH}px;">

        <!-- HEADER / WORDMARK -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <a href="${site}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
              <span style="font-family:${EMAIL_FONT_SERIF};font-size:24px;font-weight:700;letter-spacing:-0.4px;color:${C.text};line-height:1;">RePXL</span>
            </a>
            <div style="height:2px;line-height:2px;font-size:0;width:34px;margin:8px auto 0;background-color:${C.accent};">&nbsp;</div>
          </td>
        </tr>

        <!-- CARD -->
        <tr>
          <td style="background-color:${C.surface};border:1px solid ${C.border};border-radius:10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:36px 32px 32px;">
                  ${headingHtml}
                  ${bodyHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding:28px 12px 8px;">
            ${footerNoteHtml}
            ${footerLinksHtml}
            ${unsubscribeHtml}
            <p style="margin:6px 0 4px;font-family:${EMAIL_FONT_MONO};font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.textFaint};">&copy; ${year} RePXL</p>
            <p style="margin:0;font-family:${EMAIL_FONT_SANS};font-size:11px;line-height:1.6;color:${C.textFaint};">Vintage Digital Cameras &middot; Condition-graded &middot; Serial-verified</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/** Standard support links used by transactional/account emails. */
export function defaultFooterLinks(): EmailFooterLink[] {
  return [
    { label: 'My Purchases', url: '/account/orders' },
    { label: 'Help & FAQ', url: '/faq' },
    { label: 'Contact', url: '/contact' },
  ]
}

export { EMAIL_FONT_SERIF }
