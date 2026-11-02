// Anthropic Messages API 호출 — 키는 Supabase secret 에만 존재
const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolDef {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

interface MessagesRequest {
  model: string
  max_tokens: number
  system?: string
  messages: AnthropicMessage[]
  tools?: ToolDef[]
  tool_choice?: { type: 'tool'; name: string }
  temperature?: number
}

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
}

export class AnthropicError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function callMessages(body: MessagesRequest): Promise<ContentBlock[]> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new AnthropicError(500, 'ANTHROPIC_API_KEY is not set')
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': API_VERSION },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new AnthropicError(res.status, text.slice(0, 500))
  }
  const data = (await res.json()) as { content?: ContentBlock[] }
  return data.content ?? []
}

/** 강제 tool_use 응답에서 입력 JSON 추출 */
export function toolInput(blocks: ContentBlock[], name: string): unknown {
  return blocks.find((b) => b.type === 'tool_use' && b.name === name)?.input ?? null
}

export function textOf(blocks: ContentBlock[]): string {
  return blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n')
    .trim()
}
