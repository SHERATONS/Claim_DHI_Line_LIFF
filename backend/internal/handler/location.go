package handler

import (
	"fmt"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type LocationHandler struct {
	repo domain.LocationRepository
}

func NewLocationHandler(repo domain.LocationRepository) *LocationHandler {
	return &LocationHandler{repo: repo}
}

func (h *LocationHandler) GetLocations(c *gin.Context) {
	locationType := c.Query("type")
	parentID := c.Query("parentId")

	validTypes := map[string]bool{
		"province":    true,
		"district":    true,
		"subdistrict": true,
	}
	if !validTypes[locationType] {
		httpresponse.BadRequest(c, fmt.Errorf("type must be one of: province, district, subdistrict"))
		return
	}
	if locationType != "province" && parentID == "" {
		httpresponse.BadRequest(c, fmt.Errorf("parentId is required for %s", locationType))
		return
	}

	locations, err := h.repo.GetLocations(c.Request.Context(), locationType, parentID)
	if err != nil {
		httpresponse.InternalError(c, err)
		return
	}

	httpresponse.OK(c, locations)
}
