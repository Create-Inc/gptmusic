"use server"

import { NextResponse } from "next/server"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { z } from "zod"

export const runtime = "edge"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
})

/**
 * This function exists to just hold open and consume a stream, so that
 * if the stream was otherwise cancelled by the client, it will continue
 * to run on the server and finish the request.
 */
async function consumeServerStream(stream: ReadableStream) {
  // @ts-expect-error - TS doesn't know that this is an edge environment where ReadableStream implements an async iterator
  // eslint-disable-next-line no-underscore-dangle,@typescript-eslint/no-unused-vars
  for await (const _chunk of stream) {
    // eslint-disable-next-line no-continue
    continue
  }
}

const schema = z.object({})

const FALL_BACK_MODEL = "gpt-3.5-turbo-16k"

export default async function POST(req: Request) {
  const {} = await schema.parseAsync(await req.json())
  try {
    // Convert the response into a friendly text-stream
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
