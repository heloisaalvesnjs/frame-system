import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.EMAIL_FROM ?? 'Frame System <noreply@framesystem.com.br>'
const APP_URL = process.env.APP_URL   ?? 'https://app.framesystem.com.br'

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/redefinir-senha?token=${token}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Redefinição de senha — Frame System',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0B0C0E;font-family:Inter,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:0 16px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#00C27C;border-radius:12px;margin-bottom:12px;">
        <span style="color:#fff;font-size:22px;font-weight:700;">F</span>
      </div>
      <p style="margin:0;color:#6B7280;font-size:13px;">Frame System</p>
    </div>

    <!-- Card -->
    <div style="background:#141618;border:1px solid #1E2124;border-radius:20px;padding:36px 32px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F5F0;">Redefinir sua senha</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
        Olá, ${name}! Recebemos uma solicitação para redefinir a senha da sua conta no Frame System.
      </p>

      <a href="${link}" style="display:block;text-align:center;background:#00C27C;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:12px;padding:14px 24px;">
        Redefinir senha
      </a>

      <p style="margin:24px 0 0;font-size:12px;color:#374151;text-align:center;line-height:1.6;">
        Este link expira em <strong style="color:#6B7280;">1 hora</strong>.<br>
        Se você não solicitou isso, pode ignorar este e-mail.
      </p>
    </div>

    <p style="text-align:center;margin-top:24px;font-size:11px;color:#374151;">
      © ${new Date().getFullYear()} Frame System — Todos os direitos reservados
    </p>
  </div>
</body>
</html>`,
  })
}
