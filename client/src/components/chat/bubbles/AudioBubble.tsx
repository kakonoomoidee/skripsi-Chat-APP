import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { formatTime } from "@/utils/format";
import { PlayIcon, PauseIcon } from "../../icons";
import { useSessionStore } from "@/store";
import { ReplyBubbleContext } from "./ReplyBubbleContext";

const formatDuration = (time: number) => {
  if (!time || isNaN(time) || time === Infinity) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const generateWaveform = (barsCount: number) => {
  return Array.from({ length: barsCount }, () =>
    Math.floor(Math.random() * (18 - 6 + 1) + 6),
  );
};

export const AudioBubble = ({
  msg,
  audioSrc,
}: {
  msg: any;
  audioSrc: string;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  const setReplyingTo = useSessionStore((state) => state.setReplyingTo);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const waveform = useMemo(() => generateWaveform(32), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setShowMenu(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMenu(false);
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 1;
      setCurrentTime(current);
      setProgress((current / total) * 100);

      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      } else {
        audioRef.current.play();
        animationRef.current = requestAnimationFrame(updateProgress);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTimeout(() => {
        if (audioRef.current && audioRef.current.duration !== Infinity) {
          setDuration(audioRef.current.duration);
        }
      }, 200);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = (Number(e.target.value) / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
      setCurrentTime(newTime);
    }
  };

  const cyclePlaybackRate = () => {
    if (audioRef.current) {
      const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
      audioRef.current.playbackRate = nextRate;
      setPlaybackRate(nextRate);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      const audioEl = audioRef.current;
      const onCanPlay = () => {
        if (audioEl && audioEl.duration !== Infinity)
          setDuration(audioEl.duration);
      };
      audioEl.addEventListener("canplay", onCanPlay);
      return () => audioEl.removeEventListener("canplay", onCanPlay);
    }
  }, []);

  return (
    <div className="relative group flex flex-col">
      <div
        className={`relative flex flex-col max-w-[95%] md:max-w-[80%] min-w-70 px-3.5 py-3 shadow-lg backdrop-blur-md ${
          msg.isMine
            ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 text-white rounded-2xl rounded-tr-sm border border-indigo-400/30"
            : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-700/50"
        }`}
      >
        <div className="absolute top-1 right-1 z-20" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-0.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100 ${
              showMenu ? "opacity-100" : ""
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showMenu && (
            <div
              className={`absolute z-50 top-full mt-1 right-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-32 animate-in fade-in zoom-in-95`}
            >
              <button
                onClick={() => {
                  setReplyingTo({
                    id: msg.id,
                    text: "Voice Message",
                    isMine: msg.isMine,
                    timestamp: msg.timestamp,
                  });
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Reply
              </button>
            </div>
          )}
        </div>

        {msg.replyTo && (
          <ReplyBubbleContext replyTo={msg.replyTo} isMine={msg.isMine} />
        )}

        <audio
          ref={audioRef}
          src={audioSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          className="hidden"
        />

        <div className="flex items-center gap-3 w-full relative z-10 mt-1">
          <button
            onClick={cyclePlaybackRate}
            className={`h-9 w-10 shrink-0 rounded-[10px] flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
              msg.isMine
                ? "bg-indigo-400/30 text-indigo-50 hover:bg-indigo-400/50"
                : "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700/80"
            }`}
          >
            {playbackRate}x
          </button>
          <button
            onClick={toggleAudio}
            className={`w-8 h-8 shrink-0 flex items-center justify-center transition-transform active:scale-90 ${
              msg.isMine ? "text-indigo-100" : "text-zinc-300"
            }`}
          >
            {isPlaying ? (
              <PauseIcon className="w-7 h-7" />
            ) : (
              <PlayIcon className="w-7 h-7 ml-0.5" />
            )}
          </button>

          <div className="flex-1 relative h-6 flex items-center group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-between gap-0.5 pointer-events-none w-full">
              {waveform.map((height, i) => {
                const barPercentage = (i / waveform.length) * 100;
                const isActive = progress >= barPercentage;
                return (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full ${
                      isActive
                        ? msg.isMine
                          ? "bg-white"
                          : "bg-indigo-500"
                        : msg.isMine
                          ? "bg-indigo-300/40"
                          : "bg-zinc-600"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={isNaN(progress) ? 0 : progress}
              onChange={handleSeek}
              className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-10"
              title="Scrub Audio"
            />
            <div
              className={`absolute h-3 w-3 rounded-full shadow-sm pointer-events-none ${
                msg.isMine ? "bg-white" : "bg-indigo-500"
              }`}
              style={{ left: `calc(${progress}% - 6px)`, opacity: 1 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pl-21 mt-0.5">
          <span
            className={`text-[11px] font-medium font-mono tracking-tight ${
              msg.isMine ? "text-indigo-200" : "text-zinc-400"
            }`}
          >
            {formatDuration(currentTime > 0 ? currentTime : duration)}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] font-medium ${
                msg.isMine ? "text-indigo-200" : "text-zinc-400"
              }`}
            >
              {formatTime(msg.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
