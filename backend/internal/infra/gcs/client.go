package gcs

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"cloud.google.com/go/storage"
)

type Client struct {
	client *storage.Client
	bucket string
}

func NewClient(ctx context.Context, bucketName string) (*Client, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}

	return &Client{
		client: client,
		bucket: bucketName,
	}, nil
}

func (c *Client) SaveFile(ctx context.Context, objectName string, data []byte, mimeType string) (string, error) {
	bucket := c.client.Bucket(c.bucket)
	obj := bucket.Object(objectName)

	writer := obj.NewWriter(ctx)
	writer.ContentType = mimeType

	if _, err := io.Copy(writer, bytes.NewReader(data)); err != nil {
		_ = writer.Close()
		return "", fmt.Errorf("failed to write to GCS: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close GCS writer: %w", err)
	}

	fullPath := fmt.Sprintf("gs://%s/%s", c.bucket, objectName)
	return fullPath, nil
}

func (c *Client) StreamFile(ctx context.Context, objectName string, src io.Reader, mimeType string) (string, error) {
	bucket := c.client.Bucket(c.bucket)
	obj := bucket.Object(objectName)

	writer := obj.NewWriter(ctx)
	writer.ContentType = mimeType

	if _, err := io.Copy(writer, src); err != nil {
		_ = writer.Close()
		return "", fmt.Errorf("failed to stream to GCS: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close GCS stream writer: %w", err)
	}

	fullPath := fmt.Sprintf("gs://%s/%s", c.bucket, objectName)
	return fullPath, nil
}

func (c *Client) ReadFile(ctx context.Context, objectName string) ([]byte, error) {
	bucket := c.client.Bucket(c.bucket)
	obj := bucket.Object(objectName)

	reader, err := obj.NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to open GCS reader: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read from GCS stream: %w", err)
	}
	return data, nil
}

func (c *Client) GetBucketName() string {
	return c.bucket
}
