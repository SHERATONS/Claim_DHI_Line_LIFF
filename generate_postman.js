const fs = require('fs');
const path = require('path');

const claims = [
  {
    name: 'FRIAR',
    endpoint: '/api/claims/friar',
    fields: {
      policyNo: 'POL1234567',
      contactId: 'CONT001',
      notifierName: 'John Doe',
      phone: '0812345678',
      email: 'john.doe@example.com',
      incidentDateTime: '2023-10-27T10:00:00Z',
      lossPlace: 'Bangkok',
      fullAddress: '123 Sukhumvit, Bangkok',
      provinceId: '10',
      districtId: '01',
      subdistrictId: '01',
      zipcode: '10110',
      lossReserve: '50000',
      causeOfLoss: 'Fire damage to property'
    }
  },
  {
    name: 'AHDeath',
    endpoint: '/api/claims/ahdeath',
    fields: {
      policyNo: 'POL-AH-001',
      contactId: 'CONT002',
      notifierName: 'Jane Smith',
      phone: '0898765432',
      email: 'jane.smith@example.com',
      accidentDate: '2023-10-25T08:30:00Z',
      treatmentDate: '2023-10-25T09:00:00Z',
      treatmentHospital: 'Bangkok General Hospital',
      causeOfIllness: 'Traffic accident',
      lossPlace: 'Rama 9 Road',
      lossReserve: '1000000'
    }
  },
  {
    name: 'CAREARCPM',
    endpoint: '/api/claims/carearcpm',
    fields: {
      policyNo: 'POL-CAR-001',
      contactId: 'CONT003',
      notifierName: 'Bob Builder',
      phone: '0801112222',
      email: 'bob@construction.com',
      incidentDateTime: '2023-10-20T14:15:00Z',
      lossPlace: 'Construction Site A',
      provinceId: '10',
      districtId: '02',
      subdistrictId: '03',
      projectTitle: 'New Condo Project',
      contractorName: 'BuildIt Co.',
      causeOfLoss: 'Crane collapsed',
      lossReserve: '250000'
    }
  },
  {
    name: 'Drone',
    endpoint: '/api/claims/drone',
    fields: {
      policyNo: 'POL-DRN-001',
      contactId: 'CONT004',
      notifierName: 'Sky Cam',
      phone: '0813334444',
      email: 'skycam@example.com',
      incidentDateTime: '2023-10-05T16:45:00Z',
      lossPlace: 'Public Park',
      driverName: 'Alice View',
      droneModel: 'DJI Mavic 3',
      causeOfLoss: 'Bird collision',
      lossReserve: '45000'
    }
  },
  {
    name: 'Golf',
    endpoint: '/api/claims/golf',
    fields: {
      policyNo: 'POL-GLF-001',
      contactId: 'CONT005',
      notifierName: 'Tiger Woods',
      phone: '0895556666',
      email: 'tiger@example.com',
      incidentDateTime: '2023-10-15T09:00:00Z',
      lossPlace: 'Pattaya Country Club',
      golferName: 'Tiger Woods',
      causeOfLoss: 'Hole in one celebration damages',
      lossReserve: '10000'
    }
  },
  {
    name: 'MarineCargo',
    endpoint: '/api/claims/marinecargo',
    fields: {
      policyNo: 'POL-MC-001',
      contactId: 'CONT006',
      notifierName: 'Logistics Pro',
      phone: '0887778888',
      email: 'logistics@shipping.com',
      incidentDateTime: '2023-10-18T11:20:00Z',
      lossPlace: 'Laem Chabang Port',
      vehicleName: 'Cargo Ship X',
      vehiclePlate: 'IMO 1234567',
      transportationType: 'Sea Freight',
      causeOfLoss: 'Container dropped during loading',
      lossReserve: '500000'
    }
  },
  {
    name: 'MarineCL',
    endpoint: '/api/claims/marinecl',
    fields: {
      policyNo: 'POL-MCL-001',
      contactId: 'CONT007',
      notifierName: 'Trucking Co.',
      phone: '0869990000',
      email: 'trucking@example.com',
      incidentDateTime: '2023-10-22T22:30:00Z',
      lossPlace: 'Highway 1',
      vehicleName: 'Isuzu Truck',
      vehiclePlate: '12-3456 BKK',
      transportationType: 'Road Freight',
      causeOfLoss: 'Traffic accident resulting in cargo damage',
      lossReserve: '120000'
    }
  },
  {
    name: 'MarineHull',
    endpoint: '/api/claims/marinehull',
    fields: {
      policyNo: 'POL-MH-001',
      contactId: 'CONT008',
      notifierName: 'Captain Hook',
      phone: '0851112222',
      email: 'captain@sea.com',
      incidentDateTime: '2023-10-10T05:00:00Z',
      lossPlace: 'Gulf of Thailand',
      boatName: 'The Pearl',
      causeOfLoss: 'Engine failure and fire',
      lossReserve: '800000'
    }
  },
  {
    name: 'Other',
    endpoint: '/api/claims/other',
    fields: {
      policyNo: 'POL-OTH-001',
      contactId: 'CONT009',
      notifierName: 'Various Inc.',
      phone: '0843334444',
      email: 'various@example.com',
      incidentDateTime: '2023-10-26T14:00:00Z',
      lossPlace: 'Office Building',
      causeOfLoss: 'Water leak damaged servers',
      lossReserve: '300000'
    }
  },
  {
    name: 'Pet',
    endpoint: '/api/claims/pet',
    fields: {
      policyNo: 'POL-PET-001',
      contactId: 'CONT010',
      notifierName: 'Sarah Conner',
      phone: '0835556666',
      email: 'sarah@example.com',
      incidentDateTime: '2023-10-21T18:00:00Z',
      lossPlace: 'Veterinary Clinic',
      petName: 'Buddy',
      petType: 'Dog',
      petTypeOther: '',
      petSpecies: 'Golden Retriever',
      petGender: 'Male',
      microchipNumber: '985141000000001',
      causeOfLoss: 'Stomach infection treatment',
      lossReserve: '8500'
    }
  },
  {
    name: 'TA',
    endpoint: '/api/claims/ta',
    fields: {
      policyNo: 'POL-TA-001',
      contactId: 'CONT011',
      notifierName: 'Traveler Joe',
      phone: '0827778888',
      email: 'joe@travel.com',
      incidentDateTime: '2023-10-12T09:30:00Z',
      accidentPlace: 'Tokyo, Japan',
      flightNumber: 'JL123',
      causeOfLoss: 'Baggage delay for 24 hours',
      lossReserve: '5000'
    }
  }
];

const outDir = process.argv[2];
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write individual JSON files
for (const claim of claims) {
  const filePath = path.join(outDir, `${claim.name}_Request.json`);
  fs.writeFileSync(filePath, JSON.stringify(claim.fields, null, 2), 'utf-8');
}

// Generate Postman Collection
const collection = {
  info: {
    name: 'Line LIFF Claims API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: claims.map(c => {
    return {
      name: `Submit ${c.name} Claim`,
      request: {
        method: 'POST',
        header: [
          {
            key: 'Authorization',
            value: 'Bearer YOUR_LIFF_TOKEN_HERE'
          }
        ],
        body: {
          mode: 'formdata',
          formdata: Object.entries(c.fields).map(([key, value]) => ({
            key,
            value,
            type: 'text'
          }))
        },
        url: {
          raw: `{{base_url}}${c.endpoint}`,
          host: ['{{base_url}}'],
          path: c.endpoint.split('/').filter(Boolean)
        }
      }
    };
  }),
  variable: [
    {
      key: 'base_url',
      value: 'http://localhost:8080'
    }
  ]
};

fs.writeFileSync(path.join(outDir, 'Postman_Collection.json'), JSON.stringify(collection, null, 2), 'utf-8');
console.log('Generated test files in ' + outDir);
