import { OpenAI } from "openai"

export type GPTOptions = {
  n: number | undefined
  returns: unknown
  stream: boolean
  debug: boolean
}

/**
 * Map the functions that return a string to return a GPTString instead
 */
type GPTStringMethods<Options extends GPTOptions> = Options["returns"] extends
  | string
  | null
  ? {
      /** Returns a string representation of a string. */
      toString(): GPTString<Options>

      /**
       * Returns the character at the specified index.
       * @param pos The zero-based index of the desired character.
       */
      charAt(pos: number): GPTString<Options>

      /**
       * Returns the Unicode value of the character at the specified location.
       * @param index The zero-based index of the desired character. If there is no character at the specified index, NaN is returned.
       */
      // charCodeAt(index: number): number;

      /**
       * Returns a string that contains the concatenation of two or more strings.
       * @param strings The strings to append to the end of the string.
       */
      concat(...strings: string[]): GPTString<Options>

      /**
       * Returns the position of the first occurrence of a substring.
       * @param searchString The substring to search for in the string
       * @param position The index at which to begin searching the String object. If omitted, search starts at the beginning of the string.
       */
      // indexOf(searchString: string, position?: number): number;

      /**
       * Returns the last occurrence of a substring in the string.
       * @param searchString The substring to search for.
       * @param position The index at which to begin searching. If omitted, the search begins at the end of the string.
       */
      // lastIndexOf(searchString: string, position?: number): number;

      /**
       * Determines whether two strings are equivalent in the current locale.
       * @param that String to compare to target string
       */
      // localeCompare(that: string): number;

      /**
       * Matches a string with a regular expression, and returns an array containing the results of that search.
       * @param regexp A variable name or string literal containing the regular expression pattern and flags.
       */
      // match(regexp: string | RegExp): RegExpMatchArray | null;

      /**
       * Replaces text in a string, using a regular expression or search string.
       * @param searchValue A string or regular expression to search for.
       * @param replaceValue A string containing the text to replace. When the {@linkcode searchValue} is a `RegExp`, all matches are replaced if the `g` flag is set (or only those matches at the beginning, if the `y` flag is also present). Otherwise, only the first match of {@linkcode searchValue} is replaced.
       */
      replace(
        searchValue: string | RegExp,
        replaceValue: string
      ): GPTString<Options>

      /**
       * Replaces text in a string, using a regular expression or search string.
       * @param searchValue A string to search for.
       * @param replacer A function that returns the replacement text.
       */
      replace(
        searchValue: string | RegExp,
        replacer: (substring: string, ...args: any[]) => string
      ): GPTString<Options>

      /**
       * Finds the first substring match in a regular expression search.
       * @param regexp The regular expression pattern and applicable flags.
       */
      // search(regexp: string | RegExp): number;

      /**
       * Returns a section of a string.
       * @param start The index to the beginning of the specified portion of stringObj.
       * @param end The index to the end of the specified portion of stringObj. The substring includes the characters up to, but not including, the character indicated by end.
       * If this value is not specified, the substring continues to the end of stringObj.
       */
      slice(start?: number, end?: number): GPTString<Options>

      /**
       * Returns the substring at the specified location within a String object.
       * @param start The zero-based index number indicating the beginning of the substring.
       * @param end Zero-based index number indicating the end of the substring. The substring includes the characters up to, but not including, the character indicated by end.
       * If end is omitted, the characters from start through the end of the original string are returned.
       */
      substring(start: number, end?: number): GPTString<Options>

      /** Converts all the alphabetic characters in a string to lowercase. */
      toLowerCase(): GPTString<Options>

      /** Converts all alphabetic characters to lowercase, taking into account the host environment's current locale. */
      toLocaleLowerCase(locales?: string | string[]): GPTString<Options>

      /** Converts all the alphabetic characters in a string to uppercase. */
      toUpperCase(): GPTString<Options>

      /** Returns a string where all alphabetic characters have been converted to uppercase, taking into account the host environment's current locale. */
      toLocaleUpperCase(locales?: string | string[]): GPTString<Options>

      /** Removes the leading and trailing white space and line terminator characters from a string. */
      trim(): GPTString<Options>

      // IE extensions
      /**
       * Gets a substring beginning at the specified location and having the specified length.
       * @deprecated A legacy feature for browser compatibility
       * @param from The starting position of the desired substring. The index of the first character in the string is zero.
       * @param length The number of characters to include in the returned substring.
       */
      substr(from: number, length?: number): GPTString<Options>

      /** Returns the primitive value of the specified object. */
      valueOf(): GPTString<Options>

      // readonly [index: number]: string;

      is<T extends GPTOptions, O extends GPTOptions>(
        value: string | GPTString<Options>,
        then: string | GPTString<T>,
        otherwise: string | GPTString<O>
      ): string | GPTString<T | O>

      includes<T extends GPTOptions, O extends GPTOptions>(
        value: string | GPTString<Options>,
        then: string | GPTString<T>,
        otherwise: string | GPTString<O>
      ): string | GPTString<T | O>
    }
  : {}

