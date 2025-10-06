/* IMPORT MODULE */
import "dotenv/config"
import { createGoogleGenerativeAI } from "@ai-sdk/google" // module ini bisa di analogikan seperti driver database di laravel
import { confirm, input, select } from "@inquirer/prompts"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { CreateMessageRequestSchema, Prompt, PromptMessage, Tool } from "@modelcontextprotocol/sdk/types.js"
import { generateText, jsonSchema, ToolSet } from "ai" // module ini bisa di analogikan seperti orm di laravel
/* IMPORT MODULE */


/* SETUP MCP CLIENT */
const mcpClient = new Client(
    {
        name: "text-client-video",
        version: "1.0.0"
    },
    { capabilities: { sampling: {} } }
)
/* SETUP MCP CLIENT */


/* SETUP CLIENT TRANSPORT */
// ini adalah cara komunikasi antara mcp client dengan mcp server
const transport = new StdioClientTransport({
    command: "node",
    args: ["build/server.js"],
    stderr: "ignore"
})
/* SETUP CLIENT TRANSPORT */


/* SETUP LLM GEMINI */
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || "",
})
/* SETUP LLM GEMINI */


/* EXTEND FUNCTION */
async function handleServerMessagePrompt(message: PromptMessage) {
    if (message.content.type !== "text") 
        return;

    console.log(message.content.text)
    const run = await confirm({
        message: "Would you like to run the above prompt",
        default: true,
    })

    if (!run) return

    const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: message.content.text,
    })

    return text
}

async function handleQuery(tools: Tool[]) {
    const query = await input({ message: "Enter your query" })

    const toolsFormat: ToolSet = {}
    for (const tool of tools) {
        toolsFormat[tool.name] = {
            description: tool.description,
            inputSchema: jsonSchema(tool.inputSchema),
            execute: async (args: Record<string, any>) => {
                return await mcpClient.callTool({
                    name: tool.name,
                    arguments: args,
                })
            },
        }
    }

    const { toolResults } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: query,
        tools: toolsFormat,
    })

    console.log(toolResults[0]?.output?.content[0]?.text || "Sorry, your question is outside our scope.")
}
/* EXTEND FUNCTION */


/* SETUP MAIN */
async function main() {
    await mcpClient.connect(transport) // untuk connect ke mcp server

    const [{ tools } ] = await Promise.all([
        mcpClient.listTools(),
    ]); // untuk mengambil daftar kemampuan yang ada di mcp server

    mcpClient.setRequestHandler(CreateMessageRequestSchema, async request => {
        const texts: string[] = []
        for (const message of request.params.messages) {
            const text = await handleServerMessagePrompt(message)
            if(text != null)
                texts.push(text)
        }

        return {
            role: "user",
            model: "gemini-2.0-flash",
            stopReason: "endTurn",
            content: {
                type: "text",
                text: texts.join("\n")
            }
        }
    })

    while (true) {
        await handleQuery(tools)
    }
}
main()
/* SETUP MAIN */

