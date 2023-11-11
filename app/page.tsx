"use client"

import { useEffect, useRef, useState } from "react"
import abcjs, { MidiBuffer } from "abcjs"
import { useCompletion } from "ai/react"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AICompletionConfig = Parameters<typeof useCompletion>[0]
const COMMON_STATIC_CONFIG: Partial<AICompletionConfig> = {
  api: "/api/completion",
  onError: (err: Error) => {
    console.error(err)
  },
}

const genres = ["jazz", "classical", "pop"] as const
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
] as const

export default function IndexPage() {
  const musicRef = useRef<HTMLDivElement>(null)
  const context = useRef<AudioContext | null>(null)
  const [playing, setPlaying] = useState(false)
  const playingSynth = useRef<{
    buffer: MidiBuffer
    timeout?: NodeJS.Timeout
  } | null>(null)
  const [genre, setGenre] = useState<(typeof genres)[number]>(genres[0])
  const [program, setProgram] = useState<number>(0)
  useEffect(() => {
    context.current = new AudioContext()
  }, [])
  const { complete, isLoading } = useCompletion({
    ...COMMON_STATIC_CONFIG,
  })
  const { complete: completeContinuation, isLoading: isLoadingContinuation } =
    useCompletion({
      ...COMMON_STATIC_CONFIG,
    })
  const getSynth = async (music: string) => {
    if (!musicRef.current || !context.current) return {}
    const synth = new abcjs.synth.CreateSynth()
    const musicLines = music
      .split("\n")
      .filter((line) => !!line.trim())
      .join("\n")
    const rendered = abcjs.renderAbc(musicRef.current, musicLines, {
      scrollHorizontal: true,
      responsive: "resize",
      oneSvgPerLine: true,
      wrap: {
        preferredMeasuresPerLine: 100,
        maxSpacing: 1,
        minSpacing: 1,
      },
    })
    await synth.init({
      options: {
        program,
      },
      audioContext: context.current,
      visualObj: rendered[0],
    })
    const { duration } = await synth.prime()
    return { synth, duration }
  }
  const playMusic = async ({
    synth,
    music,
    duration,
  }: {
    music: string
    synth: MidiBuffer
    duration: number
  }) => {
    synth.start()
    let nextSynth: MidiBuffer | undefined
    let nextDuration: number | undefined
    let nextMusic: string | undefined | null
    const timeout = setTimeout(async () => {
      nextMusic = await completeContinuation(genre, {
        body: {
          style: genre,
          previousMusic: music,
        },
      })
      if (nextMusic) {
        ;({ synth: nextSynth, duration: nextDuration } = await getSynth(
          nextMusic
        ))
      }
    }, 0)
    playingSynth.current = { buffer: synth, timeout }
    setTimeout(() => {
      if (nextSynth && nextDuration && nextMusic) {
        playMusic({
          synth: nextSynth,
          duration: nextDuration,
          music: nextMusic,
        })
      }
    }, duration * 1000)
    setTimeout(() => {
      synth.stop()
    }, duration * 1100)
    return synth
  }
  return (
    <section className="container flex h-screen flex-col items-center justify-center gap-6">
      <h1 className="flex gap-2 text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
        GPT Plays
        <Select
          defaultValue="jazz"
          onValueChange={(value) => {
            setGenre(value as (typeof genres)[number])
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
            )
            setProgram(index > -1 ? index : 0)
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
            setPlaying(false)
            const { timeout, buffer } = playingSynth.current || {}
            if (timeout) {
              clearTimeout(timeout)
            }
            if (buffer) {
              buffer.stop()
            }
          }}
          disabled={!playing}
        >
          Pause
        </Button>

        <Button
          onClick={() => {
            setPlaying(true)
            complete(genre, {
              body: {
                style: genre,
              },
            }).then((music) => {
              if (music) {
                getSynth(music).then(({ synth, duration }) => {
                  if (synth) {
                    playMusic({ synth, duration, music })
                  }
                })
              }
            })
          }}
          disabled={isLoading || isLoadingContinuation || playing}
        >
          Play
        </Button>
      </div>
      <div className="!hidden" ref={musicRef}></div>
    </section>
  )
}
