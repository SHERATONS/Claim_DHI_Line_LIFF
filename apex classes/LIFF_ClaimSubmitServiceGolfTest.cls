/**
 * Unit tests for LIFF_ClaimSubmitServiceGolf REST service.
 */
@isTest
private class LIFF_ClaimSubmitServiceGolfTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Account Golf');
        insert acc;

        Policy__c pol = new Policy__c(
            Name = 'GOLF-TEST-POL-001',
            AccountId__c = acc.Id
        );
        insert pol;

        Contact con = new Contact(
            FirstName  = 'Somchai',
            LastName   = 'Jaidee',
            Phone      = '0800000000',
            Email      = 'somchai@test.com',
            AccountId  = acc.Id
        );
        insert con;
    }

    private static String buildRequestBody(Map<String, Object> fields) {
        return JSON.serialize(fields);
    }

    private static Map<String, Object> callService(String jsonBody) {
        RestRequest req  = new RestRequest();
        RestResponse res = new RestResponse();

        req.requestURI  = '/services/apexrest/liff/claims/golf/';
        req.httpMethod  = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);

        RestContext.request  = req;
        RestContext.response = res;

        String responseJson = LIFF_ClaimSubmitServiceGolf.submitClaim();
        return (Map<String, Object>) JSON.deserializeUntyped(responseJson);
    }

    private static Policy__c getTestPolicy() {
        return [SELECT Id, AccountId__c FROM Policy__c LIMIT 1];
    }

    private static Contact getTestContact() {
        return [SELECT Id FROM Contact WHERE LastName = 'Jaidee' LIMIT 1];
    }

    @isTest
    static void testSuccessAllFields() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'notifierName'     => 'Somying Rakdee',
            'phone'            => '0812345678',
            'email'            => 'somying@test.com',
            'incidentDateTime' => '2026-03-01 10:30',
            'golfer'           => 'Somying Rakdee',
            'lossPlace'        => 'Golf Course A',
            'causeOfLoss'       => 'Accident',
            'lossReserve'      => '5000'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');
        System.assertNotEquals(null, data.get('caseId'));

        Case c = [
            SELECT Policy__c, DPC_Golf__c, DPC_LossPlace__c, DPC_DamageType__c, DPC_PreliminaryClaimEstimate__c
            FROM Case
            WHERE Id = :(String) data.get('caseId')
        ];
        System.assertEquals('Somying Rakdee', c.DPC_Golf__c);
        System.assertEquals('Golf Course A', c.DPC_LossPlace__c);
        System.assertEquals('Accident', c.DPC_DamageType__c);
        System.assertEquals(5000, c.DPC_PreliminaryClaimEstimate__c);
    }

    @isTest
    static void testMissingRequiredFields() {
        Map<String, Object> body = new Map<String, Object>{
            'notifierName' => 'Test User'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(false, result.get('success'));
        String err = (String) result.get('error');
        System.assert(err.contains('policyId is required'));
    }

    @isTest
    static void testInvalidLossReserve() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'incidentDateTime' => '2026-03-01 10:30',
            'lossReserve'      => 'invalid'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Case c = [SELECT DPC_PreliminaryClaimEstimate__c FROM Case WHERE Policy__c = :pol.Id LIMIT 1];
        System.assertEquals(null, c.DPC_PreliminaryClaimEstimate__c, 'Invalid lossReserve should be ignored');
    }
}
