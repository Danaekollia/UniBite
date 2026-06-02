require('dotenv').config();
const pool   = require('./config/db');
const bcrypt = require('bcrypt');

async function seed() {
  /* ── καθαρισμός προηγούμενων demo εγγραφών ── */
  await pool.execute(
    "DELETE FROM users WHERE username IN ('nikos_p','maria_k','giorgos_a','eleni_s')"
  );

  const h = await bcrypt.hash('demo1234', 10);

  /* ═══════════════════════════════════════════
     ΧΡΗΣΤΕΣ
     2 μάγειρες, 2 καταναλωτές
  ═══════════════════════════════════════════ */
  const [c1] = await pool.execute(
    'INSERT INTO users (username,email,password_hash,role,credits) VALUES (?,?,?,?,?)',
    ['nikos_p', 'nikos@uoa.gr', h, 'cook', 12]
  );
  const [c2] = await pool.execute(
    'INSERT INTO users (username,email,password_hash,role,credits) VALUES (?,?,?,?,?)',
    ['maria_k', 'maria@uoa.gr', h, 'cook', 9]
  );
  const [u1] = await pool.execute(
    'INSERT INTO users (username,email,password_hash,role,credits) VALUES (?,?,?,?,?)',
    ['giorgos_a', 'giorgos@uoa.gr', h, 'consumer', 3]
  );
  const [u2] = await pool.execute(
    'INSERT INTO users (username,email,password_hash,role,credits) VALUES (?,?,?,?,?)',
    ['eleni_s', 'eleni@uoa.gr', h, 'consumer', 4]
  );
  const cook1 = c1.insertId, cook2 = c2.insertId;
  const cons1 = u1.insertId, cons2 = u2.insertId;
  console.log('✓ Χρήστες');

  /* ═══════════════════════════════════════════
     ΑΓΓΕΛΙΕΣ
     Β1/Β2: CRUD, τοποθεσία, ώρες, αλλεργιογόνα
     Καταστάσεις: active / inactive / expired
  ═══════════════════════════════════════════ */

  /* --- ΕΝΕΡΓΕΣ (active) --- */
  const [l1] = await pool.execute(
    `INSERT INTO listings
       (cook_id,title,description,total_portions,available_portions,
        pickup_location,pickup_lat,pickup_lng,pickup_time,allergens,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [cook1,
     'Μακαρονάδα Μπολονέζ',
     'Σπιτική μακαρονάδα με κιμά, φρέσκια ντομάτα και τριμμένη παρμεζάνα. Μαγειρεύτηκε σήμερα το πρωί.',
     4, 4,
     'Εστία Α – Δωμάτιο 205, 2ος όροφος',
     37.97945, 23.78362,
     '13:00–15:00',
     '[]', 'active']
  );

  const [l2] = await pool.execute(
    `INSERT INTO listings
       (cook_id,title,description,total_portions,available_portions,
        pickup_location,pickup_lat,pickup_lng,pickup_time,allergens,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [cook1,
     'Σπανακόπιτα με φέτα',
     'Τραγανή σπανακόπιτα με φρέσκο σπανάκι, φέτα και ανθότυρο. Χειροποίητο φύλλο.',
     6, 6,
     'Κεντρική Βιβλιοθήκη – είσοδος Β, ισόγειο',
     37.97880, 23.78290,
     '12:30–14:30',
     '["gluten","dairy"]', 'active']
  );

  const [l3] = await pool.execute(
    `INSERT INTO listings
       (cook_id,title,description,total_portions,available_portions,
        pickup_location,pickup_lat,pickup_lng,pickup_time,allergens,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [cook2,
     'Φακές σούπα',
     'Παραδοσιακή φακόσουπα με λαδολέμονο, καρότα και κρεμμύδι. Νηστίσιμη και χορταστική.',
     5, 5,
     'Κυλικείο Σχολής Θετικών Επιστημών – ισόγειο, αριστερή είσοδος',
     37.97810, 23.78450,
     '14:00–16:00',
     '[]', 'active']
  );

  /* --- ΑΝΕΝΕΡΓΗ (inactive – 0 μερίδες, εντός 48ωρών) --- */
  const [l4] = await pool.execute(
    `INSERT INTO listings
       (cook_id,title,description,total_portions,available_portions,
        pickup_location,pickup_lat,pickup_lng,pickup_time,allergens,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [cook2,
     'Τυρόπιτα σφολιάτα',
     'Αέρινη τυρόπιτα με φέτα και γραβιέρα σε τραγανή σφολιάτα. Όλες οι μερίδες έχουν δεσμευτεί.',
     4, 0,
     'Εστία Β – Κοινόχρηστη κουζίνα, 1ος όροφος',
     37.97760, 23.78510,
     '11:00–13:00',
     '["gluten","dairy"]', 'inactive']
  );

  /* --- ΔΙΕΓΡΑΜΜΕΝΗ (expired – πέρασαν 48ωρες, για στατιστικά) --- */
  const [l5] = await pool.execute(
    `INSERT INTO listings
       (cook_id,title,description,total_portions,available_portions,
        pickup_location,pickup_lat,pickup_lng,pickup_time,allergens,status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,DATE_SUB(NOW(), INTERVAL 3 DAY))`,
    [cook1,
     'Κοτόπουλο λεμονάτο με ρύζι',
     'Μαλακό φιλέτο κοτόπουλου με λεμόνι, θυμάρι και μπασμάτι ρύζι από τον φούρνο.',
     3, 0,
     'Αμφιθέατρο Γ – διάδρομος εισόδου',
     37.97900, 23.78400,
     '15:00–17:00',
     '[]', 'expired']
  );
  console.log('✓ Αγγελίες');

  /* ═══════════════════════════════════════════
     ΑΙΤΗΜΑΤΑ
     Β3/Γ2: pending, approved, rejected,
             picked_up, no_show
  ═══════════════════════════════════════════ */

  /* pending – giorgos ζητά μερίδα από l1 (Μακαρονάδα) */
  await pool.execute(
    'INSERT INTO requests (listing_id,consumer_id,status) VALUES (?,?,?)',
    [l1.insertId, cons1, 'pending']
  );

  /* approved – eleni εγκρίθηκε για l1 → available -1 */
  await pool.execute(
    'INSERT INTO requests (listing_id,consumer_id,status) VALUES (?,?,?)',
    [l1.insertId, cons2, 'approved']
  );
  await pool.execute(
    'UPDATE listings SET available_portions=available_portions-1 WHERE id=?',
    [l1.insertId]
  );

  /* rejected – giorgos απορρίφθηκε για l3 (Φακές) */
  await pool.execute(
    'INSERT INTO requests (listing_id,consumer_id,status) VALUES (?,?,?)',
    [l3.insertId, cons1, 'rejected']
  );

  /* picked_up – giorgos παρέλαβε από l3 (Φακές) 2 μέρες πριν */
  const [r4] = await pool.execute(
    `INSERT INTO requests (listing_id,consumer_id,status,picked_up_at,created_at)
     VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 3 DAY))`,
    [l3.insertId, cons1, 'picked_up']
  );
  await pool.execute(
    'UPDATE listings SET available_portions=available_portions-1 WHERE id=?',
    [l3.insertId]
  );

  /* no_show – eleni δεν παρέλαβε από l3 → eleni -1 πόντο */
  await pool.execute(
    `INSERT INTO requests (listing_id,consumer_id,status,created_at)
     VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL 4 DAY))`,
    [l3.insertId, cons2, 'no_show']
  );
  await pool.execute(
    'UPDATE listings SET available_portions=available_portions-1 WHERE id=?',
    [l3.insertId]
  );
  /* eleni έχασε 1 πόντο (ήδη αντικατοπτρίζεται στα credits) */

  /* picked_up – eleni παρέλαβε από l4 (Τυρόπιτα) */
  const [r6] = await pool.execute(
    `INSERT INTO requests (listing_id,consumer_id,status,picked_up_at,created_at)
     VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY))`,
    [l4.insertId, cons2, 'picked_up']
  );

  /* picked_up (×2) – giorgos & eleni παρέλαβαν από l5 (expired Κοτόπουλο, 3 μέρες πριν) */
  const [r7] = await pool.execute(
    `INSERT INTO requests (listing_id,consumer_id,status,picked_up_at,created_at)
     VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL 3 DAY),DATE_SUB(NOW(),INTERVAL 3 DAY))`,
    [l5.insertId, cons1, 'picked_up']
  );
  const [r8] = await pool.execute(
    `INSERT INTO requests (listing_id,consumer_id,status,picked_up_at,created_at)
     VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL 3 DAY),DATE_SUB(NOW(),INTERVAL 3 DAY))`,
    [l5.insertId, cons2, 'picked_up']
  );

  /* picked_up – eleni παρέλαβε από l2 (Σπανακόπιτα) 5 μέρες πριν */
  const [r9] = await pool.execute(
    `INSERT INTO requests (listing_id,consumer_id,status,picked_up_at,created_at)
     VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_SUB(NOW(),INTERVAL 6 DAY))`,
    [l2.insertId, cons2, 'picked_up']
  );
  await pool.execute(
    'UPDATE listings SET available_portions=available_portions-1 WHERE id=?',
    [l2.insertId]
  );

  console.log('✓ Αιτήματα');

  /* ═══════════════════════════════════════════
     ΑΞΙΟΛΟΓΗΣΕΙΣ
     Γ3/Β4: κλίμακα 1-5, πόντοι μάγειρα
     score>3 → +2 πόντοι, score≤3 → +1 πόντος
  ═══════════════════════════════════════════ */

  /* giorgos αξιολόγησε Φακές (l3) με 5★ → maria_k +2 πόντοι */
  await pool.execute(
    'INSERT INTO ratings (request_id,consumer_id,listing_id,score) VALUES (?,?,?,?)',
    [r4.insertId, cons1, l3.insertId, 5]
  );

  /* eleni αξιολόγησε Τυρόπιτα (l4) με 4★ → maria_k +2 πόντοι */
  await pool.execute(
    'INSERT INTO ratings (request_id,consumer_id,listing_id,score) VALUES (?,?,?,?)',
    [r6.insertId, cons2, l4.insertId, 4]
  );

  /* giorgos αξιολόγησε Κοτόπουλο (l5) με 5★ → nikos_p +2 πόντοι */
  await pool.execute(
    'INSERT INTO ratings (request_id,consumer_id,listing_id,score) VALUES (?,?,?,?)',
    [r7.insertId, cons1, l5.insertId, 5]
  );

  /* eleni αξιολόγησε Κοτόπουλο (l5) με 3★ → nikos_p +1 πόντος */
  await pool.execute(
    'INSERT INTO ratings (request_id,consumer_id,listing_id,score) VALUES (?,?,?,?)',
    [r8.insertId, cons2, l5.insertId, 3]
  );

  /* eleni αξιολόγησε Σπανακόπιτα (l2) με 5★ → nikos_p +2 πόντοι */
  await pool.execute(
    'INSERT INTO ratings (request_id,consumer_id,listing_id,score) VALUES (?,?,?,?)',
    [r9.insertId, cons2, l2.insertId, 5]
  );

  console.log('✓ Αξιολογήσεις');

  console.log('\n══════════════════════════════════════════');
  console.log('  SEED ΕΠΙΤΥΧΗΣ');
  console.log('──────────────────────────────────────────');
  console.log('  Μάγειρες:');
  console.log('    nikos_p   / demo1234  (12 πόντοι)');
  console.log('    maria_k   / demo1234  ( 9 πόντοι)');
  console.log('  Καταναλωτές:');
  console.log('    giorgos_a / demo1234  ( 3 πόντοι)');
  console.log('    eleni_s   / demo1234  ( 4 πόντοι)');
  console.log('──────────────────────────────────────────');
  console.log('  Αγγελίες: 3 active, 1 inactive, 1 expired');
  console.log('  Αιτήματα: pending/approved/rejected/');
  console.log('            picked_up/no_show');
  console.log('  Αξιολογήσεις: 5 (καλύπτουν leaderboard)');
  console.log('══════════════════════════════════════════');

  await pool.end();
}

seed().catch(e => { console.error('ΣΦΑΛΜΑ:', e.message); process.exit(1); });
