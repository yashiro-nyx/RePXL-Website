/**
 * Shared Nodemailer transporter — reused by all email features:
 * - Forgot Password
 * - Newsletter subscribe
 * - Contact Us
 *
 * Credentials are read server-side only from GMAIL_USER / GMAIL_APP_PASSWORD.
 * Never import this from client components.
 */

import nodemailer from 'nodemailer'

export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export function isMailerConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD &&
    process.env.GMAIL_APP_PASSWORD !== 'your-gmail-app-password'
  )
}
