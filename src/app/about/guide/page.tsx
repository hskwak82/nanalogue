import { Navigation } from '@/components/Navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function GuidePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <Navigation user={user ? { email: user.email, name: profile?.name } : null} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link href="/about" className="text-sm text-pastel-purple hover:underline mb-4 inline-block">
            ← 소개 페이지로 돌아가기
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-pastel-purple-dark mb-4">
            나날로그 상세 사용 가이드
          </h1>
          <p className="text-gray-600">
            처음 사용하시는 분들을 위한 단계별 안내입니다
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 p-6 bg-white/70 rounded-2xl border border-pastel-pink/30">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">목차</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="#signup" className="text-pastel-purple hover:underline">1. 회원가입</a></li>
            <li><a href="#email-verify" className="text-pastel-purple hover:underline">2. 이메일 인증</a></li>
            <li><a href="#login" className="text-pastel-purple hover:underline">3. 로그인</a></li>
            <li><a href="#dashboard" className="text-pastel-purple hover:underline">4. 대시보드 (홈 화면)</a></li>
            <li><a href="#session" className="text-pastel-purple hover:underline">5. 일기 기록하기</a></li>
            <li><a href="#voice-mode" className="text-pastel-purple hover:underline">6. 음성 대화 모드</a></li>
            <li><a href="#text-mode" className="text-pastel-purple hover:underline">7. 텍스트 대화 모드</a></li>
            <li><a href="#diary" className="text-pastel-purple hover:underline">8. 일기 보기</a></li>
            <li><a href="#settings" className="text-pastel-purple hover:underline">9. 설정</a></li>
            <li><a href="#tips" className="text-pastel-purple hover:underline">10. 유용한 팁</a></li>
          </ul>
        </nav>

        {/* Content Sections */}
        <div className="space-y-12">

          {/* 1. 회원가입 */}
          <section id="signup" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                회원가입
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>나날로그를 시작하려면 먼저 계정을 만들어야 합니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">회원가입 방법</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>홈페이지 우측 상단의 <strong>&quot;시작하기&quot;</strong> 버튼을 클릭합니다.</li>
                    <li>이메일 주소를 입력합니다.</li>
                    <li>비밀번호를 설정합니다. (최소 6자 이상)</li>
                    <li><strong>&quot;회원가입&quot;</strong> 버튼을 클릭합니다.</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>참고:</strong> 비밀번호는 최소 6자 이상이어야 하며, 영문과 숫자를 조합하는 것을 권장합니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 이메일 인증 */}
          <section id="email-verify" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                이메일 인증
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>회원가입 후 입력한 이메일로 인증 메일이 발송됩니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">인증 절차</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>가입 시 입력한 이메일의 받은편지함을 확인합니다.</li>
                    <li><strong>&quot;나날로그&quot;</strong>에서 보낸 인증 메일을 찾습니다.</li>
                    <li>메일 본문의 <strong>&quot;Confirm your mail&quot;</strong> 링크를 클릭합니다.</li>
                    <li>인증이 완료되면 로그인할 수 있습니다.</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>메일이 안 오나요?</strong> 스팸 메일함을 확인해보세요. 그래도 없다면 회원가입을 다시 시도해주세요.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 로그인 */}
          <section id="login" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                로그인
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>이메일 인증이 완료되면 로그인할 수 있습니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">로그인 방법</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>홈페이지 우측 상단의 <strong>&quot;로그인&quot;</strong>을 클릭합니다.</li>
                    <li>가입 시 사용한 이메일과 비밀번호를 입력합니다.</li>
                    <li><strong>&quot;로그인&quot;</strong> 버튼을 클릭합니다.</li>
                    <li>대시보드로 이동됩니다.</li>
                  </ol>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800">
                    <strong>Google 로그인:</strong> Google 계정으로도 간편하게 로그인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 대시보드 */}
          <section id="dashboard" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                대시보드 (홈 화면)
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>로그인 후 처음 보게 되는 메인 화면입니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">대시보드 구성</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">📅</span>
                      <div>
                        <strong>캘린더:</strong> 일기를 작성한 날짜가 표시됩니다. 날짜를 클릭하면 해당 일기를 볼 수 있습니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">📊</span>
                      <div>
                        <strong>통계:</strong> 연속 기록일, 이번 달 기록 수 등을 확인할 수 있습니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">💬</span>
                      <div>
                        <strong>오늘의 한마디:</strong> AI가 생성한 오늘의 격려 메시지를 볼 수 있습니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">📢</span>
                      <div>
                        <strong>공지사항:</strong> 서비스 업데이트 및 공지를 확인할 수 있습니다.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 5. 일기 기록하기 */}
          <section id="session" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                일기 기록하기
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>나날로그의 핵심 기능입니다. AI와 대화하며 하루를 기록합니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">기록 시작하기</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>하단 메뉴의 <strong>&quot;기록&quot;</strong> 버튼을 탭합니다.</li>
                    <li>오늘의 사진을 찍거나 선택할 수 있습니다. (선택사항)</li>
                    <li>AI가 먼저 인사를 건네며 대화가 시작됩니다.</li>
                    <li>음성 또는 텍스트로 하루에 대해 이야기합니다.</li>
                    <li>대화가 끝나면 AI가 일기를 정리해줍니다.</li>
                  </ol>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">사진 기능</h3>
                  <p className="text-sm text-purple-700">
                    오늘의 사진을 추가하면 AI가 사진을 보고 그에 맞는 질문을 해줍니다.
                    예를 들어 음식 사진을 올리면 &quot;맛있어 보이네요! 어디서 드셨어요?&quot;와 같이 자연스러운 대화가 시작됩니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. 음성 대화 모드 */}
          <section id="voice-mode" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
                음성 대화 모드
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>마이크를 사용해 AI와 실시간으로 대화합니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">음성 대화 사용법</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>기록 화면에서 <strong>마이크 버튼</strong>을 탭합니다.</li>
                    <li>마이크 권한을 허용합니다. (처음 한 번만)</li>
                    <li>자연스럽게 말하면 AI가 듣고 응답합니다.</li>
                    <li>AI의 응답은 음성으로 들려줍니다.</li>
                    <li>대화가 끝나면 종료 버튼을 탭합니다.</li>
                  </ol>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <h3 className="font-semibold text-indigo-800 mb-2">실시간 대화 모드</h3>
                  <p className="text-sm text-indigo-700 mb-2">
                    나날로그는 <strong>실시간 AI 음성 대화</strong>를 지원합니다.
                    전화 통화처럼 자연스럽게 대화할 수 있습니다.
                  </p>
                  <ul className="text-sm text-indigo-700 space-y-1">
                    <li>• AI 음성은 설정에서 변경할 수 있습니다.</li>
                    <li>• Alloy, Coral, Sage 등 다양한 음성 중 선택 가능</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 7. 텍스트 대화 모드 */}
          <section id="text-mode" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
                텍스트 대화 모드
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>타이핑으로 조용히 대화할 수 있습니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">텍스트 대화 사용법</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>기록 화면 하단의 <strong>입력창</strong>에 텍스트를 입력합니다.</li>
                    <li>전송 버튼을 탭하거나 Enter를 누릅니다.</li>
                    <li>AI의 응답이 텍스트로 표시됩니다.</li>
                    <li>원하면 AI 응답의 스피커 버튼을 눌러 음성으로 들을 수 있습니다.</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    <strong>언제 사용하면 좋을까요?</strong><br/>
                    조용한 환경에서, 출퇴근 대중교통에서, 또는 음성 대화가 불편할 때 텍스트 모드를 사용하세요.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 8. 일기 보기 */}
          <section id="diary" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
                일기 보기
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>작성한 일기를 다시 읽어볼 수 있습니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">일기 확인 방법</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">1.</span>
                      <div>
                        <strong>캘린더에서:</strong> 대시보드의 캘린더에서 초록색 점이 있는 날짜를 클릭합니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">2.</span>
                      <div>
                        <strong>일기 메뉴에서:</strong> 하단의 &quot;일기&quot; 버튼을 탭하면 일기 목록을 볼 수 있습니다.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                  <h3 className="font-semibold text-pink-800 mb-2">일기장 꾸미기</h3>
                  <p className="text-sm text-pink-700">
                    일기 화면에서 글꼴 크기, 배경색 등을 조절할 수 있습니다.
                    나만의 스타일로 일기장을 꾸며보세요.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 9. 설정 */}
          <section id="settings" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">9</span>
                설정
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>나날로그를 나에게 맞게 설정할 수 있습니다.</p>

                <div className="bg-pastel-cream/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">설정 항목</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">👤</span>
                      <div>
                        <strong>프로필:</strong> 이름을 설정할 수 있습니다. 설정한 이름은 상단에 표시됩니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">🎙️</span>
                      <div>
                        <strong>음성 설정:</strong>
                        <ul className="mt-1 ml-4 space-y-1 text-gray-600">
                          <li>• 대화 입력 방식 (음성/텍스트) 선택</li>
                          <li>• AI 음성 선택 (Alloy, Coral, Sage 등)</li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">📅</span>
                      <div>
                        <strong>캘린더 연동:</strong> Google 캘린더를 연동하면 일정 기반 회고가 가능합니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pastel-purple">🚪</span>
                      <div>
                        <strong>로그아웃:</strong> 계정에서 로그아웃합니다.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 10. 유용한 팁 */}
          <section id="tips" className="scroll-mt-24">
            <div className="bg-white/70 rounded-2xl p-6 sm:p-8 border border-pastel-pink/30">
              <h2 className="text-xl font-bold text-pastel-purple-dark mb-4 flex items-center gap-2">
                <span className="bg-pastel-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">10</span>
                유용한 팁
              </h2>
              <div className="space-y-4 text-gray-700">

                <div className="bg-gradient-to-r from-pastel-purple/10 to-pastel-pink/10 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">더 나은 일기를 위한 팁</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span>💡</span>
                      <div>
                        <strong>매일 같은 시간에:</strong> 잠자리에 들기 전이나 저녁 식사 후 등
                        일정한 시간에 기록하면 습관이 됩니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💡</span>
                      <div>
                        <strong>사진 활용하기:</strong> 오늘 찍은 사진을 추가하면
                        더 풍성한 대화와 기록이 가능합니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💡</span>
                      <div>
                        <strong>솔직하게 말하기:</strong> AI는 판단하지 않습니다.
                        오늘 기분이 어땠는지 솔직하게 이야기해보세요.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💡</span>
                      <div>
                        <strong>짧아도 괜찮아요:</strong> 5분이면 충분합니다.
                        길게 쓸 필요 없이 오늘 있었던 일 한두 가지만 이야기해도 됩니다.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💡</span>
                      <div>
                        <strong>연속 기록 도전:</strong> 대시보드에서 연속 기록일을 확인하며
                        동기부여를 받아보세요.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Link
            href={user ? '/session?entry=true' : '/signup'}
            className="inline-block bg-pastel-purple text-white font-semibold px-8 py-3 rounded-full shadow-md hover:bg-pastel-purple-dark transition-all"
          >
            {user ? '지금 일기 쓰러 가기' : '나날로그 시작하기'}
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-pastel-pink/30 py-8 mt-12">
          <div className="text-center text-sm text-gray-400">
            &copy; 2025 나날로그. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  )
}
