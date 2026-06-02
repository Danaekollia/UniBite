# UniBite – Φοιτητικό Food Sharing

Πλατφόρμα ανταλλαγής/μοιράσματος φαγητού μεταξύ φοιτητών. Οι μάγειρες δημοσιεύουν διαθέσιμες μερίδες, και οι καταναλωτές κάνουν αιτήματα χρησιμοποιώντας το σύστημα πόντων.

---

## Τεχνολογίες

- **Backend**: Node.js, Express 5, MySQL (mysql2), bcrypt, express-session, multer
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Χάρτης**: Leaflet.js + OpenStreetMap

---

## Προαπαιτούμενα

- Node.js v18+
- MySQL 8+

---

## Εγκατάσταση & Εκτέλεση

### 1. Κλωνοποίηση

```bash
git clone <repo-url>
cd UniBite
```

### 2. Βάση Δεδομένων

```sql
-- Εκτέλεσε το schema στον MySQL server σου:
source backend/db/schema.sql
```

Δημιουργεί αυτόματα τη βάση `unibite`, τους πίνακες και τον admin χρήστη:
- Email: `admin@unibite.gr`
- Password: `admin123`

### 3. Περιβάλλον

```bash
cp backend/.env.example backend/.env
# Επεξεργάσου το .env με τα στοιχεία της βάσης σου
```

### 4. Εξαρτήσεις & Εκκίνηση

```bash
cd backend
npm install
npm start          # παραγωγή
# ή
npm run dev        # ανάπτυξη (auto-reload)
```

Η εφαρμογή τρέχει στο **http://localhost:3000**

---

## Δομή Project

```
UniBite/
├── backend/
│   ├── config/db.js          # Σύνδεση MySQL
│   ├── db/schema.sql         # Δημιουργία βάσης
│   ├── middleware/auth.js    # requireLogin / requireRole
│   ├── routes/
│   │   ├── auth.js           # /api/auth (register, login, logout)
│   │   ├── listings.js       # /api/listings (CRUD + upload)
│   │   ├── requests.js       # /api/requests (αιτήματα)
│   │   ├── ratings.js        # /api/ratings (αξιολογήσεις)
│   │   ├── notifications.js  # /api/notifications
│   │   └── admin.js          # /api/admin (στατιστικά)
│   ├── uploads/              # Φωτογραφίες αγγελιών
│   └── server.js
└── frontend/
    ├── index.html            # Login / Register
    ├── feed.html             # Καταναλωτής – αγγελίες
    ├── listing.html          # Λεπτομέρειες αγγελίας
    ├── my-requests.html      # Καταναλωτής – τα αιτήματά μου
    ├── cook-dashboard.html   # Μάγειρας – dashboard
    ├── admin.html            # Admin – στατιστικά
    ├── css/
    │   ├── main.css
    │   └── responsive.css
    └── js/api.js             # API wrapper + utilities
```

---

## Ρόλοι Χρηστών

| Ρόλος | Δυνατότητες |
|-------|-------------|
| **consumer** | Βλέπει αγγελίες, κάνει αιτήματα, αξιολογεί γεύματα |
| **cook** | Δημιουργεί/επεξεργάζεται αγγελίες, εγκρίνει/απορρίπτει αιτήματα |
| **admin** | Βλέπει στατιστικά πλατφόρμας και leaderboard |

---

## Σύστημα Πόντων

- Κάθε νέος χρήστης ξεκινά με **5 πόντους**
- Αίτημα κράτησης: **−1 πόντος** (consumer)
- Αξιολόγηση με >3 αστέρια: **+2 πόντοι** για τον cook
- Αξιολόγηση με ≤3 αστέρια: **+1 πόντος** για τον cook
- No-show: **−1 πόντος** (consumer)
- Μη αξιολόγηση εντός 48h: **−1 πόντος** (consumer)

---

## API Endpoints

| Method | URL | Περιγραφή |
|--------|-----|-----------|
| POST | `/api/auth/register` | Εγγραφή |
| POST | `/api/auth/login` | Σύνδεση |
| POST | `/api/auth/logout` | Αποσύνδεση |
| GET | `/api/listings` | Λίστα αγγελιών (consumer) |
| POST | `/api/listings` | Νέα αγγελία (cook) |
| PUT | `/api/listings/:id` | Επεξεργασία αγγελίας (cook) |
| DELETE | `/api/listings/:id` | Διαγραφή αγγελίας (cook) |
| POST | `/api/requests` | Αίτημα κράτησης (consumer) |
| PUT | `/api/requests/:id/approve` | Αποδοχή (cook) |
| PUT | `/api/requests/:id/reject` | Απόρριψη (cook) |
| PUT | `/api/requests/:id/picked-up` | Σήμανση παραλαβής (cook) |
| PUT | `/api/requests/:id/no-show` | Σήμανση no-show (cook) |
| POST | `/api/ratings` | Υποβολή αξιολόγησης (consumer) |
| GET | `/api/admin/stats` | Στατιστικά (admin) |
| GET | `/api/admin/leaderboard` | Leaderboard (admin) |
