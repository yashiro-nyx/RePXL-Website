import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import { storeResetToken } from '@/lib/resetTokens'

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
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reset your RePXL password</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:48px 20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">

        <!-- WORDMARK -->
        <tr>
          <td align="center" style="padding-bottom:40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid rgba(245,241,236,0.2);padding:8px 18px;">
                  <span style="font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#f5f1ec;line-height:1;">RePXL</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CARD -->
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.15);border-top:3px solid #c22c2c;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:48px 44px 44px;">

                  <!-- HEADING -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:16px;">
                        <h1 style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:700;color:#f5f1ec;letter-spacing:-0.4px;line-height:1.2;">Reset Your Password</h1>
                      </td>
                    </tr>
                  </table>

                  <!-- BODY COPY -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:40px;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#8c8580;text-align:center;max-width:420px;">
                          We received a request to reset the password for your <strong style="color:#f5f1ec;font-weight:600;">RePXL</strong> account. Click the button below to choose a new password.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- BUTTON -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:36px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td bgcolor="#c22c2c" style="border-radius:4px;">
                              <!--[if mso]><i style="letter-spacing:24px;mso-font-width:-100%;mso-text-raise:28pt">&nbsp;</i><![endif]-->
                              <a href="${resetUrl}" target="_blank"
                                 style="display:inline-block;padding:15px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.4px;color:#ffffff;background-color:#c22c2c;text-decoration:none;border-radius:4px;">
                                Reset Password
                              </a>
                              <!--[if mso]><i style="letter-spacing:24px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- FALLBACK LINK -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding-bottom:40px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="border:1px solid rgba(140,133,128,0.12);background-color:rgba(0,0,0,0.2);padding:16px 18px;">
                              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#8c8580;line-height:1.5;">
                                Having trouble with the button? Copy and paste the link below into your browser:
                              </p>
                              <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(245,241,236,0.5);word-break:break-all;line-height:1.6;">
                                ${resetUrl}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- DIVIDER -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="border-top:1px solid rgba(140,133,128,0.12);padding-top:32px;">

                        <!-- EXPIRY NOTE -->
                        <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8c8580;">
                          <strong style="color:rgba(245,241,236,0.75);font-weight:600;display:block;margin-bottom:3px;">Link expires in 1 hour.</strong>
                          After that, you will need to request a new password reset.
                        </p>

                        <!-- SECURITY NOTE -->
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8c8580;">
                          <strong style="color:rgba(245,241,236,0.75);font-weight:600;display:block;margin-bottom:3px;">Didn't request this?</strong>
                          You can safely ignore this email. Your password will not be changed.
                        </p>

                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding-top:36px;padding-bottom:8px;">
            <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(140,133,128,0.5);">
              &copy; ${new Date().getFullYear()} RePXL
            </p>
            <p style="margin:0 0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:rgba(140,133,128,0.4);">
              Vintage Digital Cameras
            </p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(140,133,128,0.3);">
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
        text: `RESET YOUR REPXL PASSWORD\n\nWe received a request to reset the password for your RePXL account.\n\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email. Your password will not be changed.\n\n---\n\n© ${new Date().getFullYear()} RePXL`,
      })
      console.log('[forgot-password] Email sent:', result.messageId)
    } else {
      console.log('\n[RePXL Password Reset — DEV MODE]')
      console.log(`Email : ${email}`)
      console.log(`URL   : ${resetUrl}`)
      console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send real emails.\n')
    }

    return NextResponse.json(SAFE_RESPONSE)
  } catch (err) {
    console.error('[forgot-password] Error:', err)
    return NextResponse.json(SAFE_RESPONSE)
  }
}
