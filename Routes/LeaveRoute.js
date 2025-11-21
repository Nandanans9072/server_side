import express from 'express';
import con from '../utils/db.js';

const router = express.Router();

router.post('/addleave', (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
  const sql = `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, applied_at)
               VALUES (?, ?, ?, ?, ?, 'pending', NOW())`;
  con.query(sql, [employee_id, leave_type, start_date, end_date, reason], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query error" });
    res.json({ Status: true, leave_id: result.insertId });
  });
});

router.get('/leave_report/:id', (req, res) => {
  const employeeId = req.params.id;
  const sql = "SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY applied_at DESC";
  con.query(sql, [employeeId], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query error" });
    res.json(result);
  });
});

export { router as LeaveRouter };
