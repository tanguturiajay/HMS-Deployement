# MediCare+ UI Specification

App name: **MediCare+**
Tagline: "Your health, in your hands"
Subtitle: "Book appointments, track your care"

---

## Design System

### Colors
- Primary accent: Teal/green (used for buttons, links, status labels, active nav items)
- Background: White
- Text primary: Dark gray / near-black
- Text secondary: Medium gray
- Status — Confirmed: Green/teal
- Status — Pending: Orange/amber
- Border: Light gray (rounded input fields)
- Info banner: Light teal/mint background

### Typography
- App name: Medium weight, gray
- Hero heading: Large, bold, dark gray (2-line)
- Section headings: Bold, dark
- Body / labels: Regular, gray
- Links (e.g. "Forgot password?", "Register"): Teal, bold

### Input Fields
- Full-width rounded rectangle borders
- Light gray border
- Placeholder text in gray
- Label above each field

### Buttons
- Primary action button: Full-width, rounded, teal/green fill, white text
- Secondary/ghost button: Outlined rounded, no fill
- Segmented toggle (Sign in / Register): Pill-shaped container, active tab has white background with shadow

### Cards
- Rounded rectangle, white background, subtle shadow or border
- Used for: quick action tiles, appointment entries, doctor listings, admin approval items

### Bottom Navigation Bar
- 4 tabs: Home | Appointments | Profile | Alerts (patient) / Admin (admin role)
- Active tab: teal text
- Inactive tabs: gray text

---

## Screens

---

### 1. Patient Login & Register

**Sign In Tab**
- Logo: "MediCare+" centered, gray
- Hero text: "Your health, in your hands" (large, bold)
- Subtext: "Book appointments, track your care"
- Segmented toggle: [Sign in] [Register]
- Fields:
  - Email address (placeholder: you@email.com)
  - Password (masked, placeholder: ••••••••)
- Link: "Forgot password?" (teal, right-aligned)
- Button: "Sign in" (full-width, teal)
- Footer text: "Don't have an account?" + "Register" (teal link)

**Register Tab**
- Section divider: "Or register a new account"
- Fields:
  - Full name (placeholder: Arjun Sharma)
  - Date of birth (placeholder: DD/MM/YYYY) — half width
  - Gender (placeholder: Male / Female) — half width
  - Phone number (placeholder: +91 98765 43210)
  - Email (placeholder: arjun@email.com)
  - Password (placeholder: Create a password)
- Button: "Create account" (full-width, teal)

---

### 2. Patient Dashboard

**Header**
- Greeting: "GOOD MORNING" (small caps, gray)
- Patient name: "Arjun Sharma" (large, bold)
- Subtext: "How are you feeling today?"
- Avatar: Circle with initials "AS" (top right)

**Quick Actions Grid (2×2)**
- Book appointment (icon + label)
- My records (icon + label)
- Prescriptions (icon + label)
- Find doctor (icon + label)

**Upcoming Appointments Section**
- Section title: "Upcoming appointments"
- Appointment card layout:
  - Doctor avatar thumbnail (left)
  - Doctor name (bold)
  - Specialty
  - Date & time (teal)
  - Status badge: "Confirmed" (green) or "Pending" (orange) — right-aligned

  Example entries:
  - Dr. Priya Menon · Neurologist · Mon, 2 Jun · 10:30 AM · Confirmed
  - Dr. Ravi Kumar · Cardiologist · Thu, 5 Jun · 3:00 PM · Pending

**Book a New Appointment Section**
- Section title: "Book a new appointment"
- "Select department" dropdown (example: Cardiology, with chevron)
- "Available doctors" subsection:
  - Doctor card with initials avatar (teal), name, specialty + years exp, availability, "Select" button (teal text)
  - Example: Dr. Priya Menon · Neurologist · 12 yrs exp · Available Mon–Fri

**Appointment Booking Form (continued below)**
- Date field: dd-mm-yyyy (half width)
- Time slot dropdown: 10:00 AM (half width)
- Reason for visit: multiline text area (placeholder: "Describe symptoms briefly...")
- Button: "Request appointment" (full-width, teal outline/ghost)
- Info banner: "Confirmation email sent once appointment is approved"

**Bottom Nav:** Home | Appointments | Profile | Alerts

---

### 3. Patient Profile

**Profile Header**
- Circle avatar with initials "AS" (teal outline)
- Name: "Arjun Sharma" (large)
- Email: arjun.sharma@email.com
- Patient ID: #MCR-4892

**Stats Row (2 cards)**
- Total visits: 8 (bold teal number)
- Upcoming: 2 (bold teal number)

**Personal Information Section**
- Section title: "Personal information"
- Fields (editable):
  - Full name: Arjun Sharma
  - Date of birth: 14/03/1990 (half width)
  - Blood group: O+ (half width)
  - Phone: +91 98765 43210
  - Address: 12 Anna Nagar, Chennai, TN
- Button: "Save changes" (full-width, ghost/gray)

---

### 4. Admin Approval Panel (Doctor / Receptionist / Admin view)

**Header**
- Title: "Admin panel — Approvals"
- Subtitle: "Doctor / Receptionist / Admin view"

**Filter Tabs (horizontal scroll pill buttons)**
- All (12) — active, teal outline
- Pending (5)
- Approved (6)
- Rejected (count)

**Appointment Approval Cards**
Each card shows:
- Patient name (bold)
- Doctor name · Specialty
- Date & time
- Status badge: "Pending" (orange) or "Approved" (bold black/green)
- Action buttons: [Approve] [Reject] [View details] (text buttons, bold)
- If Approved: info banner "Confirmation email sent to patient"

Example entries:
- Meena Krishnan · Dr. Priya Menon · Neurology · Mon, 2 Jun · 10:30 AM · Pending → [Approve] [Reject] [View details]
- Raj Patel · Dr. Ravi Kumar · Cardiology · Thu, 5 Jun · 3:00 PM · Approved → banner shown
- Sunita Verma · Dr. Anita Rao · Dermatology · Sat, 7 Jun · 9:00 AM · Pending → [Approve] [Reject]

**Bottom Nav:** Home | Appointments | Profile (active, teal) | Admin

---

## Navigation Structure

| Role    | Bottom Nav Tabs                          |
|---------|------------------------------------------|
| Patient | Home · Appointments · Profile · Alerts   |
| Admin   | Home · Appointments · Profile · Admin    |

---

## Sample Data (from mockups)

- Patient: Arjun Sharma | arjun.sharma@email.com | #MCR-4892 | DOB: 14/03/1990 | Blood: O+ | Phone: +91 98765 43210
- Doctors: Dr. Priya Menon (Neurologist, 12 yrs), Dr. Ravi Kumar (Cardiologist), Dr. Anita Rao (Dermatologist)
- Departments: Cardiology, Neurology, Dermatology
