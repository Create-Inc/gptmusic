"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import abcjs, {
  AbcVisualParams,
  MidiBuffer,
  SynthObjectController,
} from "abcjs";
import { useCompletion } from "ai/react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import "./music.css";

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

export default function IndexPage() {
  const musicRef = useRef<HTMLDivElement>(null);
  const currentMusicRef = useRef<HTMLDivElement>(null);
  const nextMusicRef = useRef<HTMLDivElement>(null);
  const prevMusicRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const context = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playedAt, setPlayedAt] = useState<number | null>(null);
  const playingSynth = useRef<{
    buffer: MidiBuffer;
    timeout?: NodeJS.Timeout;
  } | null>(null);
  const [genre, setGenre] = useState<(typeof genres)[number]>(genres[0]);
  const [program, setProgram] = useState<number>(0);
  const [previousMusic, setPreviousMusic] = useState<string>("");
  const [currentMusic, setCurrentMusic] = useState<string>("");
  const [nextMusic, setNextMusic] = useState<string>("");
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
      !nextMusicRef.current ||
      !prevMusicRef.current
    ) {
      return;
    }
    const options: AbcVisualParams = {
      paddingtop: 0,
      paddingbottom: 0,
      paddingright: 0,
      paddingleft: 0,
      scrollHorizontal: true,
      oneSvgPerLine: true,
      jazzchords: false,
      initialClef: false,
      dragging: false,
      add_classes: true,
      staffwidth: 1000,
    };
    abcjs.renderAbc(prevMusicRef.current, previousMusic, options);
    abcjs.renderAbc(currentMusicRef.current, currentMusic, options);
    abcjs.renderAbc(nextMusicRef.current, nextMusic, options);
  }, [currentMusic, nextMusic, previousMusic]);
  const getSynth = async (music: string) => {
    if (!musicRef.current || !context.current) {
      throw new Error("no music ref");
    }
    const synth = new abcjs.synth.CreateSynth();
    const controller = new abcjs.synth.SynthController();

    const musicLines = music
      .split("\n")
      .filter((line) => !!line.trim())
      .filter((line) => !/\w:/.test(line))
      .map((line) => line.replaceAll("|:", "|").replaceAll(":|", "|"))
      .join(" ");
    setNextMusic(musicLines);
    const rendered = abcjs.renderAbc(musicRef.current, musicLines, {
      paddingtop: 0,
      paddingbottom: 0,
      paddingright: 0,
      paddingleft: 0,
      scrollHorizontal: true,
      oneSvgPerLine: true,
      jazzchords: false,
      initialClef: false,
      add_classes: true,
    });

    await synth.init({
      options: {
        program,
      },
      audioContext: context.current,
      visualObj: rendered[0],
    });
    const { duration } = await synth.prime();
    return { synth, duration, controller, music: musicLines };
  };
  const playMusic = async ({
    synth,
    music,
    duration,
    controller,
  }: {
    music: string;
    synth: MidiBuffer;
    duration: number;
    controller: SynthObjectController;
  }) => {
    setPlayedAt(time);
    setTime(0);
    setTotalDurationMs(duration * 1000);
    setCurrentMusic(music);
    synth.start();
    controller.play();
    let next: Awaited<ReturnType<typeof getSynth>> | undefined;
    let nextMusic: string | undefined | null;
    setTimeout(async () => {
      nextMusic = await completeContinuation(genre, {
        body: {
          style: genre,
          previousMusic: music,
        },
      });
      if (nextMusic) {
        next = await getSynth(nextMusic);
      }
    }, 0);
    const timeout = setTimeout(() => {
      if (next && nextMusic) {
        setPreviousMusic(music);
        playMusic({
          ...next,
        });
      }
    }, duration * 1000);
    playingSynth.current = { buffer: synth, timeout };
    setTimeout(() => {
      synth.stop();
    }, duration * 1100);
    return synth;
  };
  const pauseMusic = () => {
    playingSynth.current?.buffer.stop();
    if (playingSynth.current?.timeout) {
      clearTimeout(playingSynth.current.timeout);
    }
    setPlayedAt(null);
    setPlaying(false);
    stopContinuation();
    stop();
  };
  const currentWidth = currentMusicRef.current?.clientWidth ?? 0;
  const previousWidth = prevMusicRef.current?.clientWidth ?? 0;
  const nextWidth = nextMusicRef.current?.clientWidth ?? 0;
  const widthPct = currentWidth / (currentWidth + nextWidth + previousWidth);
  const pct = 50 + (time * widthPct * -100) / totalDurationMs;
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <section className="container mb-8 flex flex-col items-center justify-center gap-6">
        <h1 className="flex gap-2 text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          GPT Plays
          <Select
            value={genre}
            onValueChange={(value) => {
              setGenre(value as (typeof genres)[number]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre[0].toUpperCase() + genre.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          on
          <Combobox
            value={instruments[program]}
            onChange={(value) => {
              const index = instruments.indexOf(
                value as (typeof instruments)[number]
              );
              setProgram(index > -1 ? index : 0);
            }}
            options={instruments.map((instrument) => ({
              value: instrument,
              label:
                instrument[0].toUpperCase() +
                instrument.slice(1).replace(/_/g, " "),
            }))}
          />
        </h1>
        <div className="flex gap-4">
          <Button
            onClick={() => {
              pauseMusic();
            }}
            disabled={!playing}
          >
            Pause
          </Button>

          <Button
            onClick={() => {
              setPlaying(true);
              complete(genre, {
                body: {
                  style: genre,
                },
              }).then((music) => {
                if (music) {
                  getSynth(music).then(
                    ({ synth, duration, controller, music }) => {
                      if (synth) {
                        playMusic({
                          synth,
                          duration,
                          music,
                          controller,
                        });
                      }
                    }
                  );
                }
              });
            }}
            disabled={playing}
          >
            Play
          </Button>
        </div>
      </section>
      <section>
        <div ref={cursorRef}></div>
        <div className="!hidden" ref={musicRef}></div>
        <div
          className="absolute left-0 z-10 flex h-[100px] w-full"
          style={{
            background:
              "linear-gradient(to right, black 0%, black 35%, transparent 50%, black 65%, black 100%)",
          }}
        />
        <div
          className="flex items-center gap-0"
          style={{
            transform: `translateX(calc(-${previousWidth}px + ${pct}%))`,
          }}
        >
          <div className="!h-[100px]" ref={prevMusicRef} />
          <div className="!h-[100px]" ref={currentMusicRef} />
          <div className="!h-[100px]" ref={nextMusicRef} />
        </div>
      </section>
    </div>
  );
}
