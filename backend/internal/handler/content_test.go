package handler_test

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/internal/domain/claim"
	"github.com/SHERATONS/backend/internal/handler"
	"github.com/gin-gonic/gin"
)

type mockContentGenerator struct {
	generateContentFunc func(ctx context.Context, files []domain.FileInput) (string, error)
}

func (m *mockContentGenerator) GenerateContent(ctx context.Context, files []domain.FileInput) (string, error) {
	if m.generateContentFunc != nil {
		return m.generateContentFunc(ctx, files)
	}
	return "", nil
}

func (m *mockContentGenerator) AnalyzeClaim(ctx context.Context, form claim.FRIARClaimRequest, files []domain.FileInput) (*domain.ClaimAnalysisResult, error) {
	return &domain.ClaimAnalysisResult{}, nil
}

func setupTestServer() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestContentHandler_GenerateContent(t *testing.T) {
	mockGen := &mockContentGenerator{}
	h := handler.NewContentHandler(mockGen)

	r := setupTestServer()
	r.POST("/api/generate", h.GenerateContent)

	tests := []struct {
		name           string
		files          map[string][]byte
		mockFunc       func(ctx context.Context, files []domain.FileInput) (string, error)
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "success",
			files: map[string][]byte{
				"test.jpg": []byte("fake image data"),
			},
			mockFunc: func(ctx context.Context, files []domain.FileInput) (string, error) {
				return "Extracted Content", nil
			},
			expectedStatus: http.StatusOK,
			expectedBody:   `"content":"Extracted Content"`,
		},
		{
			name:           "missing files",
			files:          nil,
			mockFunc:       nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `"error"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockGen.generateContentFunc = tt.mockFunc

			body := &bytes.Buffer{}
			var contentType string

			if tt.files != nil {
				writer := multipart.NewWriter(body)
				for filename, data := range tt.files {
					part, _ := writer.CreateFormFile("files", filename)
					part.Write(data)
				}
				writer.Close()
				contentType = writer.FormDataContentType()
			} else {
				// Empty body triggers missing multipart
				contentType = "multipart/form-data; boundary=missing"
			}

			req, _ := http.NewRequest(http.MethodPost, "/api/generate", body)
			req.Header.Set("Content-Type", contentType)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
			if !bytes.Contains(w.Body.Bytes(), []byte(tt.expectedBody)) {
				t.Errorf("expected body to contain %q, but got %q", tt.expectedBody, w.Body.String())
			}
		})
	}
}
