# Using the Pottery Bot - Advanced Features Guide

## 🎤 Voice Input (Microphone)

The Mastra Playground automatically converts voice to text. When you click the microphone icon:

1. **Click the microphone icon** in the chat interface
2. **Speak your question** (e.g., "What are the different types of clay?")
3. **The voice is transcribed** automatically
4. **The agent responds** as if you typed the question

### How it works behind the scenes:
- Mastra uses speech-to-text (likely Web Speech API or similar)
- Your voice is converted to text
- The text is sent to the pottery agent
- The agent processes it normally

**No special code needed** - this is handled by the Mastra frontend!

---

## 📸 Image Upload

The pottery agent supports **vision capabilities** with GPT-4o models. You can upload images of:
- Pottery pieces
- Clay work in progress
- Glaze defects
- Studio setups
- Techniques you're trying

### How to use:

1. **Click the image upload icon** in the chat interface
2. **Select an image** from your device
3. **Add a question** (e.g., "What's wrong with this pottery piece?")
4. **The agent analyzes the image** and provides feedback

### Example questions with images:
- "What technique was used to make this pot?" + image of pot
- "Why did my glaze crack like this?" + image of cracked glaze
- "Is my centering correct?" + image of clay on wheel
- "How can I fix these cracks?" + image of cracked pottery

### Current Setup:
The pottery agent is using **GPT-4o-mini** which has limited vision capabilities. For better image analysis, you can upgrade to **GPT-4o** (full vision support).

### To enable better vision (optional):

Update `src/mastra/agents/pottery-agent.ts`:

```typescript
export const potteryAgent = new Agent({
  name: 'Pottery Expert',
  instructions: `...`,
  model: 'openai/gpt-4o', // Changed from gpt-4o-mini
  tools: { potterySearchTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});
```

**Note:** GPT-4o is more expensive but provides much better image analysis.

---

## 🔄 Workflows

Workflows allow you to create multi-step processes. The pottery workflow:

### Pottery Workflow Features:

1. **Categorizes** the question (materials, glazing, firing, techniques, etc.)
2. **Searches** Pinecone for 5 relevant results
3. **Formats** a comprehensive response with:
   - The answer
   - Category
   - Related topics
   - Number of sources

### How to use the workflow:

**In Mastra Playground:**
1. Go to http://localhost:4111/ or your deployed URL
2. Select "Workflows" tab (if available)
3. Choose "pottery-workflow"
4. Enter your question

**Via API:**

```powershell
# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:4111/api/workflows/pottery-workflow/execute" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"question": "What are the different types of clay?"}'
```

```bash
# Using curl (Git Bash or Linux)
curl -X POST http://localhost:4111/api/workflows/pottery-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the different types of clay?"}'
```

### Workflow vs Agent - When to use each:

**Use Agent (potteryAgent):**
- Conversational interactions
- Follow-up questions
- Memory of previous questions
- Voice and image input
- Real-time chat

**Use Workflow (potteryWorkflow):**
- Structured, consistent responses
- Multiple processing steps
- Batch processing
- Automated categorization
- API integrations

---

## 🌐 API Documentation (Swagger)

### Local Development:
```
http://localhost:4111/api/reference
```

### Production (Mastra Cloud):
```
https://your-project-name.mastra.ai/api/reference
```

The Swagger docs show all available endpoints:
- `/api/agents/potteryAgent/generate` - Chat with pottery agent
- `/api/agents/weatherAgent/generate` - Chat with weather agent
- `/api/workflows/pottery-workflow/execute` - Run pottery workflow
- `/api/workflows/weather-workflow/execute` - Run weather workflow

---

## 🔗 Available Endpoints

### Pottery Agent (with voice & image support)
```
POST /api/agents/potteryAgent/generate

Body:
{
  "messages": [
    {
      "role": "user",
      "content": "What are the different types of clay?",
      "image": "base64_encoded_image_optional"
    }
  ]
}
```

### Pottery Workflow
```
POST /api/workflows/pottery-workflow/execute

Body:
{
  "question": "How do I fix cracks in my pottery?"
}
```

---

## 🚀 Testing Multimodal Features

### Test Voice Input (in Playground):
1. Open http://localhost:4111/
2. Select "Pottery Expert" agent
3. Click microphone icon
4. Say: "Tell me about wheel throwing techniques"
5. Agent responds with transcribed text

### Test Image Upload (in Playground):
1. Open http://localhost:4111/
2. Select "Pottery Expert" agent
3. Click image upload icon
4. Upload a pottery image
5. Type: "What do you see in this image?"
6. Agent analyzes and responds

### Test Workflow (via API):
```powershell
Invoke-RestMethod -Uri "http://localhost:4111/api/workflows/pottery-workflow/execute" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"question": "What temperature should I fire stoneware?"}'
```

---

## 📊 Response Format

### Agent Response:
```json
{
  "text": "The pottery agent's answer...",
  "toolCalls": [...],
  "toolResults": [...],
  "usage": {...}
}
```

### Workflow Response:
```json
{
  "answer": "Formatted answer with categories...",
  "category": "materials",
  "relatedTopics": ["Clay preparation", "Clay storage"],
  "sources": 5
}
```

---

## 🎨 Production Deployment

After pushing to GitHub and deploying to Mastra Cloud:

1. **Swagger Docs:**
   ```
   https://your-project.mastra.ai/api/reference
   ```

2. **Pottery Agent API:**
   ```
   https://your-project.mastra.ai/api/agents/potteryAgent/generate
   ```

3. **Pottery Workflow API:**
   ```
   https://your-project.mastra.ai/api/workflows/pottery-workflow/execute
   ```

4. **Voice & Image:** Work automatically in the Mastra Cloud Playground UI

---

## 💡 Tips

1. **Voice works best with:** Short, clear questions
2. **Images work best with:** Good lighting, clear focus, multiple angles
3. **Workflows are best for:** Structured queries that need categorization
4. **Agents are best for:** Conversational, back-and-forth interactions

---

## 🔧 Troubleshooting

**Voice not working?**
- Check browser permissions for microphone
- Try a different browser (Chrome works best)

**Image not uploading?**
- Check file size (< 4MB recommended)
- Use common formats (JPG, PNG)
- For production, upgrade to GPT-4o for better vision

**Workflow not found?**
- Ensure it's registered in `src/mastra/index.ts`
- Restart dev server: `npm run dev`
- Check Mastra Cloud deployment logs

---

Happy pottery making! 🏺✨
