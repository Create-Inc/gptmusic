"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import abcjs, { AbcVisualParams, MidiBuffer } from "abcjs";
import { useCompletion } from "ai/react";

import "./music.css";
import clsx from "clsx";

const useAnimationFrame = (callback: (deltaTime: number) => void): void => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [callback]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]); // Empty array ensures effect is only run on mount and unmount
};
type AICompletionConfig = Parameters<typeof useCompletion>[0];
const COMMON_STATIC_CONFIG: Partial<AICompletionConfig> = {
  api: "/api/completion",
  onError: (err: Error) => {
    console.error(err);
  },
};

const genres = ["traditional irish"] as const;
const instruments = [
  "acoustic_grand_piano",
  "bright_acoustic_piano",
  "electric_grand_piano",
  "honkytonk_piano",
  "electric_piano_1",
  "electric_piano_2",
  "harpsichord",
  "clavinet",
  "celesta",
  "glockenspiel",
  "music_box",
  "vibraphone",
  "marimba",
  "xylophone",
  "tubular_bells",
  "dulcimer",
  "drawbar_organ",
  "percussive_organ",
  "rock_organ",
  "church_organ",
  "reed_organ",
  "accordion",
  "harmonica",
  "tango_accordion",
  "acoustic_guitar_nylon",
  "acoustic_guitar_steel",
  "electric_guitar_jazz",
  "electric_guitar_clean",
  "electric_guitar_muted",
  "overdriven_guitar",
  "distortion_guitar",
  "guitar_harmonics",
  "acoustic_bass",
  "electric_bass_finger",
  "electric_bass_pick",
  "fretless_bass",
  "slap_bass_1",
  "slap_bass_2",
  "synth_bass_1",
  "synth_bass_2",
  "violin",
  "viola",
  "cello",
  "contrabass",
  "tremolo_strings",
  "pizzicato_strings",
  "orchestral_harp",
  "timpani",
  "string_ensemble_1",
  "string_ensemble_2",
  "synth_strings_1",
  "synth_strings_2",
  "choir_aahs",
  "voice_oohs",
  "synth_choir",
  "orchestra_hit",
  "trumpet",
  "trombone",
  "tuba",
  "muted_trumpet",
  "french_horn",
  "brass_section",
  "synth_brass_1",
  "synth_brass_2",
  "soprano_sax",
  "alto_sax",
  "tenor_sax",
  "baritone_sax",
  "oboe",
  "english_horn",
  "bassoon",
  "clarinet",
  "piccolo",
  "flute",
  "recorder",
  "pan_flute",
  "blown_bottle",
  "shakuhachi",
  "whistle",
  "ocarina",
  "lead_1_square",
  "lead_2_sawtooth",
  "lead_3_calliope",
  "lead_4_chiff",
  "lead_5_charang",
  "lead_6_voice",
  "lead_7_fifths",
  "lead_8_bass__lead",
  "pad_1_new_age",
  "pad_2_warm",
  "pad_3_polysynth",
  "pad_4_choir",
  "pad_5_bowed",
  "pad_6_metallic",
  "pad_7_halo",
  "pad_8_sweep",
  "fx_1_rain",
  "fx_2_soundtrack",
  "fx_3_crystal",
  "fx_4_atmosphere",
  "fx_5_brightness",
  "fx_6_goblins",
  "fx_7_echoes",
  "fx_8_scifi",
  "sitar",
  "banjo",
  "shamisen",
  "koto",
  "kalimba",
  "bagpipe",
  "fiddle",
  "shanai",
  "tinkle_bell",
  "agogo",
  "steel_drums",
  "woodblock",
  "taiko_drum",
  "melodic_tom",
  "synth_drum",
  "reverse_cymbal",
  "guitar_fret_noise",
  "breath_noise",
  "seashore",
  "bird_tweet",
  "telephone_ring",
  "helicopter",
  "applause",
  "gunshot",
] as const;
const DEFAULT_RENDER_OPTIONS: AbcVisualParams = {
  paddingtop: 0,
  paddingbottom: 0,
  paddingright: 0,
  paddingleft: 0,
  jazzchords: false,
  initialClef: false,
  dragging: false,
  add_classes: true,
  staffwidth: 2000,
};

