# Supabase Email Template: Confirm Signup

Supabase Dashboard > Authentication > Email Templates > Confirm signup

---

## Subject (제목 필드에 붙여넣기)

```
나날로그 이메일 인증 / Nanalogue Email Verification
```

---

## Body (본문 필드에 붙여넣기)

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #fefefe;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #A78BFA; font-size: 24px; margin: 0;">🌿 나날로그</h1>
  </div>

  <h2 style="color: #333; font-size: 18px;">나날로그에 오신 것을 환영합니다!</h2>
  <p style="color: #666; line-height: 1.6;">아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
  <p style="margin: 24px 0; text-align: center;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;background-color:#A78BFA;color:white;text-decoration:none;border-radius:24px;font-weight:bold;font-size:14px;">이메일 인증하기</a>
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #f0e6f6;">

  <h2 style="color: #555; font-size: 16px;">Welcome to Nanalogue!</h2>
  <p style="color: #888; line-height: 1.6; font-size: 14px;">Please click the button below to verify your email address.</p>
  <p style="margin: 24px 0; text-align: center;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;background-color:#A78BFA;color:white;text-decoration:none;border-radius:24px;font-weight:bold;font-size:14px;">Verify Email</a>
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #f0e6f6;">

  <p style="color:#aaa;font-size:11px;text-align:center;line-height:1.5;">
    이 메일을 요청하지 않으셨다면 무시해주세요.<br>
    If you didn't request this email, please ignore it.
  </p>
</div>
```
