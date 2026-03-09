package salesforce

import (
	"net/http"
	"sync"
	"time"

	"github.com/SHERATONS/backend/internal/config"
)

// Client is the shared Salesforce HTTP client with token caching.
// All SF repository types hold a pointer to one shared Client instance.
type Client struct {
	cfg         config.SalesforceConfig
	httpClient  *http.Client
	mu          sync.Mutex
	cachedToken *tokenResponse
	tokenExpiry time.Time
}

// NewClient creates a new Salesforce client with the given configuration.
func NewClient(cfg config.SalesforceConfig) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}