export default function IndexPage() {
  const musicRef = useRef<HTMLDivElement>(null);
  const currentMusicRef = useRef<HTMLDivElement>(null);
  const prevMusicRef = useRef<HTMLDivElement>(null);
  const viewPortRef = useRef<HTMLDivElement>(null);
  const context = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playedAt, setPlayedAt] = useState<number | null>(null);
  const playingSynth = useRef<{
    buffer: MidiBuffer;
    fn: () => void;
    timeout?: NodeJS.Timeout;
  } | null>(null);
  const [genre, setGenre] = useState<(typeof genres)[number]>(genres[0]);
  const [program, setProgram] = useState<number>(0);
  const [previousMusic, setPreviousMusic] = useState<string>("");
  const [currentMusic, setCurrentMusic] = useState<string>("");
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [time, setTime] = useState(0);
  const updateTime = useCallback(
    (delta: number) => {
      if (typeof playedAt !== "number") {
        return;
      }
      setTime((prev) => prev + delta);
    },
    [playedAt]
  );
  useAnimationFrame(updateTime);
  const updateTranslate = useCallback(() => {
    const currentWidth = currentMusicRef.current?.clientWidth ?? 0;
    const previousWidth = prevMusicRef.current?.clientWidth ?? 0;
    const nextWidth = musicRef.current?.clientWidth ?? 0;
    const currentWidthPct =
      currentWidth / (currentWidth + nextWidth + previousWidth);
    const previousWidthPct =
      previousWidth / (currentWidth + nextWidth + previousWidth);
    const pctOfCurrentDone = time / totalDurationMs;
    const pct =
      50 +
      1 * previousWidthPct * -100 +
      pctOfCurrentDone * currentWidthPct * -100;
    viewPortRef.current?.style.setProperty(
      "transform",
      isNaN(pct) ? "translateX(50%)" : `translateX(${pct}%)`
    );
  }, [time, totalDurationMs]);
  useAnimationFrame(updateTranslate);

  const { complete, isLoading, stop } = useCompletion({
    ...COMMON_STATIC_CONFIG,
  });
  const {
    complete: completeContinuation,
    isLoading: isLoadingContinuation,
    stop: stopContinuation,
  } = useCompletion({
    ...COMMON_STATIC_CONFIG,
  });
  useEffect(() => {
    if (
      !currentMusicRef.current ||
      currentMusic.length === 0 ||
      !prevMusicRef.current
    ) {
      return;
    }

    abcjs.renderAbc(
      prevMusicRef.current,
      previousMusic,
      DEFAULT_RENDER_OPTIONS
    );
    abcjs.renderAbc(
      currentMusicRef.current,
      currentMusic,
      DEFAULT_RENDER_OPTIONS
    );
  }, [currentMusic, previousMusic]);
  const getSynth = async (music: string) => {
    if (!musicRef.current || !context.current) {
      throw new Error("no music ref");
    }
    const synth = new abcjs.synth.CreateSynth();

    const musicLines = `K:C clef=none\n${music
      .split("\n")
      .filter((line) => !!line.trim())
      .filter((line) => !/\w: /.test(line))
      .map(
        (line) =>
          line
            .replaceAll(/\|1/g, "|") // Remove first ending marker
            .replaceAll(/\|[2-9][^\|]*/g, "") // Remove all other endings
            .replaceAll(/\|"[^"]"/g, "") // Remove measure chords
            .replaceAll("|:", "|") // remove repeat starts
            .replaceAll(":|", "|") // remove repeat ends
      )
      .join(" ")}`;
    const rendered = abcjs.renderAbc(
      musicRef.current,
      musicLines,
      DEFAULT_RENDER_OPTIONS
    );

    console.log(`context.current:`, context.current);
    await synth.init({
      options: {
        program,
      },
      audioContext: context.current,
      visualObj: rendered[0],
    });
    const { duration } = await synth.prime();
    return { synth, duration, music: musicLines };
  };
  const isIphone = /(iPhone|iPad)/.test(navigator.userAgent);

  const playMusic = async ({
    synth,
    music,
    duration,
  }: {
    music: string;
    synth: MidiBuffer;
    duration: number;
  }) => {
    synth.start();
    setPlayedAt(time);
    setTime(0);
    setTotalDurationMs(duration * 1000);
    setCurrentMusic(music);
    let next: Awaited<ReturnType<typeof getSynth>> | undefined;
    setTimeout(() => {
      completeContinuation(genre, {
        body: {
          style: genre,
          previousMusic: music,
        },
      }).then((nextMusic) => {
        if (nextMusic) {
          getSynth(nextMusic).then((nextData) => {
            next = nextData;
          });
        }
      });
    }, 0);
    const fn = () => {
      if (next) {
        setPreviousMusic(music);
        playMusic({
          ...next,
        });
      }
    };
    const timeout = setTimeout(fn, duration * 1000);
    playingSynth.current = { buffer: synth, fn, timeout };
    return synth;
  };
  const handlePause = () => {
    playingSynth.current?.buffer.pause();
    if (playingSynth.current?.timeout) {
      clearTimeout(playingSynth.current.timeout);
    }
    setPlayedAt(null);
    setPlaying(false);
  };
  const handlePlay = () => {
    context.current = context.current ?? new AudioContext();
    setPlaying(true);
    if (playingSynth.current) {
      playingSynth.current.buffer.resume();
      const timeout = setTimeout(
        playingSynth.current.fn,
        totalDurationMs - time
      );
      playingSynth.current.timeout = timeout;
      setPlayedAt(time);
    } else {
      complete(genre, {
        body: {
          style: genre,
        },
      }).then((music) => {
        if (music) {
          getSynth(music).then(({ synth, duration, music }) => {
            if (synth) {
              playMusic({
                synth,
                duration,
                music,
              });
            }
          });
        }
      });
    }
  };
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center overflow-x-hidden">
      <section className="container mb-8 flex flex-col items-center justify-center">
        <h1 className="flex text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          MusicGPT
        </h1>
        <h2 className="mb-6 text-lg tracking-tighter">
          unique piano music that <strong>never ends</strong>
        </h2>
        <div className="flex gap-4">
          {isLoading ? (
            <div className="p-4">
              <svg
                height="20"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : playing ? (
            <button
              className="p-4"
              onClick={() => {
                handlePause();
              }}
            >
              <svg
                width="15"
                height="20"
                viewBox="0 0 15 22"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.332 21V1"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1 21V1"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <button
              className="p-4"
              onClick={() => {
                handlePlay();
              }}
            >
              <svg width="20" height="20" viewBox={`0 0 20 20`}>
                <path
                  fill="currentColor"
                  d="M5.135 2.621a.25.25 0 0 0-.385.21v14.337a.25.25 0 0 0 .385.21l11.15-7.168a.25.25 0 0 0 0-.42L5.136 2.62zm-1.885.21c0-1.384 1.532-2.22 2.696-1.471l11.151 7.168a1.75 1.75 0 0 1 0 2.944L5.947 18.64c-1.165.75-2.697-.087-2.697-1.472V2.832z"
                />
              </svg>
            </button>
          )}
        </div>
      </section>
      <section>
        <div className="absolute left-0 z-10 flex h-[200px] w-full">
          <div className="grow-[1] bg-background md:grow-[4] lg:grow-[8]"></div>
          <div className="grow-[8] bg-viewport dark:bg-viewport-dark"></div>
          <div className="grow-[1] bg-background md:grow-[4] lg:grow-[8]"></div>
        </div>
        <div
          className={clsx(
            "flex items-center gap-0 will-change-transform transition-opacity overflow-clip",
            {
              "opacity-20": !playing,
            }
          )}
          ref={viewPortRef}
        >
          <div className="!h-[200px]" ref={prevMusicRef} />
          <div className="!h-[200px]" ref={currentMusicRef} />
          <div className="!h-[200px]" ref={musicRef}></div>
        </div>
      </section>
      <section>
        <h2 className="mb-6 flex h-[40px] flex-col items-center justify-center text-sm tracking-tighter text-muted-foreground">
          {typeof playedAt === "number" && isIphone ? (
            <>
              <p>can{"'"}t hear anything?</p>
              <p>you may have to disable silent mode</p>
            </>
          ) : (
            <></>
          )}
        </h2>
      </section>
      <section className="absolute bottom-10 flex gap-5">
        <a
          href="https://twitter.com/failingbuild"
          target="_blank"
          rel="noreferrer"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.9441 5.92638C17.9568 6.10403 17.9568 6.28173 17.9568 6.45938C17.9568 11.8781 13.8325 18.1218 6.29441 18.1218C3.97207 18.1218 1.81473 17.4492 0 16.2817C0.329961 16.3198 0.647187 16.3325 0.989844 16.3325C2.90605 16.3325 4.67004 15.6853 6.07867 14.5812C4.27664 14.5431 2.76648 13.3629 2.24617 11.7386C2.5 11.7766 2.75379 11.802 3.02031 11.802C3.38832 11.802 3.75637 11.7512 4.09898 11.6624C2.22082 11.2817 0.812148 9.63196 0.812148 7.63958V7.58884C1.35781 7.89341 1.99238 8.08376 2.66492 8.10911C1.56086 7.37306 0.837539 6.11673 0.837539 4.6954C0.837539 3.93399 1.04055 3.23603 1.3959 2.62688C3.41367 5.11419 6.44668 6.73853 9.84766 6.91622C9.78422 6.61165 9.74613 6.29442 9.74613 5.97716C9.74613 3.71825 11.5736 1.87817 13.8451 1.87817C15.0253 1.87817 16.0913 2.3731 16.84 3.17259C17.7664 2.99493 18.6547 2.65228 19.4416 2.18274C19.137 3.13454 18.4898 3.93403 17.6395 4.44161C18.4644 4.35282 19.2639 4.12435 19.9999 3.80712C19.4416 4.61927 18.7436 5.34259 17.9441 5.92638Z"
              fill="currentColor"
            />
          </svg>
        </a>
        <a
          href="https://github.com/Create-Inc/gptmusic"
          target="_blank"
          rel="noreferrer"
        >
          <svg width="20" height="20" viewBox={`0 0 20 20`}>
            <path
              fill="currentColor"
              d="M6.50033 15.8348C2.33366 17.0848 2.33366 13.7515 0.666992 13.3348M12.3337 18.3348V15.1098C12.3649 14.7125 12.3112 14.313 12.1762 13.938C12.0411 13.563 11.8278 13.221 11.5503 12.9348C14.167 12.6432 16.917 11.6515 16.917 7.10149C16.9168 5.93802 16.4692 4.81916 15.667 3.97649C16.0469 2.95858 16.02 1.83345 15.592 0.834828C15.592 0.834828 14.6087 0.543161 12.3337 2.06816C10.4237 1.55051 8.41032 1.55051 6.50033 2.06816C4.22533 0.543161 3.24199 0.834828 3.24199 0.834828C2.81397 1.83345 2.78711 2.95858 3.16699 3.97649C2.35876 4.82541 1.91076 5.95438 1.91699 7.12649C1.91699 11.6432 4.66699 12.6348 7.28366 12.9598C7.00949 13.2431 6.79804 13.581 6.66308 13.9514C6.52812 14.3219 6.47267 14.7165 6.50033 15.1098V18.3348"
            />
          </svg>
        </a>
      </section>
    </div>
  );
}
