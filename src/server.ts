/* IMPORT MODULE */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import z from "zod"
import fs from "node:fs/promises"
/* IMPORT MODULE */


/* SETUP MCP SERVER */
const mcpServer = new McpServer({
    name: "test-video",
    version: "1.0.0",
    capabilities: { tools: {} }
})
/* SETUP MCP SERVER */


/* LIST TOOL MCP */
mcpServer.tool(
    "create-user", // ini adalah slug dari tool
    "Create a new user in the database", // ini adalah deskripsi tool, ini yang membuat llm paham bahwa tujuan dari tool ini tuh untuk create user
    { // ini adalah schema dan validator dari parameter yang dibutuhkan oleh tool ini
        name: z.string(),
        email: z.string(),
        phone: z.string(),
        address: z.string(),
    }, 
    {
        title: 'Create User', // judul human-friendly untuk tool.
        readOnlyHint: false, // true -> Tool ini hanya membaca data, tidak mengubah state | false -> Tool ini mengubah state/data (insert, update, delete)
        destructiveHint: false, // true -> Tool ini bisa menghapus/merusak data (destructive) | false -> Aman, tidak menghapus data
        idempotentHint: false, // true -> Panggil berulang kali hasil akhirnya sama | false -> Panggil berulang kali hasilnya beda.
        openWorldHint: false, // true -> AI boleh “ngarang” input tambahan di luar schema | false -> Input harus persis sesuai schema, tidak boleh ada field lain
    }, 
    async (params) => { // event yang dijalankan ketika tool ini dipanggil
        try {
            const id = await createUser(params)
            return { // format return mcp ini tidak boleh asal-asalan
                content: [
                    { type: "text", text: `User ${id} created successfully` }
                ]
            }
        } catch (error) {
            return { // format return mcp tidak boleh asal-asalan
                content: [
                    { type: "text", text: `Failed to save user, message: ${error}` }
                ]
            }
        }
    }
)
/* LIST TOOL MCP */


/* FUNCTION CREATE USER */
type User = {
    id: Number,
    name: string,
    email: string,
    address: string,
    phone: string
}
async function createUser(user: Omit<User, "id">) {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then(m => m.default) as User[]

    const id = users.length + 1
    users.push({ id, ...user })

    await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 4))
    return id
}
/* FUNCTION CREATE USER */


/* FUNCTION MAIN */
async function main() {
    const transport = new StdioServerTransport()
    await mcpServer.connect(transport)
}
main()
/* FUNCTION MAIN */