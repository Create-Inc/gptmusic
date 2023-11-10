import util from "node:util"
import { OpenAI } from "openai"

import { DEFAULT_MODEL } from "./constants"
import { debug, debugStream } from "./debug"
import {
  EvaluationFunction,
  GPTOptions,
  GPTStringValue,
  GPTTag,
  GPTTagMetadata,
  GptStringImplementation,
  ParseFunction,
  TagValue,
} from "./types"
import { processArrayCallstack, processCallstack } from "./utils"

const DEBUG = true

const openaiAPI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function zip<T>(...arrays: T[][]): T[][] {
  // Find the length of the longest array
  const maxLength = Math.max(...arrays.map((arr) => arr.length))

  // Create a new array to hold the zipped values
  const zipped: T[][] = []

  // Loop through each index up to the smallest array length
  for (let i = 0; i < maxLength; i++) {
    // At each index, grab the ith element from each array and make a new array from those
    const zippedElement: T[] = arrays.map((arr) => arr[i])
    zipped.push(zippedElement)
  }

  return zipped
}
const getValueFromTagChild = async (child: TagValue): Promise<string> => {
  try {
    if (util.types.isPromise(child)) {
      return getValueFromTagChild(await child)
    }
    if (typeof child === "object" && child && child._isGptString) {
      return `${await child.get()}`
    } else if (typeof child === "function") {
      return `${await getValueFromTagChild(child())}`
    } else {
      return `${await Promise.resolve(child)}`
    }
  } catch (e) {
    return `${e}`
  }
}

const makeString = <Options extends GPTOptions>(
  metadata: GPTTagMetadata<Options>,
  options?: Partial<GptStringImplementation<Options>>
): GPTStringValue<Options> => {
  const gptStringImpl: GptStringImplementation<Options> = Object.assign(
    {
      _isGptString: true,
      strings: [],
      children: [],
      arrCallStack: [],
      callStack: [],
      parse: metadata.parse,
      cachedRun: undefined,
      async get(this: GptStringImplementation<Options>) {
        if (this.cachedRun !== undefined) {
          return this.cachedRun
        }
        this.cachedRun = new Promise(async (resolve) => {
          const { n, evaluations } = metadata
          const processedChildren = await Promise.all(
            this.children.map((item) => getValueFromTagChild(item))
          )

          const message = zip(this.strings, processedChildren).flat().join("")
          const args: OpenAI.ChatCompletionCreateParamsNonStreaming = {
            temperature: metadata.temperature,
            model: metadata.model ?? DEFAULT_MODEL,
            messages: [
              ...(metadata.staticMessages ?? []),
              {
                role: "user",
                content: message,
              },
            ],
            n: n ?? 1,
          }
          const stream = metadata.stream
          if (stream) {
            const openAIChatStream = await openaiAPI.chat.completions.create({
              ...args,
              stream: true,
            })
            // debug stream tokens
            if (metadata.debug || DEBUG) {
              const [openAIStream, streamForDebug] = openAIChatStream.tee()
              const readStream = streamForDebug.toReadableStream()
              await debugStream({
                stream: readStream,
                strings: this.strings,
                children: processedChildren,
                metadata,
              })
              // @ts-ignore
              return resolve(openAIStream)
            }
            // @ts-ignore
            return resolve(openAIChatStream)
          }

          const choices = (
            await openaiAPI.chat.completions.create({ ...args })
          ).choices
            .slice(0, metadata.n ?? 1)
            .map(({ message }) => message.content)
          if (metadata.debug || DEBUG) {
            await debug({
              strings: this.strings,
              children: processedChildren,
              choices,
              metadata,
            })
          }
          const { parse } = this
          if (n === undefined) {
            const parsedValue = parse ? await parse(choices[0]) : choices[0]
            const value = await processCallstack({
              callStack: this.callStack,
              // @ts-ignore
              value: parsedValue,
            })
            this.callStack = []
            this.arrCallStack = []
            this.parse = undefined
            // @ts-ignore
            return resolve(value)
          } else {
            const parsedValues = parse
              ? await Promise.all(choices.map((choice) => parse(choice)))
              : choices
            const value = await processArrayCallstack({
              call: this.arrCallStack[0],
              callStack: this.callStack,
              // @ts-ignore
              values: parsedValues,
              parse,
            })
            this.callStack = []
            this.arrCallStack = []
            this.parse = undefined
            // @ts-ignore
            return resolve(value)
          }
        })
        return this.cachedRun
      },
    },
    options
  )
  const gptString = new Proxy<GptStringImplementation<Options>>(gptStringImpl, {
    get(
      this: GptStringImplementation<Options>,
      target,
      property: string,
      receiver
    ) {
      const self = this as GptStringImplementation<Options>
      if (property in target) {
        return Reflect.get(target, property, receiver)
      }
      if (typeof property !== "string") {
        return undefined
      }

      if (property === "length") {
        return function () {
          self.callStack.push({ method: property, args: [] })
          return self
        }
      }

      if (property in String.prototype) {
        return function (...args: any[]) {
          self.callStack.push({ method: property, args })
          return self
        }
      }
      if (["is", "includes"].includes(property)) {
        return function (...args: any[]) {
          const copy = makeString(
            { ...metadata },
            {
              children: [...self.children],
              strings: [...self.strings],
              cachedRun: self.cachedRun,
            }
          )
          copy.callStack.push({ method: property, args })
          return copy
        }
      }
      if (["each", "first"].includes(property)) {
        return function (...args: any[]) {
          const copy = makeString(
            { ...metadata },
            {
              children: [...self.children],
              strings: [...self.strings],
              cachedRun: self.cachedRun,
            }
          )
          copy.arrCallStack.push({ method: property, args })
          return copy
        }
      }
      return undefined
    },
  })
  return gptString as unknown as GPTStringValue<Options>
}

