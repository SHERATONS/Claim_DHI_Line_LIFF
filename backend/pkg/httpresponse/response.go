package httpresponse

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK sends 200 with { "success": true, "data": data }.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

// BadRequest sends 400 with { "error": msg }.
func BadRequest(c *gin.Context, err error) {
	c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
}

// InternalError sends 500 with { "error": msg }.
func InternalError(c *gin.Context, err error) {
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

// Unauthorized sends 401 with { "error": msg }.
func Unauthorized(c *gin.Context, err error) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
}
