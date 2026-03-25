package handler

import (
	"errors"
	"io"
	"net/http"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/internal/domain/claim"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type ContentHandler struct {
	generator domain.ContentGenerator
}

func NewContentHandler(generator domain.ContentGenerator) *ContentHandler {
	return &ContentHandler{generator: generator}
}

func (h *ContentHandler) GenerateContent(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		httpresponse.BadRequest(c, errors.New("failed to parse multipart form. Is the content type multipart/form-data?"))
		return
	}

	fileHeaders, ok := form.File["files"]
	if !ok || len(fileHeaders) == 0 {
		fileHeaders, ok = form.File["file"] // Support fallback to "file" key
		if !ok || len(fileHeaders) == 0 {
			httpresponse.BadRequest(c, errors.New("no files uploaded under 'files' or 'file' key"))
			return
		}
	}

	var files []domain.FileInput
	for _, fileHeader := range fileHeaders {
		f, err := fileHeader.Open()
		if err != nil {
			httpresponse.InternalError(c, err)
			return
		}
		
		data, err := io.ReadAll(f)
		f.Close()
		if err != nil {
			httpresponse.InternalError(c, err)
			return
		}

		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = http.DetectContentType(data)
		}

		files = append(files, domain.FileInput{
			Data:     data,
			MimeType: mimeType,
		})
	}

	content, err := h.generator.GenerateContent(c.Request.Context(), files)
	if err != nil {
		httpresponse.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"content": content,
		},
	})
}

func (h *ContentHandler) AnalyzeClaimTest(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		httpresponse.BadRequest(c, errors.New("failed to parse multipart form"))
		return
	}

	req := claim.FRIARClaimRequest{
		PolicyNo:     c.PostForm("policyNo"),
		ContactId:    c.PostForm("contactId"),
		PolicyHolder: c.PostForm("policyHolder"),
	}

	fileHeaders := c.Request.MultipartForm.File["files"]
	if len(fileHeaders) == 0 {
		fileHeaders = c.Request.MultipartForm.File["file"]
	}

	var files []domain.FileInput
	for _, fileHeader := range fileHeaders {
		f, err := fileHeader.Open()
		if err != nil {
			continue
		}
		data, err := io.ReadAll(f)
		f.Close()
		if err != nil {
			continue
		}

		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = http.DetectContentType(data)
		}

		files = append(files, domain.FileInput{
			Data:     data,
			MimeType: mimeType,
			Filename: fileHeader.Filename,
		})
	}

	if len(files) == 0 {
		httpresponse.BadRequest(c, errors.New("no valid files provided"))
		return
	}

	analysis, err := h.generator.AnalyzeClaim(c.Request.Context(), req, files)
	if err != nil {
		httpresponse.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    analysis,
	})
}

func (h *ContentHandler) SearchFlightDetails(c *gin.Context) {
	flightNumber := c.Query("flightNumber")
	if flightNumber == "" {
		httpresponse.BadRequest(c, errors.New("flightNumber is required"))
		return
	}

	details, err := h.generator.SearchFlightDetails(c.Request.Context(), flightNumber)
	if err != nil {
		httpresponse.InternalError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"details": details,
		},
	})
}
