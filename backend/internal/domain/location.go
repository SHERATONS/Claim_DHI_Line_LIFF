package domain

import "context"

type Location struct {
	Text    string `json:"text"`
	ID      string `json:"id"`
	Zipcode string `json:"zipcode,omitempty"`
}

type LocationRepository interface {
	GetLocations(ctx context.Context, locationType, parentID string) ([]Location, error)
}