const makeGPTTag = <
  Options extends GPTOptions = {
    returns: string | null
    stream: false
    n: undefined
    debug: false
  }
>(
  metadata?: GPTTagMetadata<Options>
): GPTTag<Options> => {
  function gpt(
    strings?: TemplateStringsArray,
    ...values: TagValue[]
  ): GPTStringValue<Options> {
    const child = makeString<Options>({
      ...gpt.metadata,
    })
    child.strings = strings ? [...strings] : []
    child.children = values
    return child
  }
  gpt.metadata = Object.assign({}, metadata || {})
  gpt.id = (id: string) => {
    const tag = makeGPTTag<Options>({ ...gpt.metadata, id })
    return tag
  }
  gpt.temperature = (temperature: number) => {
    const tag = makeGPTTag<Options>({ ...gpt.metadata, temperature })
    return tag
  }
  gpt.model = (model: string) => {
    const tag = makeGPTTag<Options>({ ...gpt.metadata, model })
    return tag
  }
  gpt.addMessage = (message: OpenAI.Chat.ChatCompletionMessageParam) => {
    const tag = makeGPTTag<Options>({
      ...gpt.metadata,
      staticMessages: [...(gpt.metadata.staticMessages ?? []), message],
    })
    return tag
  }
  gpt.addMessages = (messages: OpenAI.Chat.ChatCompletionMessageParam[]) => {
    const tag = makeGPTTag<Options>({
      ...gpt.metadata,
      staticMessages: [...(gpt.metadata.staticMessages ?? []), ...messages],
    })
    return tag
  }
  gpt.n = <N extends number = number>(n: N) => {
    const tag = makeGPTTag<Omit<Options, "n"> & { n: N }>({
      ...gpt.metadata,
      n,
    })
    return tag
  }
  gpt.parse = <UpdatedReturnValue>(
    fn: ParseFunction<Awaited<UpdatedReturnValue>>
  ) => {
    const tag = makeGPTTag<
      Omit<Options, "returns"> & { returns: Awaited<UpdatedReturnValue> }
    >({
      ...gpt.metadata,
      parse: fn,
    })
    return tag
  }

  gpt.stream = <S extends boolean = boolean>(stream: S) => {
    const tag = makeGPTTag<
      Omit<Options, "stream"> & {
        stream: S
      }
    >({
      ...gpt.metadata,
      stream,
    })
    return tag
  }

  gpt.debug = <D extends boolean = boolean>(debug: D) => {
    const tag = makeGPTTag<
      Omit<Options, "debug"> & {
        debug: D
      }
    >({
      ...gpt.metadata,
      debug,
    })
    return tag
  }

  gpt.addEvaluation = (evaluation: EvaluationFunction<unknown>) => {
    const tag = makeGPTTag<Options>({
      ...gpt.metadata,
      evaluations: [...(gpt.metadata.evaluations ?? []), evaluation],
    })
    return tag
  }

  gpt.addEvaluations = (evaluations: EvaluationFunction<unknown>[]) => {
    const tag = makeGPTTag<Options>({
      ...gpt.metadata,
      evaluations: [...(gpt.metadata.evaluations ?? []), ...evaluations],
    })
    return tag
  }

  return gpt
}

export const openai = makeGPTTag()
