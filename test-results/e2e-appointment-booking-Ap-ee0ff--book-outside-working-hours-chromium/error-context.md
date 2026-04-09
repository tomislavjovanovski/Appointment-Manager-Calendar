# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/appointment-booking.spec.ts >> Appointment Booking — Validation >> cannot book outside working hours
- Location: tests/e2e/appointment-booking.spec.ts:96:3

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
  1   | // tests/e2e/appointment-booking.spec.ts
  2   | // Critical path: booking an appointment end-to-end.
  3   | // Also covers: validation, out-of-hours, storage consistency.
  4   | 
  5   | import { test, expect } from '../fixtures/base';
  6   | import { PATIENTS, APPOINTMENTS, nextWorkingSlot, WORKING_HOURS } from '../test-data/seed';
  7   | 
  8   | test.describe('Appointment Booking — Core Flow', () => {
  9   |   test('books a consultation with an existing patient and persists to storage', async ({
  10  |     pageWithPatients: page, booking, storage,
  11  |   }) => {
  12  |     await test.step('Navigate to scheduler', async () => {
  13  |       await booking.goToScheduler(page);
  14  |     });
  15  | 
  16  |     await test.step('Open a time slot and fill form', async () => {
  17  |       await booking.openSlot(page, nextWorkingSlot(1, 10));
  18  |       await booking.fillBookingForm(page, {
  19  |         patientId: PATIENTS.alice.id,
  20  |         type: APPOINTMENTS.consultation.type,
  21  |         duration: APPOINTMENTS.consultation.duration,
  22  |         notes: APPOINTMENTS.consultation.notes,
  23  |         syncToGoogle: false,
  24  |       });
  25  |     });
  26  | 
  27  |     await test.step('Submit and confirm toast', async () => {
  28  |       await booking.submit(page);
  29  |       await expect(page.getByTestId('toast-success')).toBeVisible();
  30  |     });
  31  | 
  32  |     await test.step('Verify appointment appears in scheduler UI', async () => {
  33  |       const slot = page.getByTestId('appointment-block').filter({
  34  |         hasText: `${PATIENTS.alice.firstName} ${PATIENTS.alice.lastName}`,
  35  |       });
  36  |       await expect(slot).toBeVisible();
  37  |     });
  38  | 
  39  |     await test.step('Verify appointment persisted to LocalStorage', async () => {
  40  |       await storage.assertAppointmentExistsInStorage(page, {
  41  |         patientId: PATIENTS.alice.id,
  42  |         type: APPOINTMENTS.consultation.type,
  43  |       });
  44  |     });
  45  |   });
  46  | 
  47  |   test('appointment count in LocalStorage increments by exactly 1 after booking', async ({
  48  |     pageWithPatients: page, booking, storage,
  49  |   }) => {
  50  |     const countBefore = await storage.count(page, 'appointments');
  51  | 
  52  |     await booking.goToScheduler(page);
  53  |     await booking.book(page, {
  54  |       patientId: PATIENTS.alice.id,
  55  |       type: 'consultation',
  56  |       duration: 30,
  57  |     });
  58  | 
  59  |     const countAfter = await storage.count(page, 'appointments');
  60  |     expect(countAfter).toBe(countBefore + 1);
  61  |   });
  62  | });
  63  | 
  64  | test.describe('Appointment Booking — Validation', () => {
  65  |   test('submit with no patient selected shows validation error', async ({
  66  |     pageWithPatients: page, booking,
  67  |   }) => {
  68  |     await booking.goToScheduler(page);
  69  |     await booking.openSlot(page);
  70  | 
  71  |     await test.step('Submit empty form', async () => {
  72  |       await booking.submitAndExpectError(page, 'error-patient-required');
  73  |     });
  74  | 
  75  |     await test.step('Dialog stays open — no partial save', async () => {
  76  |       await expect(page.getByTestId('booking-dialog')).toBeVisible();
  77  |     });
  78  |   });
  79  | 
  80  |   test('submit with invalid notes length shows character-limit error', async ({
  81  |     pageWithPatients: page, booking,
  82  |   }) => {
  83  |     await booking.goToScheduler(page);
  84  |     await booking.openSlot(page);
  85  | 
  86  |     await booking.fillBookingForm(page, {
  87  |       patientId: PATIENTS.alice.id,
  88  |       type: 'consultation',
  89  |       duration: 30,
  90  |       notes: 'x'.repeat(1001), // exceeds reasonable 1000-char limit
  91  |     });
  92  | 
  93  |     await booking.submitAndExpectError(page, 'error-notes-too-long');
  94  |   });
  95  | 
  96  |   test('cannot book outside working hours', async ({
  97  |     pageWithPatients: page,
  98  |   }) => {
  99  |     await test.step('Navigate to scheduler', async () => {
> 100 |       await page.getByTestId('nav-scheduler').click();
      |                                               ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  101 |     });
  102 | 
  103 |     await test.step('Attempt to click a slot before working hours start', async () => {
  104 |       const earlySlot = page.getByTestId(`time-slot-${WORKING_HOURS.start - 1}:00`);
  105 | 
  106 |       // If rendered, it should be disabled; if not rendered, it shouldn't be clickable
  107 |       const isVisible = await earlySlot.isVisible();
  108 |       if (isVisible) {
  109 |         await expect(earlySlot).toHaveAttribute('aria-disabled', 'true');
  110 |       } else {
  111 |         // Slot not rendered at all = correct behaviour
  112 |         expect(isVisible).toBe(false);
  113 |       }
  114 |     });
  115 |   });
  116 | });
  117 | 
  118 | test.describe('Appointment Booking — Status Lifecycle', () => {
  119 |   // Seed one appointment, then cycle through all statuses
  120 |   test('appointment transitions: scheduled → completed → cancelled → no-show', async ({
  121 |     pageWithPatients: page, booking, storage,
  122 |   }) => {
  123 |     // Arrange: book appointment first
  124 |     await booking.goToScheduler(page);
  125 |     await booking.book(page, {
  126 |       patientId: PATIENTS.alice.id,
  127 |       type: 'consultation',
  128 |       duration: 30,
  129 |     });
  130 | 
  131 |     const statuses = ['completed', 'cancelled', 'no-show', 'scheduled'] as const;
  132 | 
  133 |     for (const status of statuses) {
  134 |       await test.step(`Set status to "${status}"`, async () => {
  135 |         const appointmentBlock = page
  136 |           .getByTestId('appointment-block')
  137 |           .filter({ hasText: PATIENTS.alice.firstName })
  138 |           .first();
  139 | 
  140 |         await booking.changeStatus(page, appointmentBlock.toString(), status);
  141 | 
  142 |         // Verify CSS class reflects the new status (colour coding)
  143 |         await expect(appointmentBlock).toHaveAttribute('data-status', status);
  144 | 
  145 |         // Cross-check with storage
  146 |         const appointments = await storage.getAll(page, 'appointments') as { status: string }[];
  147 |         const latest = appointments[appointments.length - 1];
  148 |         expect(latest.status).toBe(status);
  149 |       });
  150 |     }
  151 |   });
  152 | });
  153 | 
  154 | test.describe('Appointment Booking — Refresh Resilience', () => {
  155 |   test('booking dialog dismissed on page refresh — no orphaned appointment', async ({
  156 |     pageWithPatients: page, booking, storage,
  157 |   }) => {
  158 |     const countBefore = await storage.count(page, 'appointments');
  159 | 
  160 |     await booking.goToScheduler(page);
  161 |     await booking.openSlot(page);
  162 | 
  163 |     await test.step('Partially fill form (do NOT submit)', async () => {
  164 |       await booking.fillBookingForm(page, {
  165 |         patientId: PATIENTS.alice.id,
  166 |         type: 'consultation',
  167 |         duration: 30,
  168 |       });
  169 |     });
  170 | 
  171 |     await test.step('Refresh before submitting', async () => {
  172 |       await page.reload();
  173 |       await page.waitForLoadState('networkidle');
  174 |     });
  175 | 
  176 |     await test.step('Dialog is gone, storage count unchanged', async () => {
  177 |       await expect(page.getByTestId('booking-dialog')).not.toBeVisible();
  178 |       const countAfter = await storage.count(page, 'appointments');
  179 |       expect(countAfter).toBe(countBefore);
  180 |     });
  181 |   });
  182 | });
  183 | 
```