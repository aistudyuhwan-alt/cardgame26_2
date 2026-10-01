"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  Trophy,
  Clock,
  CheckCircle2,
  Sparkles,
  User,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
  Medal,
} from "lucide-react";

// 과일 정의 (유리 질감에 어울리는 파스텔 글래스 테마)
interface FruitDef {
  id: string;
  name: string;
  emoji: string;
  colorBorder: string;
  colorGlow: string;
}

const FRUITS: FruitDef[] = [
  { id: "apple", name: "사과", emoji: "🍎", colorBorder: "border-red-400/60 dark:border-red-500/50", colorGlow: "shadow-red-500/20" },
  { id: "banana", name: "바나나", emoji: "🍌", colorBorder: "border-amber-400/60 dark:border-amber-500/50", colorGlow: "shadow-amber-500/20" },
  { id: "grape", name: "포도", emoji: "🍇", colorBorder: "border-purple-400/60 dark:border-purple-500/50", colorGlow: "shadow-purple-500/20" },
  { id: "strawberry", name: "딸기", emoji: "🍓", colorBorder: "border-pink-400/60 dark:border-pink-500/50", colorGlow: "shadow-pink-500/20" },
  { id: "orange", name: "오렌지", emoji: "🍊", colorBorder: "border-orange-400/60 dark:border-orange-500/50", colorGlow: "shadow-orange-500/20" },
  { id: "watermelon", name: "수박", emoji: "🍉", colorBorder: "border-emerald-400/60 dark:border-emerald-500/50", colorGlow: "shadow-emerald-500/20" },
  { id: "peach", name: "복숭아", emoji: "🍑", colorBorder: "border-rose-400/60 dark:border-rose-500/50", colorGlow: "shadow-rose-500/20" },
  { id: "pineapple", name: "파인애플", emoji: "🍍", colorBorder: "border-yellow-400/60 dark:border-yellow-500/50", colorGlow: "shadow-yellow-500/20" },
];

interface CardItem {
  instanceId: number;
  fruit: FruitDef;
}

export interface RankRecord {
  name: string;
  score: number;
  finishtime: string;
  timestamp: string;
}

type GameStage = "welcome" | "playing" | "cleared";
type SaveStatus = "idle" | "saving" | "success" | "error";

