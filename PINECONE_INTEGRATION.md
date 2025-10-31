# Integrating Pinecone Vector Database with Pottery Bot

This guide explains how to integrate your existing Pinecone vector database containing pottery embeddings into the Mastra Pottery Bot.

## Prerequisites

✅ A Pinecone account with an existing index containing pottery data
✅ Pottery embeddings already stored in Pinecone
✅ Pinecone API key
✅ OpenAI API key (for generating query embeddings)

## Step 1: Install Dependencies

The required packages have been added to your project:

```bash
npm install @pinecone-database/pinecone openai
```

## Step 2: Configure Environment Variables

Create or update your `.env` file with the following variables:

```bash
# OpenAI API Key (required for embeddings and the agent)
OPENAI_API_KEY=sk-your-openai-api-key

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=pottery-knowledge  # Replace with your actual index name
PINECONE_NAMESPACE=                     # Optional: leave empty if not using namespaces
```

### How to get your Pinecone credentials:

1. Log in to [Pinecone Console](https://app.pinecone.io/)
2. Select your project
3. Go to "API Keys" section
4. Copy your API key
5. Note your index name from the "Indexes" section

## Step 3: Understand the Integration

The pottery tool (`src/mastra/tools/pottery-tool.ts`) now includes:

### ✅ Automatic Pinecone Detection
- If `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` are set, it uses Pinecone
- Otherwise, it falls back to the mock knowledge base

### ✅ Vector Similarity Search
```typescript
// The tool automatically:
1. Converts user query to embeddings using OpenAI
2. Searches Pinecone for similar vectors
3. Returns the most relevant results with scores
4. Filters results by similarity threshold (>0.7)
```

### ✅ Metadata Handling
The tool expects your Pinecone vectors to have metadata in one of these formats:

**Option 1: Topic + Content**
```json
{
  "topic": "Wheel Throwing Basics",
  "content": "Wheel throwing is a pottery technique where..."
}
```

**Option 2: Title + Text**
```json
{
  "title": "Wheel Throwing Basics",
  "text": "Wheel throwing is a pottery technique where..."
}
```

## Step 4: Verify Your Pinecone Index Structure

Your Pinecone index should ideally have:

- **Dimensions**: Matching your embedding model (e.g., 1536 for `text-embedding-3-small`)
- **Metric**: Cosine similarity (recommended for semantic search)
- **Metadata**: Each vector should include text content

### Example Pinecone vector structure:

```python
# Example of what your Pinecone data might look like
{
  "id": "pottery-001",
  "values": [0.123, 0.456, ...],  # 1536-dimensional embedding
  "metadata": {
    "topic": "Clay Types",
    "content": "There are three main types of clay...",
    "source": "pottery-handbook.pdf",
    "page": 12
  }
}
```

## Step 5: Customize the Search (Optional)

You can customize the search behavior by editing `src/mastra/tools/pottery-tool.ts`:

### Adjust Similarity Threshold
```typescript
// Line ~93
.filter(match => match.score && match.score > 0.7)  // Change 0.7 to your preference
```

- **0.7-0.8**: Good balance (default)
- **0.8-0.9**: More strict, fewer but highly relevant results
- **0.6-0.7**: More lenient, more results but potentially less relevant

### Change Embedding Model
```typescript
// Line ~77
const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-3-small',  // Options:
  // 'text-embedding-3-small' - Fast, cost-effective (1536 dims)
  // 'text-embedding-3-large' - More accurate (3072 dims)
  // 'text-embedding-ada-002' - Legacy model (1536 dims)
  input: query,
});
```

**Note**: Make sure the embedding model matches what you used to create your Pinecone vectors!

### Use Namespaces (Optional)
If your Pinecone index uses namespaces:

```bash
# In .env
PINECONE_NAMESPACE=pottery-general
```

## Step 6: Test the Integration

### Method 1: Run the dev server
```bash
npm run dev
```

Then test via the Mastra Studio UI or API:

```bash
curl -X POST http://localhost:4111/api/agents/potteryAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What are the different types of clay?"}]
  }'
```

### Method 2: Check the logs
When the agent uses the pottery search tool, you'll see logs showing:
- Query sent to Pinecone
- Number of results returned
- Similarity scores
- Any errors (e.g., if Pinecone isn't configured)

## Step 7: Troubleshooting

### Error: "Cannot find module '@pinecone-database/pinecone'"
```bash
npm install @pinecone-database/pinecone openai
```

### Error: "No relevant information found"
**Possible causes:**
1. Similarity threshold too high → Lower it in the code
2. Query embeddings don't match index embeddings → Check embedding model
3. Index is empty or has different metadata structure

### Error: "Pinecone API error"
**Check:**
1. API key is correct in `.env`
2. Index name matches your Pinecone index
3. Your Pinecone plan has available quota
4. Network connectivity

### Fallback to Mock Data
If you see: `"Using mock knowledge base"` in logs:
- Pinecone is not configured or failed
- Check your environment variables
- The agent will still work using the built-in knowledge base

## Step 8: Advanced Configuration

### Add Filtering by Metadata
```typescript
// In searchPineconeKnowledge function
const queryResponse = await index.namespace(PINECONE_NAMESPACE).query({
  vector: queryEmbedding,
  topK: maxResults,
  includeMetadata: true,
  filter: {
    // Example: Only search specific categories
    "category": { "$eq": "techniques" }
  }
});
```

### Hybrid Search (Keyword + Vector)
For even better results, combine vector search with keyword filtering:

```typescript
filter: {
  "$and": [
    { "category": { "$eq": "techniques" } },
    { "difficulty": { "$in": ["beginner", "intermediate"] } }
  ]
}
```

## Step 9: Deploy to Mastra Cloud

When deploying to Mastra Cloud:

1. Push your code to GitHub
2. In Mastra Cloud dashboard, add environment variables:
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `PINECONE_NAMESPACE` (if used)

3. Deploy - Mastra Cloud will use your Pinecone database automatically

## Metadata Format Recommendations

For best results, structure your Pinecone metadata like this:

```json
{
  "topic": "Short title/heading",
  "content": "The actual text content (1-3 paragraphs)",
  "source": "Source document name",
  "category": "techniques|materials|tools|history|troubleshooting",
  "difficulty": "beginner|intermediate|advanced",
  "tags": ["wheel-throwing", "centering", "clay"]
}
```

This allows for:
- Clear topic headers in responses
- Rich content for answers
- Filtering by category/difficulty
- Better search relevance

## Expected Performance

With a well-structured Pinecone index:
- **Search latency**: 100-300ms per query
- **Accuracy**: >90% relevance with proper embeddings
- **Scale**: Handles millions of vectors efficiently

## Next Steps

1. ✅ Configure your `.env` file
2. ✅ Test locally with `npm run dev`
3. ✅ Verify search results quality
4. ✅ Adjust similarity threshold if needed
5. ✅ Deploy to Mastra Cloud

## Support

If you encounter issues:
- Check Pinecone documentation: https://docs.pinecone.io/
- Mastra documentation: https://mastra.ai/docs
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings

---

**Your Pottery Bot is now powered by your rich Pinecone vector database! 🏺🚀**
