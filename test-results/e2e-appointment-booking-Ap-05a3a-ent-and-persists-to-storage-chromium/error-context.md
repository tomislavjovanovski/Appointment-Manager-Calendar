# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/appointment-booking.spec.ts >> Appointment Booking — Core Flow >> books a consultation with an existing patient and persists to storage
- Location: tests/e2e/appointment-booking.spec.ts:9:3

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByTestId('nav-scheduler')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]:
        - img [ref=e8]
        - generic [ref=e12]:
          - heading "MediCal" [level=1] [ref=e13]
          - paragraph [ref=e14]: Appointment Manager
      - navigation [ref=e15]:
        - paragraph [ref=e16]: Menu
        - generic [ref=e17]:
          - button "Dashboard" [ref=e18] [cursor=pointer]:
            - img
            - text: Dashboard
          - button "Patients" [ref=e19] [cursor=pointer]:
            - img
            - text: Patients
          - button "Settings" [ref=e20] [cursor=pointer]:
            - img
            - text: Settings
      - generic [ref=e22]:
        - paragraph [ref=e23]: Standalone • Flexible
        - paragraph [ref=e24]: Data stored locally
    - main [ref=e25]:
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]:
              - img [ref=e32]
              - heading "Weekly Schedule" [level=2] [ref=e34]
            - paragraph [ref=e35]: "Working hours: 09:00 - 17:00"
          - generic [ref=e36]:
            - button "Google Calendar" [ref=e37] [cursor=pointer]:
              - img
              - text: Google Calendar
            - button "New Appointment" [ref=e38] [cursor=pointer]:
              - img
              - text: New Appointment
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e43]:
              - button "Previous week" [ref=e44] [cursor=pointer]:
                - img
              - generic [ref=e45]: 30 Mar – 5 Apr 2026
              - button "Next week" [ref=e46] [cursor=pointer]:
                - img
            - generic [ref=e47]:
              - button "This week" [ref=e48] [cursor=pointer]
              - button "Jump to date" [ref=e49] [cursor=pointer]:
                - img
                - generic [ref=e50]: Jump to date
          - generic [ref=e53]:
            - generic [ref=e54]:
              - generic [ref=e57]:
                - paragraph [ref=e58]: "30"
                - paragraph [ref=e59]: Mon
              - generic [ref=e61]:
                - paragraph [ref=e62]: "31"
                - paragraph [ref=e63]: Tue
              - generic [ref=e65]:
                - paragraph [ref=e66]: "01"
                - paragraph [ref=e67]: Wed
              - generic [ref=e69]:
                - paragraph [ref=e70]: "02"
                - paragraph [ref=e71]: Thu
              - generic [ref=e73]:
                - paragraph [ref=e74]: "03"
                - paragraph [ref=e75]: Fri
              - generic [ref=e77]:
                - paragraph [ref=e78]: "04"
                - paragraph [ref=e79]: Sat
              - generic [ref=e81]:
                - paragraph [ref=e82]: "05"
                - paragraph [ref=e83]: Sun
            - generic [ref=e84]:
              - generic [ref=e86]: 09:00
              - button "Monday, March 30, 2026 at 9:00:00 AM GMT+2 - Monday, March 30, 2026 at 9:30:00 AM GMT+2" [ref=e88] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 9:00:00 AM GMT+2 - Tuesday, March 31, 2026 at 9:30:00 AM GMT+2" [ref=e90] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 9:00:00 AM GMT+2 - Wednesday, April 1, 2026 at 9:30:00 AM GMT+2" [ref=e92] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 9:00:00 AM GMT+2 - Thursday, April 2, 2026 at 9:30:00 AM GMT+2" [ref=e94] [cursor=pointer]
              - button "Friday, April 3, 2026 at 9:00:00 AM GMT+2 - Friday, April 3, 2026 at 9:30:00 AM GMT+2" [ref=e96] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 9:00:00 AM GMT+2 - Saturday, April 4, 2026 at 9:30:00 AM GMT+2" [ref=e98] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 9:00:00 AM GMT+2 - Sunday, April 5, 2026 at 9:30:00 AM GMT+2" [ref=e103] [cursor=pointer]
              - generic [ref=e105]: 09:30
              - button "Monday, March 30, 2026 at 9:30:00 AM GMT+2 - Monday, March 30, 2026 at 10:00:00 AM GMT+2" [ref=e107] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 9:30:00 AM GMT+2 - Tuesday, March 31, 2026 at 10:00:00 AM GMT+2" [ref=e109] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 9:30:00 AM GMT+2 - Wednesday, April 1, 2026 at 10:00:00 AM GMT+2" [ref=e111] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 9:30:00 AM GMT+2 - Thursday, April 2, 2026 at 10:00:00 AM GMT+2" [ref=e113] [cursor=pointer]
              - button "Friday, April 3, 2026 at 9:30:00 AM GMT+2 - Friday, April 3, 2026 at 10:00:00 AM GMT+2" [ref=e115] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 9:30:00 AM GMT+2 - Saturday, April 4, 2026 at 10:00:00 AM GMT+2" [ref=e117] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 9:30:00 AM GMT+2 - Sunday, April 5, 2026 at 10:00:00 AM GMT+2" [ref=e119] [cursor=pointer]
              - generic [ref=e121]: 10:00
              - button "Monday, March 30, 2026 at 10:00:00 AM GMT+2 - Monday, March 30, 2026 at 10:30:00 AM GMT+2" [ref=e123] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 10:00:00 AM GMT+2 - Tuesday, March 31, 2026 at 10:30:00 AM GMT+2" [ref=e125] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 10:00:00 AM GMT+2 - Wednesday, April 1, 2026 at 10:30:00 AM GMT+2" [ref=e127] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 10:00:00 AM GMT+2 - Thursday, April 2, 2026 at 10:30:00 AM GMT+2" [ref=e129] [cursor=pointer]
              - button "Friday, April 3, 2026 at 10:00:00 AM GMT+2 - Friday, April 3, 2026 at 10:30:00 AM GMT+2" [ref=e131] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 10:00:00 AM GMT+2 - Saturday, April 4, 2026 at 10:30:00 AM GMT+2" [ref=e133] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 10:00:00 AM GMT+2 - Sunday, April 5, 2026 at 10:30:00 AM GMT+2" [ref=e135] [cursor=pointer]
              - generic [ref=e137]: 10:30
              - button "Monday, March 30, 2026 at 10:30:00 AM GMT+2 - Monday, March 30, 2026 at 11:00:00 AM GMT+2" [ref=e139] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 10:30:00 AM GMT+2 - Tuesday, March 31, 2026 at 11:00:00 AM GMT+2" [ref=e141] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 10:30:00 AM GMT+2 - Wednesday, April 1, 2026 at 11:00:00 AM GMT+2" [ref=e143] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 10:30:00 AM GMT+2 - Thursday, April 2, 2026 at 11:00:00 AM GMT+2" [ref=e145] [cursor=pointer]
              - button "Friday, April 3, 2026 at 10:30:00 AM GMT+2 - Friday, April 3, 2026 at 11:00:00 AM GMT+2" [ref=e147] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 10:30:00 AM GMT+2 - Saturday, April 4, 2026 at 11:00:00 AM GMT+2" [ref=e149] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 10:30:00 AM GMT+2 - Sunday, April 5, 2026 at 11:00:00 AM GMT+2" [ref=e151] [cursor=pointer]
              - generic [ref=e153]: 11:00
              - button "Monday, March 30, 2026 at 11:00:00 AM GMT+2 - Monday, March 30, 2026 at 11:30:00 AM GMT+2" [ref=e155] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 11:00:00 AM GMT+2 - Tuesday, March 31, 2026 at 11:30:00 AM GMT+2" [ref=e157] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 11:00:00 AM GMT+2 - Wednesday, April 1, 2026 at 11:30:00 AM GMT+2" [ref=e159] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 11:00:00 AM GMT+2 - Thursday, April 2, 2026 at 11:30:00 AM GMT+2" [ref=e161] [cursor=pointer]
              - button "Friday, April 3, 2026 at 11:00:00 AM GMT+2 - Friday, April 3, 2026 at 11:30:00 AM GMT+2" [ref=e163] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 11:00:00 AM GMT+2 - Saturday, April 4, 2026 at 11:30:00 AM GMT+2" [ref=e165] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 11:00:00 AM GMT+2 - Sunday, April 5, 2026 at 11:30:00 AM GMT+2" [ref=e167] [cursor=pointer]
              - generic [ref=e169]: 11:30
              - button "Monday, March 30, 2026 at 11:30:00 AM GMT+2 - Monday, March 30, 2026 at 12:00:00 PM GMT+2" [ref=e171] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 11:30:00 AM GMT+2 - Tuesday, March 31, 2026 at 12:00:00 PM GMT+2" [ref=e173] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 11:30:00 AM GMT+2 - Wednesday, April 1, 2026 at 12:00:00 PM GMT+2" [ref=e175] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 11:30:00 AM GMT+2 - Thursday, April 2, 2026 at 12:00:00 PM GMT+2" [ref=e177] [cursor=pointer]
              - button "Friday, April 3, 2026 at 11:30:00 AM GMT+2 - Friday, April 3, 2026 at 12:00:00 PM GMT+2" [ref=e179] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 11:30:00 AM GMT+2 - Saturday, April 4, 2026 at 12:00:00 PM GMT+2" [ref=e181] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 11:30:00 AM GMT+2 - Sunday, April 5, 2026 at 12:00:00 PM GMT+2" [ref=e183] [cursor=pointer]
              - generic [ref=e185]: 12:00
              - button "Monday, March 30, 2026 at 12:00:00 PM GMT+2 - Monday, March 30, 2026 at 12:30:00 PM GMT+2" [ref=e187] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 12:00:00 PM GMT+2 - Tuesday, March 31, 2026 at 12:30:00 PM GMT+2" [ref=e189] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 12:00:00 PM GMT+2 - Wednesday, April 1, 2026 at 12:30:00 PM GMT+2" [ref=e191] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 12:00:00 PM GMT+2 - Thursday, April 2, 2026 at 12:30:00 PM GMT+2" [ref=e193] [cursor=pointer]
              - button "Friday, April 3, 2026 at 12:00:00 PM GMT+2 - Friday, April 3, 2026 at 12:30:00 PM GMT+2" [ref=e195] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 12:00:00 PM GMT+2 - Saturday, April 4, 2026 at 12:30:00 PM GMT+2" [ref=e197] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 12:00:00 PM GMT+2 - Sunday, April 5, 2026 at 12:30:00 PM GMT+2" [ref=e199] [cursor=pointer]
              - generic [ref=e201]: 12:30
              - button "Monday, March 30, 2026 at 12:30:00 PM GMT+2 - Monday, March 30, 2026 at 1:00:00 PM GMT+2" [ref=e203] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 12:30:00 PM GMT+2 - Tuesday, March 31, 2026 at 1:00:00 PM GMT+2" [ref=e205] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 12:30:00 PM GMT+2 - Wednesday, April 1, 2026 at 1:00:00 PM GMT+2" [ref=e207] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 12:30:00 PM GMT+2 - Thursday, April 2, 2026 at 1:00:00 PM GMT+2" [ref=e209] [cursor=pointer]
              - button "Friday, April 3, 2026 at 12:30:00 PM GMT+2 - Friday, April 3, 2026 at 1:00:00 PM GMT+2" [ref=e211] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 12:30:00 PM GMT+2 - Saturday, April 4, 2026 at 1:00:00 PM GMT+2" [ref=e213] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 12:30:00 PM GMT+2 - Sunday, April 5, 2026 at 1:00:00 PM GMT+2" [ref=e215] [cursor=pointer]
              - generic [ref=e217]: 13:00
              - button "Monday, March 30, 2026 at 1:00:00 PM GMT+2 - Monday, March 30, 2026 at 1:30:00 PM GMT+2" [ref=e219] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 1:00:00 PM GMT+2 - Tuesday, March 31, 2026 at 1:30:00 PM GMT+2" [ref=e221] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 1:00:00 PM GMT+2 - Wednesday, April 1, 2026 at 1:30:00 PM GMT+2" [ref=e223] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 1:00:00 PM GMT+2 - Thursday, April 2, 2026 at 1:30:00 PM GMT+2" [ref=e225] [cursor=pointer]
              - button "Friday, April 3, 2026 at 1:00:00 PM GMT+2 - Friday, April 3, 2026 at 1:30:00 PM GMT+2" [ref=e227] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 1:00:00 PM GMT+2 - Saturday, April 4, 2026 at 1:30:00 PM GMT+2" [ref=e229] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 1:00:00 PM GMT+2 - Sunday, April 5, 2026 at 1:30:00 PM GMT+2" [ref=e231] [cursor=pointer]
              - generic [ref=e233]: 13:30
              - button "Monday, March 30, 2026 at 1:30:00 PM GMT+2 - Monday, March 30, 2026 at 2:00:00 PM GMT+2" [ref=e235] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 1:30:00 PM GMT+2 - Tuesday, March 31, 2026 at 2:00:00 PM GMT+2" [ref=e237] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 1:30:00 PM GMT+2 - Wednesday, April 1, 2026 at 2:00:00 PM GMT+2" [ref=e239] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 1:30:00 PM GMT+2 - Thursday, April 2, 2026 at 2:00:00 PM GMT+2" [ref=e241] [cursor=pointer]
              - button "Friday, April 3, 2026 at 1:30:00 PM GMT+2 - Friday, April 3, 2026 at 2:00:00 PM GMT+2" [ref=e243] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 1:30:00 PM GMT+2 - Saturday, April 4, 2026 at 2:00:00 PM GMT+2" [ref=e245] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 1:30:00 PM GMT+2 - Sunday, April 5, 2026 at 2:00:00 PM GMT+2" [ref=e247] [cursor=pointer]
              - generic [ref=e249]: 14:00
              - button "Monday, March 30, 2026 at 2:00:00 PM GMT+2 - Monday, March 30, 2026 at 2:30:00 PM GMT+2" [ref=e251] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 2:00:00 PM GMT+2 - Tuesday, March 31, 2026 at 2:30:00 PM GMT+2" [ref=e253] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 2:00:00 PM GMT+2 - Wednesday, April 1, 2026 at 2:30:00 PM GMT+2" [ref=e255] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 2:00:00 PM GMT+2 - Thursday, April 2, 2026 at 2:30:00 PM GMT+2" [ref=e257] [cursor=pointer]
              - button "Friday, April 3, 2026 at 2:00:00 PM GMT+2 - Friday, April 3, 2026 at 2:30:00 PM GMT+2" [ref=e259] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 2:00:00 PM GMT+2 - Saturday, April 4, 2026 at 2:30:00 PM GMT+2" [ref=e261] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 2:00:00 PM GMT+2 - Sunday, April 5, 2026 at 2:30:00 PM GMT+2" [ref=e263] [cursor=pointer]
              - generic [ref=e265]: 14:30
              - button "Monday, March 30, 2026 at 2:30:00 PM GMT+2 - Monday, March 30, 2026 at 3:00:00 PM GMT+2" [ref=e267] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 2:30:00 PM GMT+2 - Tuesday, March 31, 2026 at 3:00:00 PM GMT+2" [ref=e269] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 2:30:00 PM GMT+2 - Wednesday, April 1, 2026 at 3:00:00 PM GMT+2" [ref=e271] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 2:30:00 PM GMT+2 - Thursday, April 2, 2026 at 3:00:00 PM GMT+2" [ref=e273] [cursor=pointer]
              - button "Friday, April 3, 2026 at 2:30:00 PM GMT+2 - Friday, April 3, 2026 at 3:00:00 PM GMT+2" [ref=e275] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 2:30:00 PM GMT+2 - Saturday, April 4, 2026 at 3:00:00 PM GMT+2" [ref=e277] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 2:30:00 PM GMT+2 - Sunday, April 5, 2026 at 3:00:00 PM GMT+2" [ref=e279] [cursor=pointer]
              - generic [ref=e281]: 15:00
              - button "Monday, March 30, 2026 at 3:00:00 PM GMT+2 - Monday, March 30, 2026 at 3:30:00 PM GMT+2" [ref=e283] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 3:00:00 PM GMT+2 - Tuesday, March 31, 2026 at 3:30:00 PM GMT+2" [ref=e285] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 3:00:00 PM GMT+2 - Wednesday, April 1, 2026 at 3:30:00 PM GMT+2" [ref=e287] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 3:00:00 PM GMT+2 - Thursday, April 2, 2026 at 3:30:00 PM GMT+2" [ref=e289] [cursor=pointer]
              - button "Friday, April 3, 2026 at 3:00:00 PM GMT+2 - Friday, April 3, 2026 at 3:30:00 PM GMT+2" [ref=e291] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 3:00:00 PM GMT+2 - Saturday, April 4, 2026 at 3:30:00 PM GMT+2" [ref=e293] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 3:00:00 PM GMT+2 - Sunday, April 5, 2026 at 3:30:00 PM GMT+2" [ref=e295] [cursor=pointer]
              - generic [ref=e297]: 15:30
              - button "Monday, March 30, 2026 at 3:30:00 PM GMT+2 - Monday, March 30, 2026 at 4:00:00 PM GMT+2" [ref=e299] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 3:30:00 PM GMT+2 - Tuesday, March 31, 2026 at 4:00:00 PM GMT+2" [ref=e301] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 3:30:00 PM GMT+2 - Wednesday, April 1, 2026 at 4:00:00 PM GMT+2" [ref=e303] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 3:30:00 PM GMT+2 - Thursday, April 2, 2026 at 4:00:00 PM GMT+2" [ref=e305] [cursor=pointer]
              - button "Friday, April 3, 2026 at 3:30:00 PM GMT+2 - Friday, April 3, 2026 at 4:00:00 PM GMT+2" [ref=e307] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 3:30:00 PM GMT+2 - Saturday, April 4, 2026 at 4:00:00 PM GMT+2" [ref=e309] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 3:30:00 PM GMT+2 - Sunday, April 5, 2026 at 4:00:00 PM GMT+2" [ref=e311] [cursor=pointer]
              - generic [ref=e313]: 16:00
              - button "Monday, March 30, 2026 at 4:00:00 PM GMT+2 - Monday, March 30, 2026 at 4:30:00 PM GMT+2" [ref=e315] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 4:00:00 PM GMT+2 - Tuesday, March 31, 2026 at 4:30:00 PM GMT+2" [ref=e317] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 4:00:00 PM GMT+2 - Wednesday, April 1, 2026 at 4:30:00 PM GMT+2" [ref=e319] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 4:00:00 PM GMT+2 - Thursday, April 2, 2026 at 4:30:00 PM GMT+2" [ref=e321] [cursor=pointer]
              - button "Friday, April 3, 2026 at 4:00:00 PM GMT+2 - Friday, April 3, 2026 at 4:30:00 PM GMT+2" [ref=e323] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 4:00:00 PM GMT+2 - Saturday, April 4, 2026 at 4:30:00 PM GMT+2" [ref=e325] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 4:00:00 PM GMT+2 - Sunday, April 5, 2026 at 4:30:00 PM GMT+2" [ref=e327] [cursor=pointer]
              - generic [ref=e329]: 16:30
              - button "Monday, March 30, 2026 at 4:30:00 PM GMT+2 - Monday, March 30, 2026 at 5:00:00 PM GMT+2" [ref=e331] [cursor=pointer]
              - button "Tuesday, March 31, 2026 at 4:30:00 PM GMT+2 - Tuesday, March 31, 2026 at 5:00:00 PM GMT+2" [ref=e333] [cursor=pointer]
              - button "Wednesday, April 1, 2026 at 4:30:00 PM GMT+2 - Wednesday, April 1, 2026 at 5:00:00 PM GMT+2" [ref=e335] [cursor=pointer]
              - button "Thursday, April 2, 2026 at 4:30:00 PM GMT+2 - Thursday, April 2, 2026 at 5:00:00 PM GMT+2" [ref=e337] [cursor=pointer]
              - button "Friday, April 3, 2026 at 4:30:00 PM GMT+2 - Friday, April 3, 2026 at 5:00:00 PM GMT+2" [ref=e339] [cursor=pointer]
              - button "Saturday, April 4, 2026 at 4:30:00 PM GMT+2 - Saturday, April 4, 2026 at 5:00:00 PM GMT+2" [ref=e341] [cursor=pointer]
              - button "Sunday, April 5, 2026 at 4:30:00 PM GMT+2 - Sunday, April 5, 2026 at 5:00:00 PM GMT+2" [ref=e343] [cursor=pointer]
        - generic [ref=e344]:
          - heading "Status Legend" [level=3] [ref=e346]
          - generic [ref=e348]:
            - generic [ref=e349]: Scheduled
            - generic [ref=e351]: Completed
            - generic [ref=e353]: Cancelled
            - generic [ref=e355]: No Show
            - generic [ref=e357]: Google Calendar
