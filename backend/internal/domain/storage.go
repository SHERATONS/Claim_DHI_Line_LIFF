package domain

import (
	"context"
	"io"
)

type StorageRepository interface {
	SaveFile(ctx context.Context, objectName string, data []byte, mimeType string) (string, error)
	StreamFile(ctx context.Context, objectName string, src io.Reader, mimeType string) (string, error)
	ReadFile(ctx context.Context, objectName string) ([]byte, error)
}