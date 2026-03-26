package vertex

import (
	"testing"
)

func TestExtractJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "pure json",
			input:    `{"key": "value"}`,
			expected: `{"key": "value"}`,
		},
		{
			name:     "markdown json",
			input:    "```json\n" + `{"key": "value"}` + "\n```",
			expected: `{"key": "value"}`,
		},
		{
			name:     "leading and trailing text",
			input:    `Here is the result: {"key": "value"} Hope this helps!`,
			expected: `{"key": "value"}`,
		},
		{
			name:     "trailing thai text",
			input:    `{"key": "value"} นี่คือสรุป`,
			expected: `{"key": "value"}`,
		},
		{
			name:     "nested braces",
			input:    `The data is: {"nested": {"key": "value"}}`,
			expected: `{"nested": {"key": "value"}}`,
		},
		{
			name:     "no braces",
			input:    `some text without brackets`,
			expected: `some text without brackets`,
		},
		{
			name:     "unmatched braces - end before start",
			input:    ` } starts here { `,
			expected: ` } starts here { `,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractJSON(tt.input)
			if result != tt.expected {
				t.Errorf("extractJSON() = %v, want %v", result, tt.expected)
			}
		})
	}
}