```

# Test source

```ts
  1   | // tests/utils/bookingHelper.ts
  2   | // Page-Object style helper for the booking flow.
  3   | // Tests use this instead of duplicating selectors.
  4   | 
  5   | import { Page, expect } from '@playwright/test';
  6   | import { nextWorkingSlot } from '../test-data/seed';
  7   | 
  8   | export interface BookingOptions {
  9   |   patientId?: string;         // select existing patient
  10  |   newPatient?: {              // OR create inline
  11  |     firstName: string;
  12  |     lastName: string;
  13  |     email: string;
  14  |     phone: string;
  15  |     dateOfBirth: string;
  16  |   };
  17  |   type: 'consultation' | 'follow-up' | 'procedure';
  18  |   duration: 30 | 60 | 120;
  19  |   notes?: string;
  20  |   syncToGoogle?: boolean;
  21  |   slotDate?: Date;            // defaults to nextWorkingSlot()
  22  | }
  23  | 
  24  | export const bookingHelper = {
  25  |   // ── Navigate ──────────────────────────────────────────────────────────────
  26  | 
  27  |   async goToScheduler(page: Page): Promise<void> {
> 28  |     await page.getByTestId('nav-scheduler').click();
      |                                             ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  29  |     await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  30  |   },
  31  | 
  32  |   // ── Open booking dialog ────────────────────────────────────────────────────
  33  | 
  34  |   async openSlot(page: Page, slot?: Date): Promise<void> {
  35  |     const target = slot ?? nextWorkingSlot();
  36  |     const hour = target.getHours();
  37  | 
  38  |     // Click the correct hour cell in the scheduler grid
  39  |     await page
  40  |       .getByTestId(`time-slot-${hour}:00`)
  41  |       .first()
  42  |       .click();
  43  | 
  44  |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  45  |   },
  46  | 
  47  |   // ── Fill the booking form ─────────────────────────────────────────────────
  48  | 
  49  |   async fillBookingForm(page: Page, options: BookingOptions): Promise<void> {
  50  |     const dialog = page.getByTestId('booking-dialog');
  51  | 
  52  |     // Patient selection
  53  |     if (options.patientId) {
  54  |       await dialog.getByTestId('patient-select').click();
  55  |       await page
  56  |         .getByTestId(`patient-option-${options.patientId}`)
  57  |         .click();
  58  |     } else if (options.newPatient) {
  59  |       await dialog.getByTestId('create-new-patient-btn').click();
  60  |       await this.fillNewPatientForm(page, options.newPatient);
  61  |     }
  62  | 
  63  |     // Appointment type
  64  |     await dialog.getByTestId('appointment-type-select').selectOption(options.type);
  65  | 
  66  |     // Duration
  67  |     await dialog.getByTestId('duration-select').selectOption(String(options.duration));
  68  | 
  69  |     // Notes
  70  |     if (options.notes) {
  71  |       await dialog.getByTestId('appointment-notes').fill(options.notes);
  72  |     }
  73  | 
  74  |     // Google sync toggle
  75  |     if (options.syncToGoogle !== undefined) {
  76  |       const toggle = dialog.getByTestId('google-sync-toggle');
  77  |       const isChecked = await toggle.isChecked();
  78  |       if (isChecked !== options.syncToGoogle) await toggle.click();
  79  |     }
  80  |   },
  81  | 
  82  |   async fillNewPatientForm(
  83  |     page: Page,
  84  |     patient: BookingOptions['newPatient'] & object,
  85  |   ): Promise<void> {
  86  |     const panel = page.getByTestId('new-patient-panel');
  87  |     await expect(panel).toBeVisible();
  88  | 
  89  |     await panel.getByTestId('patient-first-name').fill(patient.firstName);
  90  |     await panel.getByTestId('patient-last-name').fill(patient.lastName);
  91  |     await panel.getByTestId('patient-email').fill(patient.email);
  92  |     await panel.getByTestId('patient-phone').fill(patient.phone);
  93  |     await panel.getByTestId('patient-dob').fill(patient.dateOfBirth);
  94  |   },
  95  | 
  96  |   // ── Submit ────────────────────────────────────────────────────────────────
  97  | 
  98  |   async submit(page: Page): Promise<void> {
  99  |     await page.getByTestId('booking-submit-btn').click();
  100 |     // Wait for dialog to close — this confirms success without arbitrary waits
  101 |     await expect(page.getByTestId('booking-dialog')).not.toBeVisible({
  102 |       timeout: 8_000,
  103 |     });
  104 |   },
  105 | 
  106 |   async submitAndExpectError(page: Page, errorTestId: string): Promise<void> {
  107 |     await page.getByTestId('booking-submit-btn').click();
  108 |     await expect(page.getByTestId(errorTestId)).toBeVisible();
  109 |     // Dialog must remain open on validation failure
  110 |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  111 |   },
  112 | 
  113 |   // ── Full booking flow (convenience) ──────────────────────────────────────
  114 | 
  115 |   async book(page: Page, options: BookingOptions): Promise<void> {
  116 |     await this.openSlot(page, options.slotDate);
  117 |     await this.fillBookingForm(page, options);
  118 |     await this.submit(page);
  119 |     // Toast confirmation
  120 |     await expect(page.getByTestId('toast-success')).toBeVisible();
  121 |   },
  122 | 
  123 |   // ── Status change ─────────────────────────────────────────────────────────
  124 | 
  125 |   async changeStatus(
  126 |     page: Page,
  127 |     appointmentTestId: string,
  128 |     newStatus: 'scheduled' | 'completed' | 'cancelled' | 'no-show',
```