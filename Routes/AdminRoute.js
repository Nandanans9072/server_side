import express from "express";
import con from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import multer from "multer";
import path from "path";

const router = express.Router();

//--- Admin Login ---
router.post("/adminlogin", (req, res) => {
    const sql = "SELECT * from admin Where email = ?";
    con.query(sql, [req.body.email], (err, result) => {
        if (err) return res.json({ loginStatus: false, Error: "Query error" });
        if (result.length > 0) {
            const storedPassword = result[0].password;
            const isBcryptHash = typeof storedPassword === 'string' && storedPassword.startsWith('$2');
            if (isBcryptHash) {
                bcrypt.compare(req.body.password, storedPassword, (err, response) => {
                    if (err) return res.json({ loginStatus: false, Error: "Wrong Password" });
                    if (response) {
                        const email = result[0].email;
                        const token = jwt.sign(
                            { role: "admin", email: email, id: result[0].id },
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
                if (req.body.password === storedPassword) {
                    const email = result[0].email;
                    const token = jwt.sign(
                        { role: "admin", email: email, id: result[0].id },
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

//--- Categories ---
router.get('/category', (req, res) => {
    const sql = "SELECT * FROM category";
    con.query(sql, (err, result) => {
        if (err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

router.post('/add_category', (req, res) => {
    const sql = "INSERT INTO category (`name`) VALUES (?)";
    con.query(sql, [req.body.category], (err, result) => {
        if (err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true});
    });
});

router.delete('/delete_category/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM category WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({ Status: false, Error: "Query Error: " + err });
        return res.json({ Status: true, Result: result });
    });
});

//--- Image Upload (for Employees) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Public/Images')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// --- Dashboard Summary Data ---
router.get('/dashboard-data', (req, res) => {
  let data = {};
  const totalEmployees = "SELECT COUNT(*) AS count FROM employee";
  const totalAdmins = "SELECT COUNT(*) AS count FROM admin";
  const totalSalary = "SELECT SUM(salary) AS total FROM employee";
  const pendingLeaves = "SELECT COUNT(*) AS count FROM leave_requests WHERE status='pending'";
  const recentEmployees = `
    SELECT id, name, email, address, salary, image, category_id, join_date
    FROM employee
    ORDER BY id DESC
    LIMIT 3
  `;
  con.query(totalEmployees, (err, emp) => {
    if (err) return res.status(500).json(err);
    data.totalEmployees = emp[0].count;
    con.query(totalAdmins, (err, admin) => {
      if (err) return res.status(500).json(err);
      data.totalAdmins = admin[0].count;
      con.query(totalSalary, (err, salary) => {
        if (err) return res.status(500).json(err);
        data.totalSalary = salary[0].total || 0;
        con.query(pendingLeaves, (err, leaves) => {
          if (err) return res.status(500).json(err);
          data.pendingLeaves = leaves[0].count;
          con.query(recentEmployees, (err, recent) => {
            if (err) return res.status(500).json(err);
            data.recentEmployees = recent;
            res.json(data);
          });
        });
      });
    });
  });
});


//--- Employees CRUD ---
router.post('/add_employee', upload.single('image'), (req, res) => {
    const sql = `INSERT INTO employee 
        (name, email, password, address, salary, image, category_id) 
        VALUES (?)`;
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) return res.json({Status: false, Error: "Query Error"});
        const values = [
            req.body.name,
            req.body.email,
            hash,
            req.body.address,
            req.body.salary,
            req.file.filename,
            req.body.category_id
        ];
        con.query(sql, [values], (err, result) => {
            if (err) return res.json({Status: false, Error: err});
            return res.json({Status: true});
        });
    });
});

router.get('/employee', (req, res) => {
    const sql = "SELECT * FROM employee";
    con.query(sql, (err, result) => {
        if (err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

router.get('/employee/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({Status: false, Error: "Query Error"});
        return res.json({Status: true, Result: result});
    });
});

router.put('/edit_employee/:id', (req, res) => {
    const id = req.params.id;
    const sql = `UPDATE employee 
        SET name = ?, email = ?, salary = ?, address = ?, category_id = ? 
        WHERE id = ?`;
    const values = [
        req.body.name,
        req.body.email,
        req.body.salary,
        req.body.address,
        req.body.category_id
    ];
    con.query(sql, [...values, id], (err, result) => {
        if (err) return res.json({Status: false, Error: "Query Error" + err});
        return res.json({Status: true, Result: result});
    });
});

router.delete('/delete_employee/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM employee WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({Status: false, Error: "Query Error" + err});
        return res.json({Status: true, Result: result});
    });
});


router.get('/leaves', (req, res) => {
  const sql = `
    SELECT
      lr.id,
      lr.employee_id,
      e.name AS employee_name,
      lr.leave_type,
      lr.reason AS description,
      lr.status,
      lr.start_date,
      lr.end_date,
      lr.applied_at AS applied_date
    FROM leave_requests lr
    LEFT JOIN employee e ON lr.employee_id = e.id
    ORDER BY lr.applied_at DESC
  `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error: " + err });
    return res.json({ Status: true, Result: result });
  });
});

// PATCH: best practice for status change
router.patch('/update_leave_status/:leaveId', (req, res) => {
  const leaveId = req.params.leaveId;
  const { status } = req.body; // should be 'approved' or 'rejected'
  if (!['approved', 'rejected'].includes(status)) {
    return res.json({ Status: false, Error: "Invalid status" });
  }
  const sql = "UPDATE leave_requests SET status = ? WHERE id = ?";
  con.query(sql, [status, leaveId], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Status update error" });
    return res.json({ Status: true });
  });
});

router.get('/leaves/pending', (req, res) => {
  const sql = `
    SELECT
      lr.id,
      lr.employee_id,
      e.name AS employee_name,
      lr.leave_type,
      lr.reason AS description,
      lr.status,
      lr.start_date,
      lr.end_date,
      lr.applied_at AS applied_date
    FROM leave_requests lr
    LEFT JOIN employee e ON lr.employee_id = e.id
    WHERE lr.status = 'pending'
    ORDER BY lr.applied_at DESC
  `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error: " + err });
    return res.json({ Status: true, Result: result });
  });
});


//--- Logout ---
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({Status: true});
});

export { router as adminRouter };
