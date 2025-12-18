
# Vercel 환경변수와 OpenAI WebRTC Realtime 연동 가이드

## 1. 결론 요약

- `OPENAI_API_KEY` 이름 자체는 Vercel에서 제한 없음
- 문제의 원인은 브라우저(WebRTC)에서 환경변수를 직접 사용하려는 구조
- WebRTC 실시간 대화에서는 서버에서 Ephemeral Key(임시 키)를 발급해야 정상 동작
- `NEXT_PUBLIC_OPENAI_API_KEY` 사용은 보안상 절대 금지

## 2. Vercel 환경변수 이름 규칙

### 사용 가능
- 영문 대/소문자 (A–Z, a–z)
- 숫자 (0–9)
- 언더스코어 (`_`)

### 사용 불가
- 공백
- 하이픈 (`-`)
- 특수문자 (`.`, `@`, `$`, `!` 등)

### 예시
```env
OPENAI_API_KEY=sk-xxxxxxxx
DATABASE_URL=postgres://...
```

## 3. WebRTC에서 문제가 발생하는 이유

- WebRTC 코드는 브라우저에서 실행
- 브라우저에서는 `process.env.*` 접근 불가
- Vercel 문제가 아니라 Next.js / 보안 모델의 정상 동작

## 4. WebRTC Realtime 연동 정석 구조

```
Browser (WebRTC)
   ↓
Vercel API Route / Edge Function
   ↓ (OPENAI_API_KEY 사용)
OpenAI Realtime API
   ↓
Ephemeral Key 발급
   ↓
Browser WebRTC 연결
```

## 5. 서버: Ephemeral Key 발급 예제

```ts
export async function POST() {
  const response = await fetch(
    "https://api.openai.com/v1/realtime/sessions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
      }),
    }
  );

  return Response.json(await response.json());
}
```

## 6. 브라우저(WebRTC): Ephemeral Key 사용

```ts
const tokenResp = await fetch("/api/openai/session", {
  method: "POST",
});

const session = await tokenResp.json();

const pc = new RTCPeerConnection();

openai.connect({
  apiKey: session.client_secret.value,
});
```

## 7. 요약

문제는 Vercel 환경변수 이름이 아니라  
WebRTC(브라우저)에서 API 키를 직접 쓰려는 구조입니다.
