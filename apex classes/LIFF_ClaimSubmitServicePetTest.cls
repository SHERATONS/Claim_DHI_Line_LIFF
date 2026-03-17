/**
 * Unit tests for LIFF_ClaimSubmitServicePet REST service.
 *
 * Covers:
 *   1. Successful claim with all pet fields
 *   2. Successful claim using existing contactId
 *   3. Successful claim creating new contact from notifierName
 *   4. Missing required fields (policyId, incidentDateTime)
 *   5. Invalid phone format
 *   6. Invalid email format
 *   7. Policy not found
 *   8. Minimal fields — only required ones
 */
@isTest
private class LIFF_ClaimSubmitServicePetTest {

    // ─── Test Data Setup ───────────────────────────────────────────────

    @TestSetup
    static void setupData() {
        // Account
        Account acc = new Account(Name = 'Test Account Pet');
        insert acc;

        // Policy linked to the account
        Policy__c pol = new Policy__c(
            Name = '14058-108-240004161',
            AccountId__c = acc.Id
        );
        insert pol;

        // Contact under the same account
        Contact con = new Contact(
            FirstName  = 'Somchai',
            LastName   = 'Jaidee',
            Phone      = '0800000000',
            Email      = 'somchai@test.com',
            AccountId  = acc.Id
        );
        insert con;

        // Queue (must match DeveloperName used in the service)
        // Note: Queues cannot be created in tests with insert — they must
        //       already exist in the org. The service handles this gracefully
        //       (if queue is missing, OwnerId is simply not set).

        // Note: DPC_Resource__c for InformedBy is NOT created here because
        // the lookup filter on DPC_InformedBy__c requires specific criteria.
        // The service handles this gracefully (skips if not found).

        // RecordType 'DPC_ClaimPET' must exist in the org.
        // If it does not, the service skips it gracefully.
    }

    // ─── Helper ────────────────────────────────────────────────────────

    /**
     * Build a JSON request body from a map of fields.
     */
    private static String buildRequestBody(Map<String, Object> fields) {
        return JSON.serialize(fields);
    }

    /**
     * Helper to set up RestContext and call the service.
     */
    private static Map<String, Object> callService(String jsonBody) {
        RestRequest req  = new RestRequest();
        RestResponse res = new RestResponse();

        req.requestURI  = '/services/apexrest/liff/claims/pet/';
        req.httpMethod  = 'POST';
        req.requestBody = Blob.valueOf(jsonBody);

        RestContext.request  = req;
        RestContext.response = res;

        String responseJson = LIFF_ClaimSubmitServicePet.submitClaim();
        return (Map<String, Object>) JSON.deserializeUntyped(responseJson);
    }

    /**
     * Fetch the test Policy created in @TestSetup.
     */
    private static Policy__c getTestPolicy() {
        return [SELECT Id, AccountId__c FROM Policy__c LIMIT 1];
    }

    /**
     * Fetch the test Contact created in @TestSetup.
     */
    private static Contact getTestContact() {
        return [SELECT Id FROM Contact WHERE LastName = 'Jaidee' LIMIT 1];
    }

    // ─── Tests ─────────────────────────────────────────────────────────

