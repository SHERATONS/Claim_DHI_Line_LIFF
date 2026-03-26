/**
 * Apex REST Service for binary file upload (no Base64 encoding)
 * Endpoint: /services/apexrest/liff/upload-binary
 *
 * This service accepts raw binary data directly, avoiding Base64 overhead.
 * Max file size: ~5MB (limited by Apex REST body limit of 6MB and heap limit)
 */
@RestResource(urlMapping='/liff/upload-binary/*')
global without sharing class LIFF_BinaryUploadService {

    global class UploadResponse {
        public Boolean success;
        public String contentDocumentId;
        public String contentVersionId;
        public String error;
    }

    @HttpPost
    global static String handleBinaryUpload() {
        UploadResponse response = new UploadResponse();

        try {
            RestRequest req = RestContext.request;

            // Get parameters from query params (headers may not work through SF Site)
            String fileName = req.params.get('fileName');
            String caseId = req.params.get('caseId');

            // Fallback to headers if params not found
            if (String.isBlank(fileName)) fileName = req.headers.get('X-File-Name');
            if (String.isBlank(caseId)) caseId = req.headers.get('X-Case-Id');

            // Decode filename (URL encoded for Thai characters)
            if (String.isNotBlank(fileName)) {
                fileName = EncodingUtil.urlDecode(fileName, 'UTF-8');
            }

            // Validate required parameters
            if (String.isBlank(fileName)) {
                response.success = false;
                response.error = 'Missing X-File-Name header';
                return JSON.serialize(response);
            }
            if (String.isBlank(caseId)) {
                response.success = false;
                response.error = 'Missing X-Case-Id header';
                return JSON.serialize(response);
            }

            // Get binary data directly from request body (no Base64!)
            Blob fileBlob = req.requestBody;
            if (fileBlob == null || fileBlob.size() == 0) {
                response.success = false;
                response.error = 'Empty file data';
                return JSON.serialize(response);
            }

            // Create ContentVersion
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = fileBlob;
            cv.IsMajorVersion = true;
            cv.DPC_ByPassFlow__c = true;
            insert cv;

            // Query to get ContentDocumentId
            cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

            // Create ContentDocumentLink to Case
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = cv.ContentDocumentId;
            cdl.LinkedEntityId = caseId;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            insert cdl;

            Case targetCase = new Case();
            targetCase.Id = caseId;
            targetCase.DPC_LatestAttachFileDate__c = System.now();
            update targetCase;
            
            // Link the SAME ContentDocument to Claim (no duplicate file)
            List<Claim__c> claimList = [Select Id, DPC_LatestAttachFileDate__c From Claim__c Where Case__c =: caseId];
            if (claimList != null && !claimList.isEmpty()){
                ContentDocumentLink cdl2 = new ContentDocumentLink();
                cdl2.ContentDocumentId = cv.ContentDocumentId; // reuse existing document
                cdl2.LinkedEntityId = claimList.get(0).Id;
                cdl2.ShareType = 'V';
                cdl2.Visibility = 'AllUsers';
                insert cdl2;

                claimList.get(0).DPC_LatestAttachFileDate__c = System.now();
                update claimList.get(0);
            }
            

            response.success = true;
            response.contentDocumentId = cv.ContentDocumentId;
            response.contentVersionId = cv.Id;

        } catch (Exception e) {
            response.success = false;
            response.error = e.getMessage();
        }

        return JSON.serialize(response);
    }
}