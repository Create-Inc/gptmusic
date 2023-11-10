import { GPTOptions, GPTString, ParseFunction } from "./types"

export const getString = async <
  Options extends Omit<GPTOptions, "stream"> & { stream: false }
>(
  str: string | GPTString<Options>
) => {
  return typeof str === "string" ? str : str.get()
}

export const processCallstack = async <
  Options extends Omit<GPTOptions, "stream"> & { stream: false }
>({
  callStack,
  value,
}: {
  callStack: { method: string; args: any[] }[]
  value: string | null
}) => {
  return callStack.reduce(async (p, call) => {
    const prev = await p
    if (typeof prev !== "string") {
      return prev
    }
    if (call.method === "is") {
      if ((await getString<Options>(call.args[0])) === prev) {
        return getString(call.args[1])
      }
      return getString(call.args[2])
    }
    if (call.method === "includes") {
      const v = await getString<Options>(call.args[0])
      if (typeof v === "string" && prev.includes(v)) {
        return getString(call.args[1])
      }
      return getString(call.args[2])
    }
    // @ts-ignore
    return prev[call.method](...call.args)
  }, Promise.resolve(value))
}

export const processArrayCallstack = async ({
  call,
  callStack,
  values,
  parse,
}: {
  call?: { method: string; args: any[] }
  callStack: { method: string; args: any[] }[]
  values: (string | null)[]
  parse?: ParseFunction
}) => {
  if (call?.method === "first") {
    const value = await processCallstack({ value: values[0], callStack })
    return parse ? parse(value) : value
  }
  if (call?.method === "each") {
    return (
      await Promise.all(
        values.map((value) => processCallstack({ callStack, value }))
      )
    )
      .map((value) => (parse ? parse(value) : value))
      .join(call.args[0] ?? "")
  }
  throw new Error(`Cannot call "${call?.method}" on GPTStringArray`)
}
