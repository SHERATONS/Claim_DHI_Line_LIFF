/**
 * Unit tests for LIFF_ClaimSubmitServiceAHDeath REST service.
 */
@isTest
private class LIFF_ClaimSubmitServiceAHDeathTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Account AH');
        insert acc;

        Policy__c pol = new Policy__c(
            Name = 'POL-AH-001',
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

        req.requestURI = '/services/apexrest/liff/claims/ahdeath/';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);

        RestContext.request = req;
        RestContext.response = res;

        String responseJson = LIFF_ClaimSubmitServiceAHDeath.submitClaim();
        return (Map<String, Object>) JSON.deserializeUntyped(responseJson);
    }

    @isTest
    static void testSuccessAllFields() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'notifierName' => 'Somying Rakdee',
            'phone' => '0812345678',
            'email' => 'somying@test.com',
            'incidentDateTime' => '2026-03-01 10:30',
            'lossPlace' => 'Bangkok Hospital',
            'treatmentDate' => '2026-03-01',
            'treatmentHospital' => 'Bangkok Hospital',
            'causeOfDeath' => 'Accident',
            'lossReserve' => '50000'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');
        
        Case c = [
            SELECT Policy__c, SuppliedName, SuppliedEmail, SuppliedPhone, DPC_Place__c, 
                   DPC_DateofAdmit__c, DPC_HospitalName__c, DPC_CauseofDamageInformation__c, 
                   DPC_PreliminaryClaimEstimate__c, Incident_Date__c, Status, Origin
            FROM Case
            WHERE Id = :(String) data.get('caseId')
        ];

        System.assertEquals(pol.Id, c.Policy__c);
        System.assertEquals('Somying Rakdee', c.SuppliedName);
        System.assertEquals('somying@test.com', c.SuppliedEmail);
        System.assertEquals('0812345678', c.SuppliedPhone);
        System.assertEquals('Bangkok Hospital', c.DPC_Place__c);
        System.assertEquals(Date.valueOf('2026-03-01'), c.DPC_DateofAdmit__c);
        System.assertEquals('Bangkok Hospital', c.DPC_HospitalName__c);
        System.assertEquals('Accident', c.DPC_CauseofDamageInformation__c);
        System.assertEquals(50000, c.DPC_PreliminaryClaimEstimate__c);
        System.assertNotEquals(null, c.Incident_Date__c);
        System.assertEquals('Escalated', c.Status);
        System.assertEquals('Line', c.Origin);
    }

    @isTest
    static void testSuccessWithExistingContact() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];
        Contact con = [SELECT Id FROM Contact LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'contactId' => con.Id,
            'phone' => '0899999999',
            'email' => 'updated@test.com',
            'incidentDateTime' => '2026-03-02 14:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');
        Case c = [SELECT ContactId, DPC_Informer__c FROM Case WHERE Id = :(String) data.get('caseId')];
        System.assertEquals(con.Id, c.ContactId);

        Contact updated = [SELECT Phone, Email FROM Contact WHERE Id = :con.Id];
        System.assertEquals('0899999999', updated.Phone);
        System.assertEquals('updated@test.com', updated.Email);
    }

    @isTest
    static void testSuccessCreatesNewContact() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id,
            'notifierName' => 'Somsak Dee',
            'phone' => '0811112222',
            'email' => 'somsak@test.com',
            'incidentDateTime' => '2026-03-03 09:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'));
        List<Contact> contacts = [SELECT Id, FirstName, LastName FROM Contact WHERE FirstName = 'Somsak' AND LastName = 'Dee'];
        System.assertEquals(1, contacts.size());
    }

    @isTest
    static void testValidationFailures() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        // Missing policyId
        Map<String, Object> body1 = new Map<String, Object>{ 'incidentDateTime' => '2026-03-01' };
        Map<String, Object> result1 = callService(buildRequestBody(body1));
        System.assertEquals(false, result1.get('success'));
        System.assert(((String)result1.get('error')).contains('policyId is required'));

        // Invalid phone
        Map<String, Object> body2 = new Map<String, Object>{
            'policyId' => pol.Id,
            'incidentDateTime' => '2026-03-01',
            'phone' => 'invalid'
        };
        Map<String, Object> result2 = callService(buildRequestBody(body2));
        System.assertEquals(false, result2.get('success'));
        System.assert(((String)result2.get('error')).contains('Invalid phone format'));
    }

    @isTest
    static void testEdgeCases() {
        Policy__c pol = [SELECT Id FROM Policy__c LIMIT 1];

        // Minimal fields
        Map<String, Object> body1 = new Map<String, Object>{
            'policyId' => pol.Id,
            'incidentDateTime' => '2026-03-01'
        };
        Map<String, Object> result1 = callService(buildRequestBody(body1));
        System.assertEquals(true, result1.get('success'));

        // ISO-T format
        Map<String, Object> body2 = new Map<String, Object>{
            'policyId' => pol.Id,
            'incidentDateTime' => '2026-03-01T10:30'
        };
        Map<String, Object> result2 = callService(buildRequestBody(body2));
        System.assertEquals(true, result2.get('success'));
    }
}
