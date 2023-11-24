import { NextResponse } from "next/server";
import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { z } from "zod";

import { openai } from "../lib";

export const runtime = "edge";

const schema = z.object({
  previous: z.string().optional(),
});

const base = openai.model("gpt-4-1106-preview").stream(true);

const generalGuidance = `

Do not include measure chords. Spell out each note individually.
You should produce 16 measures.
You should incorporate rests.
Do not provide any explanation or any other information.
Do not repeat sections (e.g. |: ... :|).
You should really lean into the genre. Prefer to make songs that are very fast paced and high energy. 
Do not generate music with multiple endings (e.g. |1 ... :|2 ... :|).
Each section should feel complete. There should be some finality to it.

Ties make pieces feel more connected or gracfeul. This will produce a tie between an A and B note:
(AB)

Grace notes feel pieces feel more interesting. This will produce a grace note before the A:
{c}A

Chords make pieces feel more structured and full-bodied. this will produce a chord:
[Ace]

Rests can help with pieces feeling more organizedTo produce a rest, use z notation:
z2 z2 z2 z2

To produce a trill, use a tilde:
~A

`;

const abcGenerator = base.addMessage({
  role: "system",
  content:
    `You are an abc music generator. Given a style of music, respond with ABC music notation. 

${generalGuidance}

Here are some examples:

Request:
###
genre: traditional irish
###

Response:
X: 1
Q: 1/4=180
T: tranditional irish
M: 4/4
K: Em
|EB{c}BA B2 EB|~B2 AB dBAG|FDAD BDAD|FDAD dAFD|
EBBA B2 EB|B2 AB defg|afe^c dBAF|DEFD E2|
  `.trim(),
});

const continuationGenerator = base.addMessage({
  role: "system",
  content:
    `You are an abc music generator. Given this previous set of music, you should respond by continuing the passage also in abc music notation. Do not provide any explanation or any other information. 
You should aim to progress the music. 
You should generally just aim to produce a variation on top of the previous passage, keeping some parts the same but make other parts more interesting and varied.
It should become more fun and exciting but stay within the same style. 
Do not duplicate the previous passage as this new passage will be played in sequence after the previous passage. 
You should always start on the first beat of the measure. Do not include any measures that are not full.
Use the same tempo (Q), title (T), and key (K). Keep all staves the same as well. 

${generalGuidance}

`.trim(),
});

export async function POST(req: Request) {
  const { previous } = await schema.parseAsync(await req.json());
  try {
    const completionResponse = await (previous
      ? continuationGenerator`Request:###\ngenre: Variations on jingle bells\nPrevious passage:\n${previous}###\nResponse:`.get()
      : abcGenerator`Request:###\ngenre: Variations on jingle bells###\nResponse:`.get());
    // @ts-ignore
    const openAIStream = OpenAIStream(completionResponse, {});
    return new StreamingTextResponse(openAIStream);
  } catch (error) {
    // Check if the error is an APIError
    if (error instanceof OpenAI.APIError) {
      const { name, status, headers, message } = error;
      return NextResponse.json({ name, status, headers, message }, { status });
    }
    throw error;
  }
}
