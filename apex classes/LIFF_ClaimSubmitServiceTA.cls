/**
 * Apex REST Service for claim submission.
 * Creates Contact (if needed) and Case in a single transaction with rollback.
 * Called by Go backend after form validation.
 *
 * Endpoint: POST /services/apexrest/liff/claims/ta/*
 */
@RestResource(urlMapping='/liff/claims/ta/*')
global without sharing class LIFF_ClaimSubmitServiceTA {

    global class ClaimResponse {
        public Boolean success;
        public ClaimData data;
        public String error;
    }

    global class ClaimData {
        public String caseId;
        public String caseNumber;
        public String notificationNo;
    }

    @HttpPost
    global static String submitClaim() {
        ClaimResponse response = new ClaimResponse();
        RestResponse res = RestContext.response;

        try {
            RestRequest req = RestContext.request;
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

            // Extract fields from request
            String policyId = (String) body.get('policyId');
            String contactId = (String) body.get('contactId');
            String notifierName = (String) body.get('notifierName');
            String phone = (String) body.get('phone');
            String email = (String) body.get('email');
            String incidentDateStr = (String) body.get('incidentDateTime');
            String lossPlace = (String) body.get('lossPlace');
            String flightNumber = (String) body.get('flightNumber');
            String causeOfLoss = (String) body.get('causeOfLoss');
            String lossReserve = (String) body.get('lossReserve');

            // Validate required fields
            List<String> errors = new List<String>();
            if (String.isBlank(policyId)) errors.add('policyId is required');
            if (String.isBlank(incidentDateStr)) errors.add('incidentDateTime is required');

            if (String.isNotBlank(phone) && !Pattern.matches('^[0-9\\-]{9,15}$', phone)) {
                errors.add('Invalid phone format');
            }
            if (String.isNotBlank(email) && !Pattern.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', email)) {
                errors.add('Invalid email format');
            }

            if (!errors.isEmpty()) {
                res.statusCode = 400;
                response.success = false;
                response.error = String.join(errors, ', ');
                return JSON.serialize(response, true);
            }

            // Query Policy
            List<Policy__c> policies = [
                SELECT Id, Name, AccountId__c, AccountId__r.Name, AccountId__r.IsPersonAccount
                FROM Policy__c
                WHERE Id = :policyId
                LIMIT 1
            ];

            if (policies.isEmpty()) {
                res.statusCode = 404;
                response.success = false;
                response.error = 'Policy not found';
                return JSON.serialize(response, true);
            }

            Policy__c policy = policies[0];

            // Create savepoint for transaction rollback
            Savepoint sp = Database.setSavepoint();

            try {
                // --- Contact Handling ---
                Contact notifierContact;

                if (String.isNotBlank(contactId)) {
                    // Use existing contact — update phone/email
                    List<Contact> existingContacts = [
                        SELECT Id, Name, Phone, Email
                        FROM Contact
                        WHERE Id = :contactId
                        LIMIT 1
                    ];
                    if (!existingContacts.isEmpty()) {
                        notifierContact = existingContacts[0];
                        notifierContact.Phone = phone;
                        notifierContact.Email = email;
                        update notifierContact;
                    }
                } else if (policy.AccountId__c != null && String.isNotBlank(notifierName)) {
                    // Search by name or create new
                    Map<String, String> parsedName = parseFullName(notifierName);

                    if (parsedName != null) {
                        List<Contact> existingContacts = [
                            SELECT Id, Name, Phone, Email, AccountId
                            FROM Contact
                            WHERE AccountId = :policy.AccountId__c
                            AND FirstName = :parsedName.get('firstName')
                            AND LastName = :parsedName.get('lastName')
                            LIMIT 1
                        ];

                        if (!existingContacts.isEmpty()) {
                            notifierContact = existingContacts[0];
                            notifierContact.Phone = phone;
                            notifierContact.Email = email;
                            update notifierContact;
                        } else {
                            notifierContact = new Contact();
                            // Skip AccountId for Person Accounts
                            if (policy.AccountId__c != null && policy.AccountId__r.IsPersonAccount != true) {
                                notifierContact.AccountId = policy.AccountId__c;
                            }
                            notifierContact.FirstName = parsedName.get('firstName');
                            notifierContact.LastName = parsedName.get('lastName');
                            notifierContact.Phone = phone;
                            notifierContact.Email = email;
                            insert notifierContact;
                        }
                    }
                }

                // --- Case Creation ---
                Case c = new Case();

                // Queue Owner
                List<Group> queues = [
                    SELECT Id FROM Group
                    WHERE Type = 'Queue' AND DeveloperName = 'Email2CaseTestQueue'
                    LIMIT 1
                ];
                if (!queues.isEmpty()) c.OwnerId = queues[0].Id;

                // Policy and Account
                c.Policy__c = policy.Id;
                if (policy.AccountId__c != null) {
                    c.AccountId = policy.AccountId__c;
                }

                // Record Type
                List<RecordType> recordTypes = [
                    SELECT Id FROM RecordType
                    WHERE SObjectType = 'Case' AND DeveloperName = 'DPC_ClaimTA'
                    LIMIT 1
                ];
                if (!recordTypes.isEmpty()) c.RecordTypeId = recordTypes[0].Id;


                // Informed By (AutomateP resource)
                List<DPC_Resource__c> resources = [
                    SELECT Id FROM DPC_Resource__c
                    WHERE DPC_EntityId__c = 'AutomateP'
                    LIMIT 1
                ];
                if (!resources.isEmpty()) {
                    c.DPC_InformedBy__c = resources[0].Id;
                }

                // Standard fields
                c.Status = 'Escalated';
                c.Origin = 'Line';
                c.Subject = 'แจ้งเคลม';
                c.DPC_SubjectDropdown__c = 'แจ้งเคลม';
                c.SuppliedName = notifierName;
                c.SuppliedEmail = email;
                c.SuppliedPhone = phone;
                c.Mobile_Phone__c = phone;
                c.Email__c = email;

                // Contact link
                if (notifierContact != null) {
                    c.ContactId = notifierContact.Id;
                    c.DPC_Informer__c = notifierContact.Id;
                } else if (String.isNotBlank(contactId)) {
                    c.ContactId = contactId;
                    c.DPC_Informer__c = contactId;
                }

                // Trip Info
                if (String.isNotBlank(lossPlace)) {
                    c.DPC_Place__c = lossPlace;
                }
                if (String.isNotBlank(flightNumber)) {
                    c.DPC_FlightNo__c = flightNumber;
                }

                // Loss reserve
                if (String.isNotBlank(lossReserve)) {
                    try {
                        c.DPC_PreliminaryClaimEstimate__c = Decimal.valueOf(lossReserve);
                    } catch (Exception ex) {
                        // Ignore invalid number
                    }
                }

                // Cause of loss
                if (String.isNotBlank(causeOfLoss)) {
                    c.DPC_CauseofDamageInformation__c = causeOfLoss;
                }

                // Incident date — parse "YYYY-MM-DD HH:mm" with Thailand timezone (GMT+7)
                String dateStr = incidentDateStr.replace('T', ' ').trim();
                if (!dateStr.contains(':')) {
                    dateStr += ' 00:00';
                }
                List<String> dtParts = dateStr.split(' ');
                String isoDateStr = dtParts[0] + 'T' + dtParts[1] + ':00+07:00';
                String jsonStr = '"' + isoDateStr + '"';
                c.Incident_Date__c = (Datetime) JSON.deserialize(jsonStr, Datetime.class);

                // Insert Case
                insert c;

                // Read back auto-generated fields
                c = [SELECT Id, CaseNumber, DPC_NotificationNo__c FROM Case WHERE Id = :c.Id LIMIT 1];

                // Build response
                res.statusCode = 200;
                response.success = true;
                ClaimData data = new ClaimData();
                data.caseId = c.Id;
                data.caseNumber = c.CaseNumber;
                data.notificationNo = c.DPC_NotificationNo__c;
                response.data = data;

            } catch (Exception e) {
                Database.rollback(sp);
                res.statusCode = 500;
                response.success = false;
                response.error = e.getMessage();
            }

        } catch (Exception e) {
            res.statusCode = 400;
            response.success = false;
            response.error = 'Invalid request: ' + e.getMessage();
        }

        return JSON.serialize(response, true);
    }

    /**
     * Parse full name into firstName and lastName.
     * Thai format: FirstName LastName (space separated).
     * Single name goes to lastName only (SF requires LastName).
     */
    private static Map<String, String> parseFullName(String fullName) {
        if (String.isBlank(fullName)) {
            return null;
        }

        List<String> nameParts = fullName.trim().split(' ');

        if (nameParts.size() == 1) {
            return new Map<String, String>{
                'firstName' => null,
                'lastName' => nameParts[0]
            };
        }

        String firstName = nameParts[0];
        List<String> lastNameParts = new List<String>();
        for (Integer i = 1; i < nameParts.size(); i++) {
            lastNameParts.add(nameParts[i]);
        }

        return new Map<String, String>{
            'firstName' => firstName,
            'lastName' => String.join(lastNameParts, ' ')
        };
    }
}
