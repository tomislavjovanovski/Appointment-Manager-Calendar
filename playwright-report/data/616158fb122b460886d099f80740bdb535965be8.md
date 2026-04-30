# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/patient-management.spec.ts >> Patient Management — Standalone Creation >> patient email format is validated
- Location: tests/e2e/patient-management.spec.ts:88:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('error-email-invalid')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('error-email-invalid')

```

# Page snapshot

```yaml
- generic:
  - generic:
    - list
    - region "Notifications alt+T"
    - generic:
      - generic:
        - generic:
          - generic:
            - generic:
              - img
            - generic:
              - heading [level=1]: MediCal
              - paragraph: Appointment Manager
        - navigation:
          - paragraph: Menu
          - generic:
            - button:
              - img
              - text: Dashboard
            - button:
              - img
              - text: Patients
            - button:
              - img
              - text: Settings
        - generic:
          - generic:
            - paragraph: Standalone • Flexible
            - paragraph: Data stored locally
      - main:
        - generic:
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - img
                  - heading [level=2]: Patients
                - paragraph: Manage your patient database
              - button:
                - img
                - text: Add Patient
            - generic:
              - generic:
                - generic:
                  - img
                  - textbox:
                    - /placeholder: Search patients by name, email, or phone...
            - generic:
              - generic:
                - generic:
                  - img
                  - heading [level=3]: No patients yet
                  - paragraph: Start by adding your first patient to the system
                  - button:
                    - img
                    - text: Add Your First Patient
  - dialog "Add New Patient" [ref=e2]:
    - heading "Add New Patient" [level=2] [ref=e4]:
      - img [ref=e5]
      - text: Add New Patient
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]:
            - img [ref=e12]
            - text: Full Name *
          - textbox "Full Name *" [ref=e15]:
            - /placeholder: Enter patient's full name
            - text: Test
        - generic [ref=e16]:
          - generic [ref=e17]: Full Name *
          - textbox "Full Name *" [ref=e18]:
            - /placeholder: Enter patient's full name
            - text: User
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - img [ref=e22]
            - text: Email *
          - textbox "Email *" [active] [ref=e25]:
            - /placeholder: patient@email.com
            - text: not-an-email
        - generic [ref=e26]:
          - generic [ref=e27]:
            - img [ref=e28]
            - text: Phone *
          - textbox "Phone *" [ref=e30]:
            - /placeholder: +1 (555) 123-4567
            - text: 555-1234
      - generic [ref=e31]:
        - text: Date of Birth
        - textbox [ref=e32]: 1990-01-01
      - generic [ref=e33]:
        - generic [ref=e34]:
          - img [ref=e35]
          - text: Address
        - textbox "Address" [ref=e38]:
          - /placeholder: Street address, city, state, zip
      - generic [ref=e39]:
        - generic [ref=e40]:
          - img [ref=e41]
          - text: Emergency Contact
        - textbox "Emergency Contact" [ref=e45]:
          - /placeholder: Name and phone number
      - generic [ref=e46]:
        - text: Notes
        - textbox "Notes" [ref=e47]:
          - /placeholder: Medical history, allergies, special instructions...
      - generic [ref=e48]:
        - button "Cancel" [ref=e49] [cursor=pointer]
        - button "Add Patient" [ref=e50] [cursor=pointer]
    - button "Close" [ref=e51] [cursor=pointer]:
      - img [ref=e52]
      - generic [ref=e55]: Close
