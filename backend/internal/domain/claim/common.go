package claim

// ClaimResult is the shared result type returned by all claim submission repositories.
type ClaimResult struct {
	Success        bool   `json:"success"`
	NotificationNo string `json:"notificationNo,omitempty"`
	CaseNumber     string `json:"caseNumber,omitempty"`
	CaseId         string `json:"caseId,omitempty"`
	Error          string `json:"error,omitempty"`
}
