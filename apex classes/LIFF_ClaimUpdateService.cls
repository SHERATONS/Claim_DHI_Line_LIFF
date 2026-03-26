@RestResource(urlMapping='/liff/claims/update/*')
global without sharing class LIFF_ClaimUpdateService {

    @HttpPatch
    global static void updateCase() {
        RestRequest req = RestContext.request;

        // Parse JSON body
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

        String notificationNo = (String) body.get('notificationNo');
        String aiSummary = (String) body.get('aiSummary');

        if (String.isBlank(notificationNo) || String.isBlank(aiSummary)) {
            if (RestContext.response != null) {
                RestContext.response.statusCode = 400;
            }
            return;
        }

        List<Case> cases = [
            SELECT Id, DPC_CauseofDamageInformation__c
            FROM Case
            WHERE DPC_NotificationNo__c = :notificationNo
            LIMIT 1
        ];

        if (cases.isEmpty()) {
            if (RestContext.response != null) {
                RestContext.response.statusCode = 404;
            }
            return;
        }

        Case c = cases[0];
        String original = c.DPC_CauseofDamageInformation__c != null
            ? c.DPC_CauseofDamageInformation__c
            : '';

        // Append AI summary with spacing
        c.DPC_CauseofDamageInformation__c = original + '\n\n[AI Analysis Summary]:\n' + aiSummary;

        update c;
    }
}
