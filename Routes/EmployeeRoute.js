import express from 'express';
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';

const router = express.Router();

router.post("/employee_login", (req, res) => {
  const sql = "SELECT * FROM employee WHERE email = ?";
  con.query(sql, [req.body.email], (err, result) => {
    if (err) return res.json({ loginStatus: false, Error: "Query error" });
    if (result.length > 0) {
      const storedPassword = result[0].password;
      const isBcryptHash = typeof storedPassword === 'string' && storedPassword.startsWith('$2');
      if (isBcryptHash) {
        // Password stored as bcrypt hash
        bcrypt.compare(req.body.password, storedPassword, (err, response) => {
          if (err) return res.json({ loginStatus: false, Error: "Wrong Password" });
          if (response) {
            const email = result[0].email;
            const token = jwt.sign(
              { role: "employee", email: email, id: result[0].id },
              "jwt_secret_key",
              { expiresIn: "1d" }
            );
            res.cookie('token', token);
            return res.json({ loginStatus: true, id: result[0].id });
          } else {
            return res.json({ loginStatus: false, Error: "wrong email or password" });
          }
        });
      } else {
        // Password stored as plain text (legacy)
        if (req.body.password === storedPassword) {
          const email = result[0].email;
          const token = jwt.sign(
            { role: "employee", email: email, id: result[0].id },
            "jwt_secret_key",
            { expiresIn: "1d" }
          );
          res.cookie('token', token);
          return res.json({ loginStatus: true, id: result[0].id });
        } else {
          return res.json({ loginStatus: false, Error: "wrong email or password" });
        }
      }
    } else {
      return res.json({ loginStatus: false, Error: "wrong email or password" });
    }
  });
});


router.get('/detail/:id', (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});


router.post('/addleave', (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
  const sql = `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
               VALUES (?, ?, ?, ?, ?, 'pending')`;
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
    res.json({ Status: true, Result: result });
  });
});

router.delete('/delete_leave/:leaveId', (req, res) => {
  const leaveId = req.params.leaveId;
  const sql = "DELETE FROM leave_requests WHERE id = ?";
  con.query(sql, [leaveId], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Delete Error" });
    return res.json({ Status: true });
  });
});

router.put('/update_leave/:leaveId', (req, res) => {
  const leaveId = req.params.leaveId;
  const { leave_type, start_date, end_date, reason } = req.body;
  const sql = `
    UPDATE leave_requests SET
    leave_type = ?,
    start_date = ?,
    end_date = ?,
    reason = ?
    WHERE id = ?
  `;
  con.query(sql, [leave_type, start_date, end_date, reason, leaveId], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Update Error" });
    return res.json({ Status: true });
  });
});


// GET: All unread notifications for this employee
router.get('/notifications/:employeeId', (req, res) => {
  const employeeId = req.params.employeeId;
  const sql = `SELECT id, leave_type, start_date, end_date, status
               FROM leave_requests
               WHERE employee_id = ? AND status IN ('approved','rejected') AND (is_notified IS NULL OR is_notified=0)
               ORDER BY applied_at DESC`;
  con.query(sql, [employeeId], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query error" });
    res.json({ Status: true, Result: result });
  });
});

// POST: Mark all notifications as read for this employee
router.post('/notifications/read/:employeeId', (req, res) => {
  const employeeId = req.params.employeeId;
  const sql = `UPDATE leave_requests SET is_notified=1
               WHERE employee_id = ? AND status IN ('approved','rejected') AND (is_notified IS NULL OR is_notified=0)`;
  con.query(sql, [employeeId], (err) => {
    if (err) return res.json({ Status: false, Error: "Query error" });
    res.json({ Status: true });
  });
});


router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: true });
});

export { router as EmployeeRouter };
