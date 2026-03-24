package vertex

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/SHERATONS/backend/internal/domain"
	"google.golang.org/genai"
)

// Ensure GeminiClient implements domain.ContentGenerator at compile time
var _ domain.ContentGenerator = (*GeminiClient)(nil)

type GeminiClient struct {
	client       *genai.Client
	systemPrompt string
}

func NewGeminiClient(ctx context.Context, projectID, location, systemPrompt string) (*GeminiClient, error) {
	config := &genai.ClientConfig{
		Project:  projectID,
		Location: location,
		Backend:  genai.BackendVertexAI,
	}

	client, err := genai.NewClient(ctx, config)
	if err != nil {
		return nil, err
	}

	return &GeminiClient{
		client:       client,
		systemPrompt: systemPrompt,
	}, nil
}

func (g *GeminiClient) GenerateContent(ctx context.Context, files []domain.FileInput) (string, error) {
	if len(files) == 0 {
		return "", fmt.Errorf("no files provided for generation")
	}

	var parts []*genai.Part
	for _, f := range files {
		parts = append(parts, &genai.Part{
			InlineData: &genai.Blob{
				MIMEType: f.MimeType,
				Data:     f.Data,
			},
		})
	}

	config := &genai.GenerateContentConfig{}
	if g.systemPrompt != "" {
		// Ensure SystemInstruction is a *Content pointer containing text parts
		config.SystemInstruction = &genai.Content{
			Parts: []*genai.Part{
				{Text: g.systemPrompt},
			},
		}
	}

	content := &genai.Content{
		Role:  "user",
		Parts: parts,
	}

	resp, err := g.client.Models.GenerateContent(ctx, "gemini-3.0-flash", []*genai.Content{content}, config)
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", nil
	}

	part := resp.Candidates[0].Content.Parts[0]
	if part.Text != "" {
		return part.Text, nil
	}
	return fmt.Sprintf("%v", part), nil
}

func (g *GeminiClient) AnalyzeClaim(ctx context.Context, form any, files []domain.FileInput) (*domain.ClaimAnalysisResult, error) {
	if len(files) == 0 {
		return nil, fmt.Errorf("no files provided for analysis")
	}

	var parts []*genai.Part

	formBytes, _ := json.MarshalIndent(form, "", "  ")

	// 1. Add instructions and form data
	prompt := fmt.Sprintf(`Analyze all provided claim documents.

STRICT OUTPUT REQUIREMENT:
Return ONLY valid JSON. No explanation.

JSON SCHEMA:
{
  "fileNames": [
    {
      "original": "string",
      "new": "string",
      "category": "p | d | o",
      "confidence": "high | medium | low"
    }
  ],
  "verification": {
    "policyNo": "Match | Mismatch | Not Found",
    "contactId": "Match | Mismatch | Not Found",
    "policyHolder": "Match | Mismatch | Not Found"
  },
  "extractedData": {
    "policyNo": "string | Not Found",
    "contactId": "string | Not Found",
    "policyHolder": "string | Not Found"
  },
  "summary": "string (Thai language only)"
}

STRICT RULES:
1. Classification must follow SYSTEM rules exactly
2. If uncertain → choose "o" (never guess)
3. "d" overrides all categories if claim-related
4. Verification must be based ONLY on visible text
5. If value is partially visible or unclear → "Not Found"
6. JSON must be syntactically valid (no trailing commas)
7. The documents are primarily in Thai. You must proactively read, comprehend, and extract Thai text, Thai names, and Thai identifiers for verification.
8. For files categorized as "p" (policy documents), dynamically analyze the visual content of the document to generate a short, descriptive title in English (e.g., "id_card", "policy_schedule", "passport").
9. For "p" category files, the "new" field in the JSON MUST be formatted exactly as "p_{title_generated_from_content}.{extension}".

Frontend Form Data (JSON):
%s

Original File Names: 
`, string(formBytes))

	for _, f := range files {
		prompt += fmt.Sprintf("- %s\n", f.Filename)
	}

	parts = append(parts, &genai.Part{Text: prompt})

	// 2. Attach actual files
	for _, f := range files {
		parts = append(parts, &genai.Part{
			InlineData: &genai.Blob{
				MIMEType: f.MimeType,
				Data:     f.Data,
			},
		})
	}

	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
	}
	
	if g.systemPrompt != "" {
		config.SystemInstruction = &genai.Content{
			Parts: []*genai.Part{{Text: g.systemPrompt}},
		}
	}

	content := &genai.Content{
		Role:  "user",
		Parts: parts,
	}

	resp, err := g.client.Models.GenerateContent(ctx, "gemini-2.5-flash", []*genai.Content{content}, config)
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from Gemini")
	}

	part := resp.Candidates[0].Content.Parts[0]
	if part.Text == "" {
		return nil, fmt.Errorf("no text returned from Gemini")
	}

	var result domain.ClaimAnalysisResult
	if err := json.Unmarshal([]byte(part.Text), &result); err != nil {
		cleanText := strings.TrimPrefix(part.Text, "```json\n")
		cleanText = strings.TrimSuffix(cleanText, "\n```")
		cleanText = strings.TrimSpace(cleanText)
		
		if err2 := json.Unmarshal([]byte(cleanText), &result); err2 != nil {
			return nil, fmt.Errorf("failed to parse Gemini JSON: %w (raw: %s)", err2, part.Text)
		}
	}

	return &result, nil
}


