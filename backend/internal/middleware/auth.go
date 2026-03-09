package middleware

import (
	"fmt"
	"log"
	"strings"

	"github.com/SHERATONS/backend/internal/domain"
	"github.com/SHERATONS/backend/pkg/httpresponse"
	"github.com/gin-gonic/gin"
)

// Auth returns a Gin middleware that verifies the LIFF access token.
func Auth(verifier domain.AuthVerifier, skipAuth bool) gin.HandlerFunc {
	if skipAuth {
		log.Println("[AUTH] SKIP_LIFF_AUTH=true — LIFF token verification is DISABLED")
	}

	return func(c *gin.Context) {
		if skipAuth {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			httpresponse.Unauthorized(c, fmt.Errorf("missing or invalid Authorization header"))
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")

		if err := verifier.Verify(c.Request.Context(), token); err != nil {
			httpresponse.Unauthorized(c, err)
			return
		}

		c.Next()
	}
}