export default function CardMatchingGame() {
  // 상태 관리
  const [userName, setUserName] = useState<string>("");
  const [stage, setStage] = useState<GameStage>("welcome");
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedFruitIds, setMatchedFruitIds] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 구글 시트 저장 및 랭킹 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [topRanks, setTopRanks] = useState<RankRecord[]>([]);
  const [isLoadingRanks, setIsLoadingRanks] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 다크모드 초기화 및 동기화
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  // 카드 셔플 함수 (Fisher-Yates)
  const initializeCards = () => {
    const deck: CardItem[] = [];
    FRUITS.forEach((fruit) => {
      deck.push({ instanceId: Math.random(), fruit });
      deck.push({ instanceId: Math.random(), fruit });
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  };

  // 게임 시작
  const handleStartGame = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userName.trim()) return;

    setCards(initializeCards());
    setFlippedIndices([]);
    setMatchedFruitIds([]);
    setIsPaused(false);
    setElapsedSeconds(0);
    setMatchCount(0);
    setSaveStatus("idle");
    setSaveMessage("");
    setTopRanks([]);
    setStage("playing");
  };

  // 다시 시작
  const handleRestart = () => {
    setCards(initializeCards());
    setFlippedIndices([]);
    setMatchedFruitIds([]);
    setIsPaused(false);
    setElapsedSeconds(0);
    setMatchCount(0);
    setSaveStatus("idle");
    setSaveMessage("");
    setTopRanks([]);
    setStage("playing");
  };

  // 처음으로
  const handleGoHome = () => {
    setIsPaused(false);
    setElapsedSeconds(0);
    setFlippedIndices([]);
    setMatchedFruitIds([]);
    setSaveStatus("idle");
    setSaveMessage("");
    setTopRanks([]);
    setStage("welcome");
  };

  // 일시정지 토글
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // 타이머
  useEffect(() => {
    if (stage === "playing" && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, isPaused]);

  // 상위 3명 랭킹 가져오기 함수 (GET 요청)
  const fetchTopRankings = async (scriptUrl: string) => {
    setIsLoadingRanks(true);
    try {
      const res = await fetch(`${scriptUrl}?action=getLeaderboard`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && Array.isArray(data.top3)) {
          setTopRanks(data.top3);
        }
      }
    } catch (err) {
      console.warn("랭킹 로드 오류:", err);
    } finally {
      setIsLoadingRanks(false);
    }
  };

  // 구글 시트에 성공 결과 전송 및 랭킹 조회
  const saveResultToGoogleSheet = async (player: string, attempts: number, timeInSec: number) => {
    const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL?.trim();

    if (!scriptUrl) {
      setSaveStatus("error");
      setSaveMessage(".env.local에 NEXT_PUBLIC_GOOGLE_SCRIPT_URL이 설정되지 않았습니다.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("구글 시트에 기록 저장 중...");

    const calculatedScore = Math.max(10, 100 - (attempts - 8) * 3);
    const finishTimeFormatted = formatTime(timeInSec);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formattedTimestamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const payload = {
      timestamp: formattedTimestamp,
      name: player,
      score: calculatedScore,
      finishtime: finishTimeFormatted,
    };

    try {
      // 1. Google Apps Script로 기록 저장
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setSaveStatus("success");
      setSaveMessage("구글 시트에 기록이 성공적으로 저장되었습니다!");

      // 2. 저장 후 바로 구글 시트의 최신 TOP 3 랭킹 불러오기 (1초 버퍼 대기)
      setTimeout(() => {
        fetchTopRankings(scriptUrl);
      }, 1000);
    } catch (error) {
      console.error("구글 시트 저장 오류:", error);
      setSaveStatus("error");
      setSaveMessage("구글 시트 전송 중 오류가 발생했습니다.");
    }
  };

  // 클리어 체크 (게임 성공 시에만 데이터 저장 & 랭킹 조회)
  useEffect(() => {
    if (stage === "playing" && matchedFruitIds.length === FRUITS.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setStage("cleared");

      saveResultToGoogleSheet(userName, matchCount, elapsedSeconds);
    }
  }, [matchedFruitIds, stage]);

  // 카드 클릭 처리
  const handleCardClick = (index: number) => {
    if (isPaused) return;
    if (flippedIndices.length >= 2) return;
    if (flippedIndices.includes(index)) return;

    const clickedCard = cards[index];
    if (matchedFruitIds.includes(clickedCard.fruit.id)) return;

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      setMatchCount((prev) => prev + 1);

      if (firstCard.fruit.id === secondCard.fruit.id) {
        setTimeout(() => {
          setMatchedFruitIds((prev) => [...prev, firstCard.fruit.id]);
          setFlippedIndices([]);
        }, 450);
      } else {
        setTimeout(() => {
          setFlippedIndices([]);
        }, 850);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-500 overflow-x-hidden">
      {/* 부드러운 배경 블러 오브 (Glassmorphism 백그라운드) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-200/50 dark:bg-sky-900/20 rounded-full blur-3xl opacity-70 animate-pulse duration-1000" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-amber-100/60 dark:bg-amber-900/15 rounded-full blur-3xl opacity-70" />
      </div>

      {/* 헤더 & 다크모드 토글 버튼 */}
      <header className="w-full max-w-4xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center text-lg">
            🍓
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            Card Matching Game
          </span>
        </div>

        {/* 테마 토글 버튼 */}
        <button
          onClick={toggleDarkMode}
          aria-label="테마 전환"
          className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 w-full max-w-lg mx-auto">
        {/* 상단 타이틀 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
            카드 맞추기 게임
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            유리 카드 속 숨겨진 과일 짝을 맞춰보세요!
          </p>
        </div>

        {/* 1단계: 플레이어 이름 입력 화면 */}
        {stage === "welcome" && (
          <div className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-3xl flex items-center justify-center shadow-inner">
              <span className="text-3xl sm:text-4xl animate-bounce">✨</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              플레이어 이름을 입력해주세요
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
              게임을 성공하면 구글 시트에 기록되고 TOP 3 명예의 전당에 등극합니다!
            </p>

            <form onSubmit={handleStartGame} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  maxLength={12}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/70 dark:border-slate-700/60 rounded-2xl text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-500 transition-all text-sm sm:text-base shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!userName.trim()}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl font-bold text-white bg-slate-900 dark:bg-sky-500 hover:bg-slate-800 dark:hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                게임 시작
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-around text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">🎲 4x4 그리드</span>
              <span>•</span>
              <span className="flex items-center gap-1">⏱️ 종료시간 측정</span>
              <span>•</span>
              <span className="flex items-center gap-1">🏆 TOP 3 랭킹</span>
            </div>
          </div>
        )}

        {/* 2단계: 4x4 게임 진행 화면 */}
        {stage === "playing" && (
          <div className="w-full flex flex-col items-center">
            {/* 상태 바 (플레이어, 매칭수, 시간) */}
            <div className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-sm mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold block leading-tight">
                    플레이어
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px] sm:max-w-none block">
                    {userName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-5">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block leading-tight">
                    진행도
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 font-mono">
                    {matchedFruitIds.length} / {FRUITS.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-800/70 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/60 dark:border-white/10 shadow-inner">
                  <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* 카드 보드 (Glassmorphism & 반응형 정방형 4x4) */}
            <div className="relative w-full aspect-square max-w-[420px] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-3 sm:p-4 rounded-3xl border border-white/60 dark:border-white/10 shadow-xl shadow-slate-200/40 dark:shadow-black/40">
              {/* 일시 정지 오버레이 */}
              {isPaused && (
                <div className="absolute inset-0 z-30 bg-slate-900/50 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-white gap-2 p-6 animate-in fade-in duration-200">
                  <Pause className="w-10 h-10 text-amber-300 animate-pulse" />
                  <h3 className="text-lg font-bold">게임 일시 정지</h3>
                  <p className="text-xs text-slate-200 text-center mb-2">
                    게임을 다시 이어가려면 아래 버튼을 누르세요.
                  </p>
                  <button
                    onClick={handleTogglePause}
                    className="px-5 py-2.5 bg-white text-slate-900 text-xs sm:text-sm font-bold rounded-xl shadow-md hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    계속하기
                  </button>
                </div>
              )}

              {/* 4x4 그리드 */}
              <div className="grid grid-cols-4 grid-rows-4 gap-2 sm:gap-3 w-full h-full">
                {cards.map((card, idx) => {
                  const isFlipped = flippedIndices.includes(idx);
                  const isMatched = matchedFruitIds.includes(card.fruit.id);
                  const showFront = isFlipped || isMatched;

                  return (
                    <button
                      key={`${card.fruit.id}-${idx}`}
                      type="button"
                      onClick={() => handleCardClick(idx)}
                      disabled={isPaused || showFront}
                      aria-label={`카드 ${idx + 1}`}
                      className={`relative w-full h-full rounded-2xl cursor-pointer select-none transition-all duration-300 active:scale-95 focus:outline-none ${
                        isMatched ? "cursor-default opacity-85" : "hover:-translate-y-0.5"
                      }`}
                    >
                      {/* 유리 카드 표면 */}
                      <div
                        className={`w-full h-full rounded-2xl flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-xl border ${
                          showFront
                            ? `bg-white/80 dark:bg-slate-800/85 ${card.fruit.colorBorder} shadow-lg ${card.fruit.colorGlow}`
                            : "bg-white/50 dark:bg-slate-800/40 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-slate-800/60 shadow-sm"
                        }`}
                      >
                        {showFront ? (
                          <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200">
                            <span className="text-2xl sm:text-3xl filter drop-shadow-sm select-none">
                              {card.fruit.emoji}
                            </span>
                            <span className="text-[9px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1">
                              {card.fruit.name}
                            </span>
                            {isMatched && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 absolute top-1.5 right-1.5" />
                            )}
                          </div>
                        ) : (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/40 dark:bg-white/10 flex items-center justify-center border border-white/50 dark:border-white/10 text-slate-400 dark:text-slate-500 font-bold text-xs select-none">
                            ?
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 하단 컨트롤 버튼 바 */}
            <div className="w-full mt-4 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={handleTogglePause}
                className="flex-1 py-2.5 sm:py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? "계속하기" : "잠깐 멈춤"}
              </button>

              <button
                onClick={handleRestart}
                className="flex-1 py-2.5 sm:py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                다시 시작
              </button>

              <button
                onClick={handleGoHome}
                className="py-2.5 sm:py-3 px-3.5 rounded-2xl font-semibold flex items-center justify-center gap-1.5 text-xs sm:text-sm bg-slate-200/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                처음으로
              </button>
            </div>
          </div>
        )}

        {/* 3단계: 완료 축하 및 TOP 3 랭킹 모달 */}
        {stage === "cleared" && (
          <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/70 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/30">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>

            <span className="inline-block bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-full mb-1.5">
              GAME CLEAR
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-0.5">
              축하합니다, {userName} 님!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              모든 과일 카드의 짝을 맞추셨습니다!
            </p>

            {/* 나의 기록 통계 박스 */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-2xl p-3.5 mb-3.5 grid grid-cols-2 gap-3 shadow-inner">
              <div className="flex flex-col items-center border-r border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] text-slate-400 font-semibold mb-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 내 종료 시간
                </span>
                <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-slate-400 font-semibold mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 매칭 시도
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-200 font-mono">
                  {matchCount} 회
                </span>
              </div>
            </div>

            {/* 명예의 전당 TOP 3 랭킹 리스트 (종료시간 오름차순) */}
            <div className="w-full bg-slate-50/80 dark:bg-slate-950/50 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800/80 mb-3.5 text-left">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Medal className="w-4 h-4 text-amber-500" />
                  <span>명예의 전당 (종료시간 TOP 3)</span>
                </div>
                <span className="text-[10px] text-slate-400">오름차순 순위</span>
              </div>

              {isLoadingRanks ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span>실시간 순위 집계 중...</span>
                </div>
              ) : topRanks.length > 0 ? (
                <div className="space-y-1.5">
                  {topRanks.map((rank, index) => {
                    const badgeColors = [
                      "bg-amber-400 text-slate-900 ring-2 ring-amber-300", // 1위 금
                      "bg-slate-300 text-slate-900 ring-2 ring-slate-200", // 2위 은
                      "bg-amber-700 text-white ring-2 ring-amber-600/40",   // 3위 동
                    ];
                    return (
                      <div
                        key={`${rank.name}-${index}`}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-white/60 dark:border-white/5 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                              badgeColors[index] || "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                            {rank.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{rank.finishtime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-3 text-xs text-slate-400">
                  아직 기록된 랭킹 데이터가 없습니다.
                </p>
              )}
            </div>

            {/* 구글 시트 저장 상태 표시 */}
            <div className="mb-4 px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{saveMessage}</span>
                </div>
              )}
              {saveStatus === "success" && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{saveMessage}</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{saveMessage}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleRestart}
                className="w-full py-3 px-6 rounded-2xl font-bold text-white bg-slate-900 dark:bg-sky-500 hover:bg-slate-800 dark:hover:bg-sky-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                다시 플레이
              </button>
              <button
                onClick={handleGoHome}
                className="w-full py-2.5 px-6 rounded-2xl font-medium text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm border border-white/60 dark:border-white/10"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                처음으로 가기
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 하단 푸터 (Copyright) */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        <p>Copyright INU 카드 맞추기 게임 by 본인이름</p>
      </footer>
    </div>
  );
}
