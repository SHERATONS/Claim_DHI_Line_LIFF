/**
 * Unit tests for LIFF_ClaimSubmitServiceTA REST service.
 */
@isTest
private class LIFF_ClaimSubmitServiceTATest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Account TA');
        insert acc;

        Policy__c pol = new Policy__c(
            Name = 'POL-TA-001',
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

        req.requestURI = '/services/apexrest/liff/claims/ta/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);

        RestContext.request = req;
        RestContext.response = res;

        String responseJson = LIFF_ClaimSubmitServiceTA.submitClaim();
        return (Map<String, Object>) JSON.deserializeUntyped(responseJson);
    }

    @isTest
    static void testSuccessTAFields() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'notifierName' => 'Somying Rakdee',
            'phone' => '0812345678',
            'email' => 'somying@test.com',
            'incidentDateTime' => '2026-03-01 22:00',
            'lossPlace' => 'Narita Airport',
            'flightNumber' => 'TG676',
            'causeOfLoss' => 'Baggage Loss',
            'lossReserve' => '30000'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');

        Case c = [
            SELECT DPC_Place__c, DPC_FlightNo__c, DPC_CauseofDamageInformation__c, 
                   DPC_PreliminaryClaimEstimate__c, SuppliedName, SuppliedEmail
            FROM Case
            WHERE Id = :(String) data.get('caseId')
        ];

        System.assertEquals('Narita Airport', c.DPC_Place__c);
        System.assertEquals('TG676', c.DPC_FlightNo__c);
        System.assertEquals('Baggage Loss', c.DPC_CauseofDamageInformation__c);
        System.assertEquals(30000, c.DPC_PreliminaryClaimEstimate__c);
        System.assertEquals('Somying Rakdee', c.SuppliedName);
    }

    @isTest
    static void testSuccessWithExistingContact() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];
        Contact con = [SELECT Id FROM Contact LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'contactId' => con.Id,
            'incidentDateTime' => '2026-03-02 20:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Case c = [SELECT ContactId FROM Case WHERE Id = :(String) ((Map<String, Object>)result.get('data')).get('caseId')];
        System.assertEquals(con.Id, c.ContactId);
    }

    @isTest
    static void testValidationAndEdgeCases() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        // Missing field
        Map<String, Object> body1 = new Map<String, Object>{ 'policyId' => pol.Id };
        System.assertEquals(false, callService(buildRequestBody(body1)).get('success'));

        // ISO-T and minimal
        Map<String, Object> body2 = new Map<String, Object>{
            'policyId' => pol.Id,
            'incidentDateTime' => '2026-03-01T22:00'
        };
        System.assertEquals(true, callService(buildRequestBody(body2)).get('success'));
    }
}
