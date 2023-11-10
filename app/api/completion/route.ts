import { NextResponse } from "next/server"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { z } from "zod"

import { openai } from "../lib"

export const runtime = "edge"

const schema = z.object({
  style: z.string().min(1).max(1000).default("jazz"),
  previous: z.string().optional(),
})

const base = openai.model("gpt-4-1106-preview").stream(true)

const abcGenerator = base.addMessage({
  role: "system",
  content:
    `You are an abc music generator. Given a style of music, respond with ABC music notation. Do not provide any explanation or any other information. For example:
Request:
###
genre: jazz
###

Response:
X:1
T:Jazz Melody in the style of Miles Davis
C:Miles Davis Style
M:4/4
L:1/8
K:Cmaj
|:"Dm7" A4 G2 F2 | "G7" E4 D2 C2 | "Cmaj7" C6 B,2 | "Cmaj7" C8 |
| "Dm7" A4 G2 F2 | "G7" E4 D2 C2 | "Cmaj7" C6 B,2 | "Cmaj7" C8 :|
  `.trim(),
})

const continuationGenerator = base.addMessage({
  role: "system",
  content:
    `You are an abc music generator. Given this previous set of music, you should respond by continuing the passage also in abc music notation. Do not provide any explanation or any other information. You should aim to progress the music. It should become more fun and exciting but stay within the same style. Do not duplicate the previous passage as this new passage will be played in sequence after the previous passage.

For example:
Request:
###
genre: jazz
previous passage:
Response:
X:1
T:Jazz Melody in the style of Miles Davis
C:Miles Davis Style
M:4/4
L:1/8
K:Cmaj
|:"Dm7" A4 G2 F2 | "G7" E4 D2 C2 | "Cmaj7" C6 B,2 | "Cmaj7" C8 |
| "Dm7" A4 G2 F2 | "G7" E4 D2 C2 | "Cmaj7" C6 B,2 | "Cmaj7" C8 :|
###

Response:
X:1
T:Jazz Melody in the Style of Miles Davis
C:Miles Davis Style
M:4/4
L:1/8
K:Cmaj
| "Em7" G4 A2 B2 | "A7" C4 B2 A2 | "Dm7" F6 E2 | "Dm7" F8 |
| "Em7" G4 F2 E2 | "A7" C4 D2 E2 | "Dm7" F6 E2 | "Dm7" F8 :|
  `.trim(),
})

export async function POST(req: Request) {
  const { style, previous } = await schema.parseAsync(await req.json())
  try {
    const completionResponse = await (previous
      ? continuationGenerator`Request:###genre: ${style}\nPrevious passage:${previous}###\nResponse:`.get()
      : abcGenerator`Request:###genre: ${style}###\nResponse:`.get())
    // @ts-ignore
    const openAIStream = OpenAIStream(completionResponse, {})
    return new StreamingTextResponse(openAIStream)
  } catch (error) {
    // Check if the error is an APIError
    if (error instanceof OpenAI.APIError) {
      const { name, status, headers, message } = error
      return NextResponse.json({ name, status, headers, message }, { status })
    }
    throw error
  }
}