    /**
     * 1. Successful claim with ALL pet-specific fields.
     */
    @isTest
    static void testSuccessAllFields() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'notifierName'     => 'Somying Rakdee',
            'phone'            => '0812345678',
            'email'            => 'somying@test.com',
            'incidentDateTime' => '2026-03-01 10:30',
            'lossPlace'        => 'Bangkok Clinic',
            'petType'          => 'สุนัข',
            'petName'          => 'Lucky',
            'petSpecies'       => 'Golden Retriever',
            'petGender'        => 'เพศผู้',
            'microchipNumber'  => 'MCH123456',
            'causeOfLoss'      => 'Illness',
            'lossReserve'      => '1500.50'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Expected success = true, error: ' + result.get('error'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');
        System.assertNotEquals(null, data.get('caseId'),     'caseId should not be null');
        System.assertNotEquals(null, data.get('caseNumber'), 'caseNumber should not be null');

        // Verify Case field values
        Case c = [
            SELECT Policy__c, SuppliedName, SuppliedEmail, SuppliedPhone,
                   Mobile_Phone__c, Email__c, DPC_Place__c,
                   DPC_TypesofPet__c, DPC_PetName__c, DPC_Species__c,
                   DPC_PetGender__c, DPC_MicrochipNumber__c,
                   DPC_CauseofDamageInformation__c, Incident_Date__c,
                   DPC_PreliminaryClaimEstimate__c,
                   Status, Origin, Subject
            FROM Case
            WHERE Id = :(String) data.get('caseId')
        ];

        System.assertEquals(pol.Id,              c.Policy__c);
        System.assertEquals('Somying Rakdee',    c.SuppliedName);
        System.assertEquals('somying@test.com',  c.SuppliedEmail);
        System.assertEquals('0812345678',        c.SuppliedPhone);
        System.assertEquals('0812345678',        c.Mobile_Phone__c);
        System.assertEquals('somying@test.com',  c.Email__c);
        System.assertEquals('Bangkok Clinic',    c.DPC_Place__c);
        System.assertEquals('สุนัข',              c.DPC_TypesofPet__c);
        System.assertEquals('Lucky',             c.DPC_PetName__c);
        System.assertEquals('Golden Retriever',  c.DPC_Species__c);
        System.assertEquals('เพศผู้',             c.DPC_PetGender__c);
        System.assertEquals('MCH123456',         c.DPC_MicrochipNumber__c);
        System.assertEquals('Illness',           c.DPC_CauseofDamageInformation__c);
        System.assertEquals(1500.50,             c.DPC_PreliminaryClaimEstimate__c);
        System.assertNotEquals(null,             c.Incident_Date__c);
        System.assertEquals('Escalated',         c.Status);
        System.assertEquals('Line',              c.Origin);
        System.assertEquals('แจ้งเคลม',          c.Subject);
    }

    /**
     * 2. Successful claim with existing contactId — contact is linked.
     */
    @isTest
    static void testSuccessWithExistingContact() {
        Policy__c pol = getTestPolicy();
        Contact   con = getTestContact();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'contactId'        => con.Id,
            'phone'            => '0899999999',
            'email'            => 'updated@test.com',
            'incidentDateTime' => '2026-03-02 14:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Expected success = true, error: ' + result.get('error'));

        // Verify case is linked to the contact
        Map<String, Object> data = (Map<String, Object>) result.get('data');
        Case c = [SELECT ContactId, DPC_Informer__c FROM Case WHERE Id = :(String) data.get('caseId')];
        System.assertEquals(con.Id, c.ContactId);
        System.assertEquals(con.Id, c.DPC_Informer__c);

        // Verify contact phone/email was updated
        Contact updated = [SELECT Phone, Email FROM Contact WHERE Id = :con.Id];
        System.assertEquals('0899999999',      updated.Phone);
        System.assertEquals('updated@test.com', updated.Email);
    }

    /**
     * 3. Successful claim with notifierName — creates a new Contact.
     */
    @isTest
    static void testSuccessCreatesNewContact() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'notifierName'     => 'Somsak Dee',
            'phone'            => '0811112222',
            'email'            => 'somsak@test.com',
            'incidentDateTime' => '2026-03-03 09:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Expected success = true, error: ' + result.get('error'));

        // A new Contact should have been created
        List<Contact> contacts = [
            SELECT Id, FirstName, LastName, Phone, Email
            FROM Contact
            WHERE FirstName = 'Somsak' AND LastName = 'Dee'
        ];
        System.assertEquals(1, contacts.size(), 'New contact should be created');
        System.assertEquals('0811112222',     contacts[0].Phone);
        System.assertEquals('somsak@test.com', contacts[0].Email);
    }

    /**
     * 4. Missing required field — policyId.
     */
    @isTest
    static void testMissingPolicyId() {
        Map<String, Object> body = new Map<String, Object>{
            'incidentDateTime' => '2026-03-01 10:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(false, result.get('success'));
        String err = (String) result.get('error');
        System.assert(err.contains('policyId is required'), 'Should report policyId required');
    }

    /**
     * 5. Missing required field — incidentDateTime.
     */
    @isTest
    static void testMissingIncidentDate() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId' => pol.Id
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(false, result.get('success'));
        String err = (String) result.get('error');
        System.assert(err.contains('incidentDateTime is required'),
                       'Should report incidentDateTime required');
    }

    /**
     * 6. Invalid phone format.
     */
    @isTest
    static void testInvalidPhoneFormat() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'incidentDateTime' => '2026-03-01 10:00',
            'phone'            => 'abc'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(false, result.get('success'));
        String err = (String) result.get('error');
        System.assert(err.contains('Invalid phone format'), 'Should report invalid phone');
    }

    /**
     * 7. Invalid email format.
     */
    @isTest
    static void testInvalidEmailFormat() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'incidentDateTime' => '2026-03-01 10:00',
            'email'            => 'not-an-email'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(false, result.get('success'));
        String err = (String) result.get('error');
        System.assert(err.contains('Invalid email format'), 'Should report invalid email');
    }

    /**
     * 8. Policy not found.
     */
    @isTest
    static void testPolicyNotFound() {
        // Use a fake 18-char Salesforce Id
        String fakeId = Policy__c.SObjectType.getDescribe().getKeyPrefix() + '000000000000000';

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => fakeId,
            'incidentDateTime' => '2026-03-01 10:00'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(false, result.get('success'));
        String err = (String) result.get('error');
        System.assert(err.contains('Policy not found'), 'Should report policy not found');
    }

    /**
     * 9. Minimal required fields only — no optional pet fields.
     */
    @isTest
    static void testMinimalRequiredFields() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'incidentDateTime' => '2026-03-01'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Minimal fields should succeed, error: ' + result.get('error'));
        Map<String, Object> data = (Map<String, Object>) result.get('data');
        System.assertNotEquals(null, data.get('caseId'));
    }

    /**
     * 10. Incident date with ISO-T format (e.g. "2026-03-01T10:30").
     */
    @isTest
    static void testIncidentDateWithTFormat() {
        Policy__c pol = getTestPolicy();

        Map<String, Object> body = new Map<String, Object>{
            'policyId'         => pol.Id,
            'incidentDateTime' => '2026-03-01T14:30'
        };

        Test.startTest();
        Map<String, Object> result = callService(buildRequestBody(body));
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Expected success = true, error: ' + result.get('error'));
    }
}
