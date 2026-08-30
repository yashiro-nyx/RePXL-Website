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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your RePXL password</title>
</head>
<body style="margin:0;padding:0;background-color:#050303;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050303;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">

          <!-- Logo / Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border:1px solid rgba(245,241,236,0.25);padding:6px 12px;">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#f5f1ec;">RePXL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.12);border-radius:8px;overflow:hidden;">

              <!-- Red accent bar -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color:#c22c2c;height:3px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card body -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:40px 36px 36px;">

                <!-- Camera icon -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:rgba(194,44,44,0.12);border-radius:50%;width:52px;height:52px;text-align:center;vertical-align:middle;">
                          <span style="font-size:22px;line-height:52px;">📷</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#f5f1ec;letter-spacing:-0.3px;">Reset Your Password</h1>
                  </td>
                </tr>

                <!-- Body copy -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#8c8580;text-align:center;max-width:380px;">
                      We received a request to reset the password for your<br />
                      <strong style="color:#f5f1ec;">RePXL</strong> account. Click the button below to choose a new password.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:4px;background-color:#c22c2c;">
                          <a href="${resetUrl}"
                             target="_blank"
                             style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;border-radius:4px;background-color:#c22c2c;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Fallback URL -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <p style="margin:0;font-size:11px;color:#8c8580;text-align:center;">
                      Button not working? Copy and paste this link into your browser:
                    </p>
                    <p style="margin:6px 0 0;font-size:11px;font-family:'Courier New',Courier,monospace;color:#c22c2c;word-break:break-all;text-align:center;">
                      <a href="${resetUrl}" style="color:#c22c2c;text-decoration:underline;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="border-top:1px solid rgba(140,133,128,0.15);padding-top:24px;">

                    <!-- Expiry note -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
                      <tr>
                        <td width="20" valign="top" style="padding-top:1px;">
                          <span style="font-size:13px;">⏱</span>
                        </td>
                        <td style="font-size:13px;color:#8c8580;line-height:1.5;">
                          This link expires in <strong style="color:#f5f1ec;">1 hour</strong>. After that you'll need to request a new one.
                        </td>
                      </tr>
                    </table>

                    <!-- Security note -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top:1px;">
                          <span style="font-size:13px;">🔒</span>
                        </td>
                        <td style="font-size:13px;color:#8c8580;line-height:1.5;">
                          Didn't request a password reset? <strong style="color:#f5f1ec;">You can safely ignore this email</strong> — your password won't change.
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:11px;font-family:'Courier New',Courier,monospace;text-transform:uppercase;letter-spacing:1.5px;color:rgba(140,133,128,0.5);">
                © ${new Date().getFullYear()} RePXL · Vintage Digital Cameras
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:rgba(140,133,128,0.4);">
                Condition-graded · Serial-verified · Trusted by collectors
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text: `RESET YOUR REPXL PASSWORD\n\nWe received a request to reset the password for your RePXL account.\n\nClick the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\n---\n\nIf you didn't request a password reset, you can safely ignore this email. Your password won't be changed.\n\n© ${new Date().getFullYear()} RePXL`,
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
