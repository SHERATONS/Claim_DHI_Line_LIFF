package handler

import (
	"fmt"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

type PolicyHandler struct {
	repo domain.PolicyRepository
}

func NewPolicyHandler(repo domain.PolicyRepository) *PolicyHandler {
	return &PolicyHandler{repo: repo}
}

type policyRequest struct {
	PolicyNo string `json:"policyNo" binding:"required"`
}

func (h *PolicyHandler) LookupPolicy(c *gin.Context) {
	var req policyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpresponse.BadRequest(c, fmt.Errorf("invalid request body: %w", err))
		return
	}

	policy, err := h.repo.LookupPolicy(c.Request.Context(), req.PolicyNo)
	if err != nil {
		httpresponse.InternalError(c, err)
		return
	}

	httpresponse.OK(c, policy)
}