export type GPTStringArrayMethods<Options extends GPTOptions> =
  Options["n"] extends undefined
    ? {}
    : {
        each(delimiter?: string): GPTString<Options>
        first(): GPTString<Options>
      }

type StaticTagValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | GPTString<GPTOptions>
export type TagValueLiteral = StaticTagValue | (() => StaticTagValue)
export type TagValue = TagValueLiteral | Promise<TagValueLiteral>

type AsyncIterableOpenAIStreamReturnTypes =
  | AsyncIterable<OpenAI.Chat.ChatCompletionChunk>
  | AsyncIterable<OpenAI.Chat.ChatCompletion>

export type GptStringImplementation<Options extends GPTOptions> = {
  _isGptString: true
  cachedRun?: Promise<
    Options["stream"] extends true
      ? AsyncIterableOpenAIStreamReturnTypes
      : Options["n"] extends undefined
      ? Options["returns"]
      : Options["returns"][]
  >
  get(): Promise<
    Options["stream"] extends true
      ? AsyncIterableOpenAIStreamReturnTypes
      : Options["n"] extends undefined
      ? Options["returns"]
      : Options["returns"][]
  >
  children: TagValue[]
  strings: string[]
  parse?: ParseFunction<Options["returns"]>
  callStack: { method: string; args: any[] }[]
  arrCallStack: { method: string; args: any[] }[]
}
export type GPTString<Options extends GPTOptions> = GptStringImplementation<{
  returns: Options["returns"]
  stream: Options["stream"]
  debug: Options["debug"]
  n: undefined
}> &
  GPTStringMethods<Options>

type GPTStringArray<Options extends GPTOptions> =
  GptStringImplementation<Options> & GPTStringArrayMethods<Options>

export type GPTStringValue<Options extends GPTOptions> =
  Options["n"] extends number ? GPTStringArray<Options> : GPTString<Options>

export type ParseFunction<ReturnValue = unknown> = (
  value: string | null
) => ReturnValue | Awaited<ReturnValue>

export type EvaluationFunction<ReturnValue = unknown> = (
  parsedValue: ReturnValue,
  original: string | null
) => void | { score: number }

export type GPTTagMetadata<Options extends GPTOptions> = {
  evaluations?: EvaluationFunction[]
  id?: string
  temperature?: number
  staticMessages?: OpenAI.Chat.ChatCompletionMessageParam[]
  model?: OpenAI.Chat.ChatCompletionCreateParams["model"]
  n?: Options["n"]
  parse?: ParseFunction<Options["returns"]>
  stream?: Options["stream"]
  debug?: Options["debug"]
}

export type GPTTag<Options extends GPTOptions> = {
  (
    strings?: TemplateStringsArray,
    ...values: TagValue[]
  ): GPTStringValue<Options>
  metadata: GPTTagMetadata<Options>
  temperature(
    temperature: NonNullable<GPTTagMetadata<Options>["temperature"]>
  ): GPTTag<Options>
  model(model: GPTTagMetadata<Options>["model"]): GPTTag<Options>
  addMessage(message: OpenAI.Chat.ChatCompletionMessageParam): GPTTag<Options>
  addMessages(
    message: OpenAI.Chat.ChatCompletionMessageParam[]
  ): GPTTag<Options>
  id(id: string): GPTTag<Options>
  n<N extends number = number>(
    n: N
  ): GPTTag<{
    n: N
    returns: Options["returns"]
    stream: Options["stream"]
    debug: Options["debug"]
  }>
  parse<P>(fn: ParseFunction<P>): GPTTag<{
    returns: Awaited<P>
    stream: Options["stream"]
    n: Options["n"]
    debug: Options["debug"]
  }>
  stream<S extends boolean = boolean>(
    stream: S
  ): GPTTag<{
    stream: S
    n: Options["n"]
    returns: Options["returns"]
    debug: Options["debug"]
  }>
  debug<D extends boolean = boolean>(
    debug: D
  ): GPTTag<{
    debug: D
    stream: Options["stream"]
    n: Options["n"]
    returns: Options["returns"]
  }>
  addEvaluation(fn: EvaluationFunction<Options["returns"]>): GPTTag<Options>
  addEvaluations(fn: EvaluationFunction<Options["returns"]>[]): GPTTag<Options>
}