```

# Test source

```ts
  3   | // Also covers: search, profile view, data persistence.
  4   | 
  5   | import { test, expect } from '../fixtures/base';
  6   | import { PATIENTS } from '../test-data/seed';
  7   | 
  8   | test.describe('Patient Management — Standalone Creation', () => {
  9   |   test('creates a new patient and verifies in UI and LocalStorage', async ({
  10  |     pageClean: page, patients, storage,
  11  |   }) => {
  12  |     const newP = PATIENTS.newPatient;
  13  | 
  14  |     await test.step('Navigate to Patients page', async () => {
  15  |       await patients.goToPatients(page);
  16  |     });
  17  | 
  18  |     await test.step('Open create dialog and fill all fields', async () => {
  19  |       await patients.openCreateDialog(page);
  20  |       await patients.fillForm(page, {
  21  |         firstName: newP.firstName,
  22  |         lastName: newP.lastName,
  23  |         email: newP.email,
  24  |         phone: newP.phone,
  25  |         dateOfBirth: newP.dateOfBirth,
  26  |         address: newP.address,
  27  |         emergencyContact: newP.emergencyContact,
  28  |         notes: newP.notes,
  29  |       });
  30  |     });
  31  | 
  32  |     await test.step('Submit and confirm patient appears in list', async () => {
  33  |       await patients.submitForm(page);
  34  |       await expect(page.getByTestId('toast-success')).toBeVisible();
  35  | 
  36  |       const row = page.getByTestId('patient-row').filter({ hasText: newP.email });
  37  |       await expect(row).toBeVisible();
  38  |     });
  39  | 
  40  |     await test.step('Verify patient stored in LocalStorage with all fields', async () => {
  41  |       await storage.assertPatientExistsInStorage(page, newP.email);
  42  | 
  43  |       const stored = await storage.getAll(page, 'patients') as Record<string, string>[];
  44  |       const patient = stored.find((p) => p.email === newP.email);
  45  | 
  46  |       expect(patient?.firstName).toBe(newP.firstName);
  47  |       expect(patient?.lastName).toBe(newP.lastName);
  48  |       expect(patient?.phone).toBe(newP.phone);
  49  |       expect(patient?.address).toBe(newP.address);
  50  |     });
  51  |   });
  52  | 
  53  |   test('cannot create patient with duplicate email', async ({
  54  |     pageWithPatients: page, patients,
  55  |   }) => {
  56  |     await patients.goToPatients(page);
  57  |     await patients.openCreateDialog(page);
  58  | 
  59  |     // Try to register Alice's email again
  60  |     await patients.fillForm(page, {
  61  |       firstName: 'Duplicate',
  62  |       lastName: 'User',
  63  |       email: PATIENTS.alice.email, // already exists
  64  |       phone: '555-9999',
  65  |       dateOfBirth: '2000-01-01',
  66  |     });
  67  | 
  68  |     await page.getByTestId('patient-form-submit').click();
  69  |     await expect(page.getByTestId('error-email-duplicate')).toBeVisible();
  70  |     await expect(page.getByTestId('patient-form-dialog')).toBeVisible(); // stays open
  71  |   });
  72  | 
  73  |   test('required fields prevent submission when empty', async ({
  74  |     pageClean: page, patients,
  75  |   }) => {
  76  |     await patients.goToPatients(page);
  77  |     await patients.openCreateDialog(page);
  78  | 
  79  |     // Submit completely empty form
  80  |     await page.getByTestId('patient-form-submit').click();
  81  | 
  82  |     await expect(page.getByTestId('error-first-name-required')).toBeVisible();
  83  |     await expect(page.getByTestId('error-last-name-required')).toBeVisible();
  84  |     await expect(page.getByTestId('error-email-required')).toBeVisible();
  85  |     await expect(page.getByTestId('error-phone-required')).toBeVisible();
  86  |   });
  87  | 
  88  |   test('patient email format is validated', async ({
  89  |     pageClean: page, patients,
  90  |   }) => {
  91  |     await patients.goToPatients(page);
  92  |     await patients.openCreateDialog(page);
  93  | 
  94  |     await patients.fillForm(page, {
  95  |       firstName: 'Test',
  96  |       lastName: 'User',
  97  |       email: 'not-an-email', // invalid
  98  |       phone: '555-1234',
  99  |       dateOfBirth: '1990-01-01',
  100 |     });
  101 | 
  102 |     await page.getByTestId('patient-form-submit').click();
> 103 |     await expect(page.getByTestId('error-email-invalid')).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
  104 |   });
  105 | });
  106 | 
  107 | test.describe('Patient Management — Inline Creation During Booking', () => {
  108 |   test('creates a new patient inline during booking and appointment is linked correctly', async ({
  109 |     pageClean: page, booking, storage,
  110 |   }) => {
  111 |     const newP = PATIENTS.newPatient;
  112 | 
  113 |     await booking.goToScheduler(page);
  114 |     await booking.openSlot(page);
  115 | 
  116 |     await test.step('Switch to new-patient form inside booking dialog', async () => {
  117 |       await page.getByTestId('create-new-patient-btn').click();
  118 |       await expect(page.getByTestId('new-patient-panel')).toBeVisible();
  119 |     });
  120 | 
  121 |     await test.step('Fill new patient details', async () => {
  122 |       await booking.fillNewPatientForm(page, {
  123 |         firstName: newP.firstName,
  124 |         lastName: newP.lastName,
  125 |         email: newP.email,
  126 |         phone: newP.phone,
  127 |         dateOfBirth: newP.dateOfBirth,
  128 |       });
  129 |     });
  130 | 
  131 |     await test.step('Complete rest of booking form', async () => {
  132 |       await page.getByTestId('appointment-type-select').selectOption('consultation');
  133 |       await page.getByTestId('duration-select').selectOption('30');
  134 |     });
  135 | 
  136 |     await test.step('Submit booking', async () => {
  137 |       await booking.submit(page);
  138 |       await expect(page.getByTestId('toast-success')).toBeVisible();
  139 |     });
  140 | 
  141 |     await test.step('Both patient AND appointment exist in storage, correctly linked', async () => {
  142 |       await storage.assertPatientExistsInStorage(page, newP.email);
  143 | 
  144 |       const patients = await storage.getAll(page, 'patients') as { id: string; email: string }[];
  145 |       const patient = patients.find((p) => p.email === newP.email)!;
  146 |       expect(patient).toBeDefined();
  147 | 
  148 |       // Appointment must reference the newly created patient's ID
  149 |       await storage.assertAppointmentExistsInStorage(page, {
  150 |         patientId: patient.id,
  151 |         type: 'consultation',
  152 |       });
  153 |     });
  154 |   });
  155 | });
  156 | 
  157 | test.describe('Patient Management — Search', () => {
  158 |   test('search filters patient list by name', async ({
  159 |     pageWithPatients: page, patients,
  160 |   }) => {
  161 |     await patients.goToPatients(page);
  162 | 
  163 |     await test.step('Search for "Alice"', async () => {
  164 |       await patients.searchPatient(page, 'Alice');
  165 |       // Only Alice should be visible
  166 |       const count = await patients.getVisiblePatientCount(page);
  167 |       expect(count).toBe(1);
  168 |       await expect(
  169 |         page.getByTestId('patient-row').filter({ hasText: PATIENTS.alice.email }),
  170 |       ).toBeVisible();
  171 |     });
  172 | 
  173 |     await test.step('Clear search restores full list', async () => {
  174 |       await patients.searchPatient(page, '');
  175 |       const count = await patients.getVisiblePatientCount(page);
  176 |       expect(count).toBe(2); // Alice + Bob
  177 |     });
  178 |   });
  179 | 
  180 |   test('search with no results shows empty state', async ({
  181 |     pageWithPatients: page, patients,
  182 |   }) => {
  183 |     await patients.goToPatients(page);
  184 |     await patients.searchPatient(page, 'nonexistent-patient-xyz');
  185 | 
  186 |     await expect(page.getByTestId('patients-empty-state')).toBeVisible();
  187 |     expect(await patients.getVisiblePatientCount(page)).toBe(0);
  188 |   });
  189 | });
  190 | 
```