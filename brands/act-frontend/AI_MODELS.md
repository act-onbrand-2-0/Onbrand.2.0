# AI Model Configuration

## Available Models

The ACT 2.0 platform supports multiple AI models for brand guideline extraction and content generation:

### 1. **Google Gemini 2.0 Flash** (Default)
- **Model ID**: `gemini`
- **Provider**: Google AI
- **Best for**: Fast, cost-effective processing with good quality
- **API Key Required**: `GOOGLE_GENERATIVE_AI_API_KEY`

### 2. **OpenAI GPT-4o**
- **Model ID**: `gpt4o`
- **Provider**: OpenAI
- **Best for**: Highest quality output, complex reasoning
- **API Key Required**: `OPENAI_API_KEY`

### 3. **OpenAI GPT-4o Mini**
- **Model ID**: `gpt4oMini`
- **Provider**: OpenAI
- **Best for**: Faster, more cost-effective than GPT-4o
- **API Key Required**: `OPENAI_API_KEY`

### 4. **OpenAI GPT-5** (Forward-Compatible)
- **Model ID**: `gpt5`
- **Provider**: OpenAI
- **Best for**: Next-generation capabilities (when released)
- **API Key Required**: `OPENAI_API_KEY`
- **Status**: ⏳ Not yet publicly available - configuration is ready for when OpenAI releases it

### 5. **OpenAI GPT-5 Mini** (Forward-Compatible)
- **Model ID**: `gpt5Mini`
- **Provider**: OpenAI
- **Best for**: Efficient next-gen processing (when released)
- **API Key Required**: `OPENAI_API_KEY`
- **Status**: ⏳ Not yet publicly available - configuration is ready for when OpenAI releases it

### 6. **Claude 3.5 Sonnet** (Recommended)
- **Model ID**: `claude`
- **Provider**: Anthropic
- **Best for**: Highest quality extraction, complex reasoning, structured output
- **API Key Required**: `ANTHROPIC_API_KEY`
- **Model**: `claude-3-5-sonnet-20241022`
- **Note**: Latest stable Claude model with excellent extraction quality

### 7. **Claude 3 Opus**
- **Model ID**: `claudeOpus`
- **Provider**: Anthropic
- **Best for**: Most capable Claude model for complex tasks
- **API Key Required**: `ANTHROPIC_API_KEY`
- **Model**: `claude-3-opus-20240229`

### 8. **Claude 3.5 Haiku**
- **Model ID**: `claudeHaiku`
- **Provider**: Anthropic
- **Best for**: Fast, cost-effective processing
- **API Key Required**: `ANTHROPIC_API_KEY`
- **Model**: `claude-3-5-haiku-20241022`

## Configuration

### Environment Variable Method (Recommended)

Set the default model in your `.env` file:

```bash
# Choose one: gemini | gpt4o | gpt4oMini | gpt5 | gpt5Mini | claude | claudeOpus | claudeHaiku
AI_MODEL=claude  # Claude 3.5 Sonnet - Recommended for best quality
```

This will be used as the default for all AI operations unless overridden programmatically.

### Programmatic Method

You can override the model for specific operations:

```typescript
import { extractGuidelines, checkBrandCompliance, generateOnBrandContent } from '@/lib/ai/agent';

// Extract guidelines using GPT-4o
const extraction = await extractGuidelines(
  documentContent,
  brandName,
  'gpt4o'  // Override default model
);

// Check compliance using Gemini
const result = await checkBrandCompliance(
  content,
  'copy',
  guidelines,
  'gemini'  // Override default model
);

// Generate content using GPT-4o Mini
const generated = await generateOnBrandContent(
  prompt,
  'headline',
  guidelines,
  { variations: 3 },
  'gpt4oMini'  // Override default model
);
```

## API Keys Setup

Make sure you have the required API keys in your `.env` file:

```bash
# For Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_here

# For OpenAI models (GPT-4o, GPT-4o Mini)
OPENAI_API_KEY=sk-your_openai_key_here
```

## Model Comparison

| Feature | Gemini 2.0 Flash | GPT-4o | GPT-4o Mini |
|---------|------------------|---------|-------------|
| Speed | ⚡⚡⚡ Very Fast | ⚡⚡ Fast | ⚡⚡⚡ Very Fast |
| Quality | ⭐⭐⭐ Good | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |
| Cost | 💰 Low | 💰💰💰 High | 💰💰 Medium |
| Context Window | 1M tokens | 128K tokens | 128K tokens |
| Best Use Case | Large documents, fast extraction | Complex analysis, highest quality | Balanced performance |

## Recommendations

### For Brand Guideline Extraction
- **Large PDFs (>50 pages)**: Use `gemini` for speed and large context window
- **Complex/Technical Documents**: Use `gpt4o` for best accuracy
- **Standard Documents**: Use `gpt4oMini` for good balance

### For Content Generation
- **Marketing Copy**: Use `gpt4o` for most creative output
- **Social Media**: Use `gpt4oMini` for quick, good quality
- **Bulk Generation**: Use `gemini` for cost efficiency

### For Brand Compliance Checking
- **Detailed Analysis**: Use `gpt4o`
- **Quick Checks**: Use `gpt4oMini` or `gemini`

## Testing Different Models

To test which model works best for your use case:

1. Set `AI_MODEL=gemini` in `.env` and upload a document
2. Note the extraction quality and speed
3. Change to `AI_MODEL=gpt4o` and upload the same document
4. Compare results and choose your preferred model

## Cost Considerations

Approximate costs per 1M tokens (as of Dec 2024):

- **Gemini 2.0 Flash**: ~$0.075 input / $0.30 output
- **GPT-4o**: ~$2.50 input / $10.00 output
- **GPT-4o Mini**: ~$0.15 input / $0.60 output

For a typical 50-page brand guidelines PDF (~50K tokens):
- Gemini: ~$0.004
- GPT-4o: ~$0.13
- GPT-4o Mini: ~$0.008

## Troubleshooting

### Model Not Working
1. Check that the required API key is set in `.env`
2. Verify the model name is correct: `gemini`, `gpt4o`, or `gpt4oMini`
3. Check API key permissions and quota

### Slow Performance
- Try switching to `gemini` or `gpt4oMini` for faster processing
- Check your internet connection
- Verify API rate limits aren't being hit

### Poor Quality Results
- Try switching to `gpt4o` for better quality
- Ensure your brand guidelines document is clear and well-formatted
- Check that the document language is supported
