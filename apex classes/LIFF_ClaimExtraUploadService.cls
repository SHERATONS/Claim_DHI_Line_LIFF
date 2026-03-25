/**
 * Apex REST Service for looking up Case information by Notification Number.
 * Used by the Go backend for the Extra Upload feature.
 *
 * Endpoint: GET /services/apexrest/liff/claims/extra-upload?notificationNo=...
 */
@RestResource(urlMapping='/liff/claims/extra-upload/*')
global with sharing class LIFF_ClaimExtraUploadService {
    
    global class CaseResponse {
        public Boolean success;
        public CaseData data;
        public String error;
    }

    global class CaseData {
        public String caseId;
        public String caseNumber;
    }

    @HttpGet
    global static void getCaseByNotificationNo() {
        CaseResponse response = new CaseResponse();
        RestResponse res = RestContext.response;
        RestRequest req = RestContext.request;
        
        String notificationNo = req.params.get('notificationNo');

        if (String.isBlank(notificationNo)) {
            res.statusCode = 400;
            response.success = false;
            response.error = 'notificationNo parameter is required';
            res.responseBody = Blob.valueOf(JSON.serialize(response));
            return;
        }

        try {
            List<Case> cases = [
                SELECT Id, CaseNumber 
                FROM Case 
                WHERE DPC_NotificationNo__c = :notificationNo 
                LIMIT 1
            ];

            if (cases.isEmpty()) {
                res.statusCode = 404;
                response.success = false;
                response.error = 'Case not found for notificationNo: ' + notificationNo;
            } else {
                res.statusCode = 200;
                response.success = true;
                CaseData data = new CaseData();
                data.caseId = cases[0].Id;
                data.caseNumber = cases[0].CaseNumber;
                response.data = data;
            }
        } catch (Exception e) {
            res.statusCode = 500;
            response.success = false;
            response.error = e.getMessage();
        }

        res.addHeader('Content-Type', 'application/json');
        res.responseBody = Blob.valueOf(JSON.serialize(response));
    }
}
