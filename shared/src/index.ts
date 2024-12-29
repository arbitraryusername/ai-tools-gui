export interface GitCommit {
  hash: string;
  message: string;
  diff: string;
  timestamp: Date;
}

export const sampleGitCommits: GitCommit[] = [
  {
    hash: "a1b2c3d4",
    message: "Refactor authentication middleware",
    diff: `
diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
index e69de29..0d1d7fc 100644
--- a/src/middleware/auth.ts
+++ b/src/middleware/auth.ts
@@ -0,0 +1,10 @@
+import { Request, Response, NextFunction } from 'express';
+
+export const authenticate = (req: Request, res: Response, next: NextFunction) => {
+  const token = req.header('Authorization')?.replace('Bearer ', '');
+  if (!token) {
+    return res.status(401).json({ error: 'Unauthorized' });
+  }
+  // Token verification logic here
+  next();
+};
diff --git a/src/routes/user.ts b/src/routes/user.ts
index e69de29..4b825dc 100644
--- a/src/routes/user.ts
+++ b/src/routes/user.ts
@@ -0,0 +1,8 @@
+import express from 'express';
+import { authenticate } from '../middleware/auth.js';
+
+const router = express.Router();
+
+router.get('/profile', authenticate, (req, res) => {
+  res.json({ user: req.user });
+});
+
+export default router;
    `,
    timestamp: new Date("2024-04-15T10:30:00Z"),
  },
  {
    hash: "e5f6g7h8",
    message: "Add new feature for user settings and remove deprecated endpoints",
    diff: `
diff --git a/src/routes/settings.ts b/src/routes/settings.ts
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/src/routes/settings.ts
@@ -0,0 +1,12 @@
+import express from 'express';
+import { authenticate } from '../middleware/auth.js';
+
+const router = express.Router();
+
+router.get('/settings', authenticate, (req, res) => {
+  // Fetch user settings
+  res.json({ settings: {} });
+});
+
+router.post('/settings', authenticate, (req, res) => {
+  // Update user settings
+  res.json({ success: true });
+});
+
+export default router;
diff --git a/src/routes/deprecated.ts b/src/routes/deprecated.ts
deleted file mode 100644
index e69de29..0000000
--- a/src/routes/deprecated.ts
+++ /dev/null
@@ -1 +0,0 @@
-import express from 'express';
-
-const router = express.Router();
-
-router.get('/old-endpoint', (req, res) => {
-  res.send('This endpoint is deprecated.');
-});
-
-export default router;
diff --git a/src/routes/user.ts b/src/routes/user.ts
index 4b825dc..a7c3e1f 100644
--- a/src/routes/user.ts
+++ b/src/routes/user.ts
@@ -10,7 +10,7 @@ router.get('/profile', authenticate, (req, res) => {
 
 router.post('/updateProfile', authenticate, (req, res) => {
   // Update user profile logic
-  res.json({ success: true });
+  res.status(200).json({ message: 'Profile updated successfully' });
 });
 
 export default router;
    `,
    timestamp: new Date("2024-04-16T14:45:00Z"),
  },
];
