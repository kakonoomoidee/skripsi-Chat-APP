import React, { useRef, useState, useEffect } from "react";
import { formatTime } from "@/utils/format";
import { PlayIcon, PauseIcon } from "../../icons";

const formatDuration = (time: number) => {
  if (!time || isNaN(time) || time === Infinity) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

// Generate random heights for the static waveform bars
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  // Memoize waveform so it doesn't change on re-renders
  const waveform = useRef<number[]>([]);
  if (waveform.current.length === 0) {
    waveform.current = generateWaveform(32); // Increased bars for denser look
  }

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 1;
      setCurrentTime(current);
      setProgress((current / total) * 100);
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
      const onCanPlay = () => {
        if (audioRef.current && audioRef.current.duration !== Infinity) {
          setDuration(audioRef.current.duration);
        }
      };
      audioRef.current.addEventListener("canplay", onCanPlay);
      return () => audioRef.current?.removeEventListener("canplay", onCanPlay);
    }
  }, []);

  return (
    // REFACTORED: Colors back to app theme (Indigo/Zinc)
    <div
      className={`relative flex flex-col max-w-[95%] md:max-w-[80%] min-w-70 px-3.5 py-3 shadow-lg backdrop-blur-md ${
        msg.isMine
          ? "bg-linear-to-br from-indigo-500/90 to-indigo-600/90 text-white rounded-2xl rounded-tr-sm border border-indigo-400/30"
          : "bg-linear-to-br from-zinc-800/95 to-zinc-900/95 text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-700/50"
      }`}
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      <div className="flex items-center gap-3 w-full relative z-10">
        {/* Speed Button - Themed */}
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

        {/* Play/Pause Button - Themed */}
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

        {/* Waveform & Scrubbing Container */}
        <div className="flex-1 relative h-6 flex items-center group cursor-pointer">
          {/* Static Waveform Bars */}
          <div className="absolute inset-0 flex items-center justify-between gap-0.5 pointer-events-none w-full">
            {waveform.current.map((height, i) => {
              const barPercentage = (i / waveform.current.length) * 100;
              const isActive = progress >= barPercentage;

              return (
                // REFACTORED: Removed 'transition-colors duration-75' to fix stuttering
                // REFACTORED: Colors updated to theme (White/Indigo)
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

          {/* Invisible Range Slider for Scrubbing */}
          <input
            type="range"
            min="0"
            max="100"
            value={isNaN(progress) ? 0 : progress}
            onChange={handleSeek}
            className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-10"
            title="Scrub Audio"
          />

          {/* Custom Slider Thumb Dot indicator */}
          {/* REFACTORED: Removed 'transition-all duration-75' to fix stuttering */}
          <div
            className={`absolute h-3 w-3 rounded-full shadow-sm pointer-events-none ${
              msg.isMine ? "bg-white" : "bg-indigo-500"
            }`}
            style={{
              left: `calc(${progress}% - 6px)`,
              opacity: 1,
            }}
          />
        </div>
      </div>

      {/* Timers below slider - Themed Colors */}
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
  );
};
