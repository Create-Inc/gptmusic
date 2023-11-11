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
    `You are an abc music generator. Given a style of music, respond with ABC music notation. Do not provide any explanation or any other information. You should really lean into the genre. Prefer to make songs that are very fast paced and high energy. 

Do not include measure chords. Spell out each note individually.

Request:
###
genre: jig
###

Response:
Q:1/4=180
X:1
T:Paddy O'Rafferty (Jig)
C:Trad.

O:Irish
R:Jig
M:6/8
K:D
dff cee|def gfe|dff cee|dfe dBA|
dff cee|def gfe|faf gfe|1 dfe dBA:|2 dfe dcB|]
~A3 B3|gfe fdB|AFA B2c|dfe dcB|
~A3 ~B3|efe efg|faf gfe|1 dfe dcB:|2 dfe dBA|]
fAA eAA|def gfe|fAA eAA|dfe dBA|
fAA eAA|def gfe|faf gfe|dfe dBA:|

Request:
###
genre: classical
###

Response:
Q:1/4=220
X: 1
T: Cooley's
M: 4/4
L: 1/8
R: reel
K: Em
V: Melody
|:D2|EB{c}BA B2 EB|~B2 AB dBAG|FDAD BDAD|FDAD dAFD|
EBBA B2 EB|B2 AB defg|afe^c dBAF|DEFD E2:|
|:gf|eB B2 efge|eB B2 gedB|A2 FA DAFA|A2 FA defg|
eB B2 eBgB|eB B2 defg|afe^c dBAF|DEFD E2:|


Note: you should try to follow these chord progressions depending on the genre:
1. Pop/Rock Progressions
I-V-vi-IV: This is perhaps one of the most famous progressions in modern pop music. In the key of C major, it would be C-G-Am-F.
ii-V-I: A fundamental jazz progression, but also found in pop. In C major, it's Dm7-G7-Cmaj7.
vi-IV-I-V: Another common pop progression. In C major: Am-F-C-G.
I-IV-V-I: A classic progression used in blues and rock 'n' roll. In C major: C-F-G-C.
2. Blues Progressions
Standard 12-Bar Blues: I-I-I-I-IV-IV-I-I-V-IV-I-I. In C, it's C-C-C-C-F-F-C-C-G-F-C-C.
Quick Change Blues: Introduces a IV chord in the second bar. I-IV-I-I-IV-IV-I-I-V-IV-I-I. In C, it's C-F-C-C-F-F-C-C-G-F-C-C.
3. Jazz Progressions
ii-V-I-IV: A slight variation on the ii-V-I, adding more movement. In C major: Dm7-G7-Cmaj7-Fmaj7.
I-vi-ii-V: Often used in jazz standards. In C major: Cmaj7-Am7-Dm7-G7.
iii-VI-ii-V: A cyclical progression common in jazz. In C major: Em7-A7-Dm7-G7.
4. Classical Progressions
I-IV-I-V-I: A basic progression often used in classical pieces. In C major: C-F-C-G-C.
I-V-vi-iii-IV-I-IV-V: A more complex progression that offers a sense of resolution. In C major: C-G-Am-Em-F-C-F-G.
5. Folk/Country Progressions
I-V-ii-IV: A simple, melodious progression used in many folk songs. In C major: C-G-Dm-F.
I-IV-I-V: A staple in classic country music. In C major: C-F-C-G.
  `.trim(),
})

const continuationGenerator = base.addMessage({
  role: "system",
  content:
    `You are an abc music generator. Given this previous set of music, you should respond by continuing the passage also in abc music notation. Do not provide any explanation or any other information. You should aim to progress the music. It should become more fun and exciting but stay within the same style. Do not duplicate the previous passage as this new passage will be played in sequence after the previous passage. Do no change the tempo or the title. Keep all staves the same as well.
`.trim(),
})

export async function POST(req: Request) {
  const { style, previous } = await schema.parseAsync(await req.json())
  try {
    const completionResponse = await (previous
      ? continuationGenerator`Request:###\ngenre: ${style}\nPrevious passage:${previous}###\nResponse:`.get()
      : abcGenerator`Request:###\ngenre: ${style}###\nResponse:`.get())
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
