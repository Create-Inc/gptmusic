import Table from "cli-table3"
import colors from "colors/safe"
import { OpenAI } from "openai"

import { DEFAULT_MODEL } from "./constants"
import { GPTOptions, GPTTagMetadata } from "./types"

type DebugOptions<Options extends GPTOptions> = {
  strings: string[]
  children: string[]
  choices: (string | null)[]
  metadata: GPTTagMetadata<Options>
}

type StreamDebugOptions<Options extends GPTOptions> = {
  strings: string[]
  children: string[]
  stream: ReadableStream
  metadata: GPTTagMetadata<Options>
}
let i = 0
const varColors = ["red", "green", "yellow", "blue", "magenta", "cyan"] as const

const values = new Map<string, (typeof varColors)[number]>()

let currentLine = ""
let latest = ""

async function writeToConsole(newContent: string) {
  // clear latest
  currentLine += latest
  currentLine += "\n" + newContent
  latest = ""
  console.clear()
  await new Promise<void>((resolve) =>
    process.stdout.cursorTo(0, 0, () => resolve())
  )
  await new Promise<void>((resolve) =>
    process.stdout.clearLine(0, () => resolve())
  )
  console.log(currentLine)
}

async function updateLatest(newContent: string) {
  latest = newContent
  console.clear()
  await new Promise<void>((resolve) =>
    process.stdout.cursorTo(0, 0, () => resolve())
  )
  await new Promise<void>((resolve) =>
    process.stdout.clearLine(0, () => resolve())
  )
  console.log(currentLine + "\n" + latest)
}

const getTableString = <Options extends GPTOptions>({
  strings,
  children,
  choices,
  metadata,
}: DebugOptions<Options>) => {
  const maxWidth = process.stdout.columns || 400
  const color = varColors[i % varColors.length]
  const table = new Table({
    head: [
      colors[color]("Prompt"),
      colors[color](`Result${choices.length > 0 ? "s" : ""}`),
    ],
    colAligns: ["left", "left"],
    colWidths: [Math.floor(maxWidth / 2) - 2, Math.floor(maxWidth / 2) - 2],
    wordWrap: true,
  })
  let s = ""
  strings.forEach((string, i) => {
    s += string
    if (children[i]) {
      const color = values.get(children[i]) || "white"
      // @ts-ignore
      s += colors[color].underline(`${children[i]}`)
    }
  })
  choices.forEach((choice, i) => {
    if (!choice) return
    values.set(choice, color)
  })
  table.push(
    [
      {
        content: s,
        rowSpan: choices.length,
      },
      {
        content: colors[color](choices[0] ?? ""),
      },
    ],
    ...choices.slice(1).map((choice) => [
      {
        content: colors[color](choice ?? ""),
      },
    ]),
    [
      {
        content: colors.white(
          [
            ...(typeof metadata.id === "string" ? [`[${metadata.id}]`] : []),
            `${metadata.model ?? DEFAULT_MODEL}`,
            ...(typeof metadata.temperature === "number"
              ? [`temperature=${metadata.temperature}`]
              : []),
            ...(metadata.parse
              ? [`parseFn=${metadata.parse.name || "(anonymous)"}`]
              : []),
            ...(typeof metadata.n === "number" && metadata.n > 1
              ? [`choices=${metadata.n}`]
              : []),
            ...(typeof metadata.stream === "boolean" && !!metadata.stream
              ? [`streaming`]
              : []),
          ].join(" ")
        ),
        hAlign: "right",
        colSpan: 2,
      },
    ]
  )
  return table.toString()
}

export const debug = async <Options extends GPTOptions>({
  strings,
  children,
  choices,
  metadata,
}: DebugOptions<Options>) => {
  const tableString = getTableString({
    strings,
    children,
    choices,
    metadata,
  })
  i += 1

  await writeToConsole(tableString)
}

export const debugStream = async <Options extends GPTOptions>({
  stream,
  metadata,
  strings,
  children,
}: StreamDebugOptions<Options>) => {
  const reader = stream.getReader()

  const strs: Array<string> = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = JSON.parse(
        new TextDecoder().decode(value)
      ) as OpenAI.ChatCompletionChunk
      chunk.choices.forEach((choice) => {
        strs[choice.index] =
          (strs[choice.index] ?? "") + (choice.delta.content ?? "")
      })
      const tableString = getTableString({
        strings,
        children,
        choices: strs,
        metadata,
      })
      await updateLatest(tableString)
    }
  } finally {
    reader.releaseLock()
  }
}
