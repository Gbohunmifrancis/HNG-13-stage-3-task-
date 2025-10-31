# Glazion - Mastra AI Agents

This project contains AI agents built with Mastra framework, including a **Pottery Expert Agent** and a Weather Agent.

## 🏺 Pottery Bot Agent

The Pottery Bot is an intelligent agent that can answer questions about pottery, including:
- Clay types and properties
- Pottery techniques (wheel throwing, hand-building, etc.)
- Glazing and firing processes
- Troubleshooting common issues
- Tools and equipment

### Features

- **RAG-Powered**: Uses a Retrieval-Augmented Generation tool to search a pottery knowledge base
- **Memory**: Maintains conversation history for contextual responses
- **Accurate**: Always searches the knowledge base before answering questions

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.9.0
- npm or yarn
- A GitHub account (for deployment to Mastra Cloud)

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables (create a `.env` file):

```env
# OpenAI API Key (required for the agents to work)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Other API keys for tools
```

### Running Locally

Start the development server:

```bash
npm run dev
```

This will start the Mastra server with all agents available at `http://localhost:4111`

### Testing the Pottery Agent

Once the server is running, you can interact with the pottery agent through:

1. **Mastra Studio UI** (automatically opens in browser)
2. **API Endpoint**: `POST http://localhost:4111/api/agents/potteryAgent/generate`

Example API request:

```bash
curl -X POST http://localhost:4111/api/agents/potteryAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What are the different types of clay used in pottery?"
      }
    ]
  }'
```

## 📦 Project Structure

```
glazion/
├── src/
│   └── mastra/
│       ├── agents/
│       │   ├── pottery-agent.ts     # Pottery expert agent
│       │   └── weather-agent.ts     # Weather agent
│       ├── tools/
│       │   ├── pottery-tool.ts      # RAG search tool for pottery knowledge
│       │   └── weather-tool.ts      # Weather data fetching tool
│       ├── workflows/
│       │   └── weather-workflow.ts  # Weather workflow
│       ├── scorers/
│       │   └── weather-scorer.ts    # Evaluation scorers
│       └── index.ts                 # Main Mastra configuration
├── package.json
└── README.md
```

## 🌐 Deploying to Mastra Cloud

### Step 1: Prepare Your Repository

1. Ensure all your code is committed:

```bash
git add .
git commit -m "Add pottery bot agent"
git push origin main
```

### Step 2: Connect to Mastra Cloud

1. Visit [https://mastra.ai/cloud](https://mastra.ai/cloud)
2. Sign in with your GitHub account
3. Click "New Project" or "Deploy"
4. Select your repository (e.g., `Gbohunmifrancis/HNG-13-stage-3-task-`)
5. Mastra Cloud will automatically detect your Mastra project

### Step 3: Configure Environment Variables

In the Mastra Cloud dashboard, add your environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key

### Step 4: Deploy

Click "Deploy" and Mastra Cloud will:
- Build your TypeScript project
- Deploy all your agents
- Provide you with API endpoints

### Step 5: Get Your API Endpoint

After deployment, you'll receive a public URL like:
```
https://your-project.mastra.ai/api/agents/potteryAgent/generate
```

This is the webhook URL you can use to connect to `staging.telex.im` or any other platform.

## 🔗 Using the Deployed Agent

### API Endpoint

Once deployed, your pottery agent will be available at:

```
POST https://your-project.mastra.ai/api/agents/potteryAgent/generate
```

### Request Format

```json
{
  "messages": [
    {
      "role": "user",
      "content": "How do I fix cracks in my pottery?"
    }
  ]
}
```

### Response Format

```json
{
  "text": "Cracks in pottery can occur for several reasons...",
  "toolCalls": [...],
  "toolResults": [...]
}
```

## 🛠️ Customizing the Pottery Agent

### Adding More Knowledge

To expand the pottery knowledge base, edit `src/mastra/tools/pottery-tool.ts` and add more entries to the `potteryKnowledge` array.

### Upgrading to a Real RAG System

For production use, replace the mock knowledge base with:

1. **Vector Database**: Pinecone, Weaviate, or Chroma
2. **Embeddings**: OpenAI embeddings or similar
3. **Document Processing**: Load and chunk your pottery documentation

Example with Pinecone:

```typescript
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

// Initialize clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate embeddings and search
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: query,
});

const results = await pinecone.index('pottery-knowledge').query({
  vector: embedding.data[0].embedding,
  topK: maxResults,
  includeMetadata: true,
});
```

## 📚 Available Agents

### 1. Pottery Expert (`potteryAgent`)
- **Purpose**: Answer questions about pottery
- **Tools**: `potterySearchTool` (RAG search)
- **Model**: GPT-4o-mini

### 2. Weather Agent (`weatherAgent`)
- **Purpose**: Provide weather information and activity suggestions
- **Tools**: `weatherTool` (weather API)
- **Model**: GPT-4o-mini

## 🧪 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## 📝 Notes

- The current pottery knowledge base is a simple mock. For production, implement a proper RAG system with vector embeddings.
- The agent uses GPT-4o-mini for cost efficiency. Upgrade to GPT-4o for better performance.
- Memory is persisted to a local SQLite database (`mastra.db`). In production, consider using a cloud database.

## 🤝 Contributing

Feel free to add more pottery knowledge, improve the RAG implementation, or add new features!

## 📄 License

ISC

## 🔗 Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra Cloud](https://mastra.ai/cloud)
- [OpenAI API](https://platform.openai.com/)
