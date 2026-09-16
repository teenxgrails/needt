import {
  AnthropicProvider,
  CustomProvider,
  OpenAIProvider,
  createSchedulerAI,
} from "../providers";
import { AIChatRequest } from "../types";

const chatRequest: AIChatRequest = {
  systemPrompt: "You are Needt.",
  messages: [{ role: "user", content: "Create a task called plan week" }],
  tools: [
    {
      name: "create_task",
      description: "Create one planner task.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    },
  ],
};

function mockFetchOnce(payload: unknown, status = 200) {
  const fetchMock = jest.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
  global.fetch = fetchMock;
  return fetchMock;
}

async function collect(generator: AsyncGenerator<string>) {
  const chunks: string[] = [];
  for await (const chunk of generator) chunks.push(chunk);
  return chunks.join("");
}

describe("AI provider chat adapters", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps OpenAI-compatible tool calls into planner tool calls", async () => {
    const onUsage = jest.fn();
    const fetchMock = mockFetchOnce({
      usage: { prompt_tokens: 21, completion_tokens: 4 },
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: "create_task",
                  arguments: JSON.stringify({ title: "Plan week" }),
                },
              },
            ],
          },
        },
      ],
    });
    const provider = new OpenAIProvider({
      provider: "OPENAI",
      apiKey: "test-key",
      model: "gpt-test",
      onUsage,
    });

    await expect(provider.selectChatTool(chatRequest)).resolves.toEqual({
      name: "create_task",
      arguments: { title: "Plan week" },
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.openai.com/v1/chat/completions"
    );
    expect(body.tool_choice).toBe("auto");
    expect(body.tools[0].function.name).toBe("create_task");
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 21,
      outputTokens: 4,
    });
  });

  it("records usage from OpenAI-compatible JSON completions", async () => {
    const onUsage = jest.fn();
    mockFetchOnce({
      choices: [{ message: { content: '[{"title":"Plan week"}]' } }],
      usage: { prompt_tokens: 15, completion_tokens: 5 },
    });
    const provider = new OpenAIProvider({
      provider: "OPENAI",
      apiKey: "test-key",
      onUsage,
    });

    await expect(provider.parseTasks("Plan week")).resolves.toEqual([
      { title: "Plan week" },
    ]);
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 15,
      outputTokens: 5,
    });
  });

  it("streams OpenAI-compatible SSE chat deltas", async () => {
    const onUsage = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"Hel"}}]}',
          'data: {"choices":[{"delta":{"content":"lo"}}]}',
          'data: {"choices":[],"usage":{"prompt_tokens":9,"completion_tokens":2}}',
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    );
    const provider = new OpenAIProvider({
      provider: "OPENAI",
      apiKey: "test-key",
      onUsage,
    });

    await expect(collect(provider.streamChat(chatRequest))).resolves.toBe(
      "Hello"
    );
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 9,
      outputTokens: 2,
    });
    const fetchMock = global.fetch as jest.Mock;
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it("does not request streaming usage for BYOK providers", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        ['data: {"choices":[{"delta":{"content":"Hello"}}]}', ""].join(
          "\n\n"
        ),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    );
    const provider = new OpenAIProvider({
      provider: "OPENAI",
      apiKey: "user-key",
    });

    await expect(collect(provider.streamChat(chatRequest))).resolves.toBe(
      "Hello"
    );
    const fetchMock = global.fetch as jest.Mock;
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).not.toHaveProperty("stream_options");
  });

  it("maps Anthropic tool_use blocks into planner tool calls", async () => {
    mockFetchOnce({
      content: [
        {
          type: "tool_use",
          name: "create_task",
          input: { title: "Plan week" },
        },
      ],
    });
    const provider = new AnthropicProvider({
      provider: "ANTHROPIC",
      apiKey: "test-key",
    });

    await expect(provider.selectChatTool(chatRequest)).resolves.toEqual({
      name: "create_task",
      arguments: { title: "Plan week" },
    });
  });

  it("streams Anthropic content_block_delta text", async () => {
    const onUsage = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        [
          'data: {"type":"message_start","message":{"usage":{"input_tokens":13,"output_tokens":0}}}',
          'data: {"type":"content_block_delta","delta":{"text":"Sch"}}',
          'data: {"type":"content_block_delta","delta":{"text":"eduled"}}',
          'data: {"type":"message_delta","usage":{"output_tokens":3}}',
          "",
        ].join("\n\n"),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    );
    const provider = new AnthropicProvider({
      provider: "ANTHROPIC",
      apiKey: "test-key",
      onUsage,
    });

    await expect(collect(provider.streamChat(chatRequest))).resolves.toBe(
      "Scheduled"
    );
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 13,
      outputTokens: 3,
    });
  });

  it("uses Custom AI chat endpoints with optional bearer auth", async () => {
    const fetchMock = mockFetchOnce({
      name: "create_task",
      arguments: { title: "Plan week" },
    });
    const provider = new CustomProvider({
      provider: "CUSTOM",
      customUrl: "https://needt-ai.example/",
      apiKey: "custom-key",
    });

    await expect(provider.selectChatTool(chatRequest)).resolves.toEqual({
      name: "create_task",
      arguments: { title: "Plan week" },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://needt-ai.example/chat/tool"
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer custom-key",
    });
  });

  it("configures Grok and GLM as OpenAI-compatible providers", async () => {
    const grok = createSchedulerAI({ provider: "GROK", apiKey: "key" });
    const glm = createSchedulerAI({ provider: "GLM", apiKey: "key" });

    expect(grok.name).toBe("Grok");
    expect(glm.name).toBe("GLM");
  });
});
