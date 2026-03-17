/**
 * Unit tests for LIFF_ClaimSubmitServiceCAREARCPM REST service.
 */
@isTest
private class LIFF_ClaimSubmitServiceCAREARCPMTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Account CAREAR');
        insert acc;

        Policy__c pol = new Policy__c(
            Name = 'POL-CAR-001',
            AccountId__c = acc.Id
        );
        insert pol;

        Contact con = new Contact(
            FirstName = 'Somchai',
            LastName = 'Jaidee',
            Phone = '0800000000',
            Email = 'somchai@test.com',
            AccountId = acc.Id
        );
        insert con;
    }

    private static String buildRequestBody(Map<String, Object> fields) {
        return JSON.serialize(fields);
    }

    private static Map<String, Object> callService(String jsonBody) {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        req.requestURI = '/services/apexrest/liff/claims/carearcpm/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);

        RestContext.request = req;
        RestContext.response = res;

        String responseJson = LIFF_ClaimSubmitServiceCAREARCPM.submitClaim();
        return (Map<String, Object>) JSON.deserializeUntyped(responseJson);
    }

    @isTest
    static void testSuccessLocationAndProject() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'notifierName' => 'Somying Rakdee',
            'phone' => '0812345678',
            'email' => 'somying@test.com',
            'incidentDateTime' => '2026-03-01 10:00',
            'lossPlace' => 'Old Place',
            'fullAddress' => 'New Full Address',
            'projectTitle' => 'Mega Project',
            'contractorName' => 'Good Contractor',
            'causeOfLoss' => 'Fire',
            'lossReserve' => '100000'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');

        Case c = [
            SELECT DPC_Place__c, DPC_NameProjectIncident__c, DPC_ContractorName__c, 
                   DPC_CauseofDamageInformation__c, DPC_PreliminaryClaimEstimate__c,
                   SuppliedName, SuppliedEmail
            FROM Case
            WHERE Id = :(String) data.get('caseId')
        ];

        System.assertEquals('New Full Address', c.DPC_Place__c);
        System.assertEquals('Mega Project', c.DPC_NameProjectIncident__c);
        System.assertEquals('Good Contractor', c.DPC_ContractorName__c);
        System.assertEquals('Fire', c.DPC_CauseofDamageInformation__c);
        System.assertEquals(100000, c.DPC_PreliminaryClaimEstimate__c);
        System.assertEquals('Somying Rakdee', c.SuppliedName);
    }

    @isTest
    static void testSuccessWithExistingContact() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];
        Contact con = [SELECT Id FROM Contact LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'contactId' => con.Id,
            'phone' => '0899999999',
            'incidentDateTime' => '2026-03-02 14:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Case c = [SELECT ContactId FROM Case WHERE Id = :(String) ((Map<String, Object>)result.get('data')).get('caseId')];
        System.assertEquals(con.Id, c.ContactId);
    }

    @isTest
    static void testSuccessCreatesNewContact() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'notifierName' => 'Somsak Dee',
            'incidentDateTime' => '2026-03-03 09:00'
        };

        Map<String, Object> result = callService(buildRequestBody(body));
        System.assertEquals(true, result.get('success'));
        System.assertEquals(1, [SELECT count() FROM Contact WHERE FirstName = 'Somsak']);
    }

    @isTest
    static void testValidationFailures() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        // Invalid email
        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'incidentDateTime' => '2026-03-01',
            'email' => 'bad-email'
        };
        Map<String, Object> result = callService(buildRequestBody(body));
        System.assertEquals(false, result.get('success'));
        System.assert(((String)result.get('error')).contains('Invalid email format'));
    }

    @isTest
    static void testEdgeCases() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        // Minimal fields
        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'incidentDateTime' => '2026-03-01'
        };
        System.assertEquals(true, callService(buildRequestBody(body)).get('success'));
    }
}
