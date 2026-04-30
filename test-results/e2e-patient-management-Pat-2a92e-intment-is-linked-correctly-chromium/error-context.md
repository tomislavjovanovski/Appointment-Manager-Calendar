# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/patient-management.spec.ts >> Patient Management — Inline Creation During Booking >> creates a new patient inline during booking and appointment is linked correctly
- Location: tests/e2e/patient-management.spec.ts:108:3

# Error details

```
Error: locator.selectOption: Error: Element is not a <select> element
Call log:
  - waiting for getByTestId('appointment-type-select')
    - locator resolved to <button dir="ltr" type="button" role="combobox" data-state="closed" aria-expanded="false" aria-autocomplete="none" aria-controls="radix-:rf:" data-testid="appointment-type-select" class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">…</button>
  - attempting select option action
    - waiting for element to be visible and enabled

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
            - generic: No appointments scheduled
            - generic:
              - generic:
                - generic:
                  - generic:
                    - img
                  - heading [level=2]: Weekly Schedule
                - paragraph: "Working hours: 08:00 - 18:00"
              - generic:
                - button:
                  - img
                  - text: Google Calendar
                - button:
                  - img
                  - text: New Appointment
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - button:
                        - img
                      - generic: 27 Apr – 3 May 2026
                      - button:
                        - img
                  - generic:
                    - button: This week
                    - button:
                      - img
                      - generic: Jump to date
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - generic:
                            - paragraph: "27"
                            - paragraph: Mon
                        - generic:
                          - generic:
                            - paragraph: "28"
                            - paragraph: Tue
                        - generic:
                          - generic:
                            - paragraph: "29"
                            - paragraph: Wed
                        - generic:
                          - generic:
                            - paragraph: "30"
                            - paragraph: Thu
                        - generic:
                          - generic:
                            - paragraph: "01"
                            - paragraph: Fri
                        - generic:
                          - generic:
                            - paragraph: "02"
                            - paragraph: Sat
                        - generic:
                          - generic:
                            - paragraph: "03"
                            - paragraph: Sun
                      - generic:
                        - generic:
                          - generic: 08:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 08:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 09:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 09:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 10:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 10:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 11:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 11:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 12:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 12:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 13:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 13:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 14:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 14:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 15:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 15:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 16:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 16:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 17:00
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - generic: 17:30
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
                        - generic:
                          - button
            - generic:
              - generic:
                - heading [level=3]: Status Legend
              - generic:
                - generic:
                  - generic: Scheduled
                  - generic: Completed
                  - generic: Cancelled
                  - generic: No Show
                  - generic: Google Calendar
  - dialog "Create Appointment & Patient" [ref=e2]:
    - generic [ref=e3]:
      - heading "Create Appointment & Patient" [level=2] [ref=e4]:
        - img [ref=e5]
        - text: Create Appointment & Patient
      - paragraph [ref=e7]: Schedule a new appointment and manage patient information.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "Patient Select Existing" [level=3] [ref=e11]:
          - generic [ref=e12]:
            - img [ref=e13]
            - text: Patient
          - button "Select Existing" [ref=e16] [cursor=pointer]:
            - img
            - text: Select Existing
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]:
              - text: Name *
              - textbox "Name *" [ref=e21]:
                - /placeholder: Patient name
                - text: Carol
            - generic [ref=e22]:
              - text: Name *
              - textbox "Name *" [ref=e23]:
                - /placeholder: Patient name
                - text: Osei
            - generic [ref=e24]:
              - text: Email *
              - textbox "Email *" [ref=e25]:
                - /placeholder: email@example.com
                - text: carol.osei@test.medical
          - generic [ref=e26]:
            - generic [ref=e27]:
              - text: Phone *
              - textbox "Phone *" [ref=e28]:
                - /placeholder: (555) 123-4567
                - text: 555-0199
            - generic [ref=e29]:
              - text: Date of Birth
              - textbox [active] [ref=e30]: 1990-07-04
          - generic [ref=e31]:
            - text: Address
            - textbox "Address" [ref=e32]:
              - /placeholder: 123 Main St, City, State 12345
          - generic [ref=e33]:
            - text: Emergency Contact
            - textbox "Emergency Contact" [ref=e34]:
              - /placeholder: Name & Phone
          - generic [ref=e35]:
            - text: Notes
            - textbox "Notes" [ref=e36]:
              - /placeholder: Additional notes...
          - button "Create Patient" [ref=e37] [cursor=pointer]:
            - img
            - text: Create Patient
      - generic [ref=e38]:
        - heading "Appointment Details" [level=3] [ref=e40]:
          - img [ref=e41]
          - text: Appointment Details
        - generic [ref=e44]:
          - generic [ref=e45]:
            - generic [ref=e46]:
              - text: Date *
              - textbox "Date *" [disabled] [ref=e47]: 2026-04-27
            - generic [ref=e48]:
              - text: Start Time *
              - textbox "Start Time *" [disabled] [ref=e49]: 10:00
          - generic [ref=e50]:
            - generic [ref=e51]:
              - text: Duration
              - combobox [ref=e52] [cursor=pointer]:
                - generic: 1 hour
                - img [ref=e53]
              - combobox [ref=e55]
            - generic [ref=e56]:
              - text: Type
              - combobox [ref=e57] [cursor=pointer]:
                - generic: Consultation
                - img [ref=e58]
              - combobox [ref=e60]
          - generic [ref=e61]:
            - text: Appointment Notes
            - textbox "Appointment Notes" [ref=e62]:
              - /placeholder: Additional notes for this appointment...
          - generic [ref=e63]:
            - checkbox "Sync to Google Calendar" [checked] [ref=e64] [cursor=pointer]:
              - generic:
                - img
            - checkbox [checked]
            - generic [ref=e65]: Sync to Google Calendar
          - generic [ref=e66]:
            - button "Cancel" [ref=e67] [cursor=pointer]
            - button "Create Appointment" [disabled]:
              - img
              - text: Create Appointment
    - button "Close" [ref=e68] [cursor=pointer]:
      - img [ref=e69]
      - generic [ref=e72]: Close
```

# Test source

```ts
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
  103 |     await expect(page.getByTestId('error-email-invalid')).toBeVisible();
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
> 132 |       await page.getByTestId('appointment-type-select').selectOption('consultation');
      |                                                         ^ Error: locator.selectOption: Error: Element is not a <select> element
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