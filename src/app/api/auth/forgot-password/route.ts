import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import { storeResetToken } from '@/lib/resetTokens'

// Always respond with the same message to prevent user enumeration
const SAFE_RESPONSE = {
  message: "If an account with that email exists, we've sent reset instructions.",
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body?.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email address.' }, { status: 400 })
    }

    // Generate a cryptographically secure token (32 bytes = 64 hex chars)
    const token = randomBytes(32).toString('hex')
    storeResetToken(token, email)

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    const gmailConfigured =
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD &&
      process.env.GMAIL_APP_PASSWORD !== 'your-gmail-app-password'

    if (gmailConfigured) {
      const transporter = createTransporter()
      const result = await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Reset your RePXL password',
        html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reset your RePXL password</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;min-width:100%;background-color:#050303;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#050303;">
  <tr>
    <td align="center" style="padding:48px 16px 40px;">

      <!-- Outer wrapper: max 560px -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">

        <!-- ── HEADER ── -->
        <tr>
          <td align="center" style="padding-bottom:36px;">
            <!-- Wordmark inside hairline bracket -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid rgba(245,241,236,0.22);padding:7px 16px;line-height:1;">
                  <span style="font-family:Georgia,'Times New Roman',Times,serif;font-size:21px;font-weight:700;letter-spacing:-0.4px;color:#f5f1ec;text-decoration:none;">RePXL</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── MAIN CARD ── -->
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.14);border-radius:6px;overflow:hidden;">

            <!-- Red top bar -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="height:3px;background-color:#c22c2c;font-size:0;line-height:0;"> </td></tr>
            </table>

            <!-- Card content -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:44px 40px 40px;">

                  <!-- Icon: lock SVG -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:28px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="width:52px;height:52px;background-color:rgba(194,44,44,0.12);border-radius:50%;text-align:center;vertical-align:middle;" align="center">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#c22c2c" stroke-width="1.8" fill="none"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c22c2c" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                              </svg>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Heading -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:14px;">
                        <h1 style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;font-weight:700;color:#f5f1ec;letter-spacing:-0.3px;line-height:1.25;">Reset Your Password</h1>
                      </td>
                    </tr>
                  </table>

                  <!-- Body copy -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:36px;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#8c8580;text-align:center;max-width:400px;">
                          We received a request to reset the password for your <strong style="color:#f5f1ec;font-weight:600;">RePXL</strong> account. Click the button below to choose a new password.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:28px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="border-radius:4px;background-color:#c22c2c;mso-padding-alt:0;">
                              <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:30pt;">&nbsp;</i><![endif]-->
                              <a href="${resetUrl}"
                                 target="_blank"
                                 style="display:inline-block;padding:15px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;background-color:#c22c2c;text-decoration:none;border-radius:4px;letter-spacing:0.3px;mso-padding-alt:15px 36px;">
                                Reset Password
                              </a>
                              <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;">&nbsp;</i><![endif]-->
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback link note -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:36px;">
                        <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:rgba(140,133,128,0.7);text-align:center;">
                          Having trouble with the button? Copy and paste this link into your browser:
                        </p>
                        <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:#c22c2c;word-break:break-all;text-align:center;line-height:1.5;">
                          <a href="${resetUrl}" style="color:#c22c2c;text-decoration:none;">${resetUrl}</a>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr><td style="height:1px;background-color:rgba(140,133,128,0.13);font-size:0;line-height:0;margin-bottom:28px;"> </td></tr>
                  </table>

                  <!-- Expiry + security info with SVG icons -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">

                    <!-- Expiry row -->
                    <tr>
                      <td style="padding-bottom:14px;vertical-align:top;" width="28">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:1px;">
                          <circle cx="12" cy="12" r="10" stroke="#8c8580" stroke-width="1.6" fill="none"/>
                          <polyline points="12 6 12 12 16 14" stroke="#8c8580" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                      </td>
                      <td style="padding-bottom:14px;vertical-align:top;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#8c8580;">
                          This link expires in <strong style="color:#f5f1ec;font-weight:600;">1 hour</strong>. After that, you will need to request a new password reset.
                        </p>
                      </td>
                    </tr>

                    <!-- Security row -->
                    <tr>
                      <td style="vertical-align:top;" width="28">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:1px;">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#8c8580" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                      </td>
                      <td style="vertical-align:top;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#8c8580;">
                          If you did not request a password reset, you can <strong style="color:#f5f1ec;font-weight:600;">safely ignore this email</strong>. Your password will not be changed.
                        </p>
                      </td>
                    </tr>

                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td align="center" style="padding-top:32px;padding-bottom:8px;">
            <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(140,133,128,0.45);">
              &copy; ${new Date().getFullYear()} RePXL
            </p>
            <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(140,133,128,0.35);letter-spacing:0.2px;">
              Vintage Digital Cameras
            </p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;color:rgba(140,133,128,0.28);letter-spacing:0.1px;">
              Condition-graded &middot; Serial-verified &middot; Trusted by collectors
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
        text: `RESET YOUR REPXL PASSWORD\n\nWe received a request to reset the password for your RePXL account.\n\nClick the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\n---\n\nIf you did not request a password reset, you can safely ignore this email. Your password will not be changed.\n\n© ${new Date().getFullYear()} RePXL`,
      })
      console.log('[forgot-password] Email sent:', result.messageId)
    } else {
      // Dev fallback — print reset URL to server console
      console.log('\n[RePXL Password Reset — DEV MODE]')
      console.log(`Email : ${email}`)
      console.log(`URL   : ${resetUrl}`)
      console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send real emails.\n')
    }

    return NextResponse.json(SAFE_RESPONSE)
  } catch (err) {
    console.error('[forgot-password] Error:', err)
    // Return safe message even on error — don't leak details
    return NextResponse.json(SAFE_RESPONSE)
  }
}
