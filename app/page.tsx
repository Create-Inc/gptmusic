"use client"

import { useEffect, useRef, useState } from "react"
import abcjs, { MidiBuffer } from "abcjs"
import { useCompletion } from "ai/react"

import { Button } from "@/components/ui/button"

type AICompletionConfig = Parameters<typeof useCompletion>[0]
const COMMON_STATIC_CONFIG: Partial<AICompletionConfig> = {
  api: "/api/completion",
  onError: (err: Error) => {
    console.error(err)
  },
}

export default function IndexPage() {
  const musicRef = useRef<HTMLDivElement>(null)
  const context = useRef<AudioContext | null>(null)
  const [playing, setPlaying] = useState(false)
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
    const rendered = abcjs.renderAbc(musicRef.current, music, {
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
    setTimeout(async () => {
      nextMusic = await completeContinuation("jazz", {
        body: {
          previousMusic: music,
        },
      })
      if (nextMusic) {
        ;({ synth: nextSynth, duration: nextDuration } = await getSynth(
          nextMusic
        ))
      }
    }, duration * 500)
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
      <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
        GPT Plays Jazz
      </h1>
      <div className="flex gap-4">
        <Button
          onClick={() => {
            setPlaying(false)
          }}
          disabled={!playing}
        >
          Pause
        </Button>

        <Button
          onClick={() => {
            setPlaying(true)
            complete("jazz").then((music) => {
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
      <div ref={musicRef}></div>
    </section>
  )
}
