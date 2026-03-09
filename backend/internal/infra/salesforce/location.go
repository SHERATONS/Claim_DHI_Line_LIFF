package salesforce

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/SHERATONS/backend/internal/domain"
)

type LocationRepo struct{ client *Client }

func NewLocationRepo(c *Client) *LocationRepo { return &LocationRepo{client: c} }

type sfLocationResponse struct {
	Success bool             `json:"success"`
	Data    []sfLocationItem `json:"data"`
}

type sfLocationItem struct {
	Text    string `json:"text"`
	ID      string `json:"id"`
	Zipcode string `json:"zipcode,omitempty"`
}

func (r *LocationRepo) GetLocations(_ context.Context, locationType, parentID string) ([]domain.Location, error) {
	reqURL := fmt.Sprintf("%s/services/apexrest/liff/locations?type=%s", r.client.cfg.InstanceURL, locationType)
	if parentID != "" {
		reqURL += "&parentId=" + parentID
	}

	log.Printf("[Location] Fetching %s (parentId=%s)", locationType, parentID)

	body, err := r.client.callSFAPI(func(accessToken string) (*http.Request, error) {
		req, err := http.NewRequest("GET", reqURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		return req, nil
	})
	if err != nil {
		return nil, fmt.Errorf("location fetch failed: %w", err)
	}

	var resp sfLocationResponse
	if err := unmarshalSFResponse(body, &resp); err != nil {
		return nil, err
	}

	log.Printf("[Location] Got %d results for %s", len(resp.Data), locationType)

	locations := make([]domain.Location, len(resp.Data))
	for i, item := range resp.Data {
		locations[i] = domain.Location{Text: item.Text, ID: item.ID, Zipcode: item.Zipcode}
	}
	return locations, nil
}
