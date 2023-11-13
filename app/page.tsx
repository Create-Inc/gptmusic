"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import abcjs, { AbcVisualParams, MidiBuffer } from "abcjs";
import { useCompletion } from "ai/react";

import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    context.current = new AudioContext();
  }, []);
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
          a piano song that never ends
        </h2>
        <div className="flex gap-4">
          <Button
            onClick={() => {
              handlePause();
            }}
            disabled={!playing}
          >
            Pause
          </Button>

          <Button
            onClick={() => {
              handlePlay();
            }}
            disabled={playing}
          >
            Play
          </Button>
        </div>
      </section>
      <section>
        <div className="absolute left-0 z-10 flex h-[200px] w-full">
          <div className="grow-0 bg-background md:grow lg:grow-[2]"></div>
          <div className="grow-[2] bg-viewport dark:bg-viewport-dark"></div>
          <div className="grow-0 bg-background md:grow lg:grow-[2]"></div>
        </div>
        <div
          className={clsx(
            "flex items-center gap-0 will-change-transform transition-opacity overflow-clip",
            {
              "opacity-10": !playing,
            }
          )}
          ref={viewPortRef}
        >
          <div className="!h-[200px]" ref={prevMusicRef} />
          <div className="!h-[200px]" ref={currentMusicRef} />
          <div className="!h-[200px]" ref={musicRef}></div>
        </div>
      </section>
    </div>
  );
}
