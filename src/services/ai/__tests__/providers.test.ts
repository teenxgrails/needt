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
    const fetchMock = mockFetchOnce({
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
  });

  it("streams OpenAI-compatible SSE chat deltas", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"Hel"}}]}',
          'data: {"choices":[{"delta":{"content":"lo"}}]}',
          "data: [DONE]",
          "",
        ].join("\n\n"),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    );
    const provider = new OpenAIProvider({
      provider: "OPENAI",
      apiKey: "test-key",
    });

    await expect(collect(provider.streamChat(chatRequest))).resolves.toBe(
      "Hello"
    );
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
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        [
          'data: {"type":"content_block_delta","delta":{"text":"Sch"}}',
          'data: {"type":"content_block_delta","delta":{"text":"eduled"}}',
          "",
        ].join("\n\n"),
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    );
    const provider = new AnthropicProvider({
      provider: "ANTHROPIC",
      apiKey: "test-key",
    });

    await expect(collect(provider.streamChat(chatRequest))).resolves.toBe(
      "Scheduled"
    );
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
