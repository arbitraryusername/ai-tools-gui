export interface GitCommit {
  hash: string;
  message: string;
  diff: string;
  timestamp: Date | string;
}

export const sampleGitCommits: GitCommit[] = [
  {
    hash: 'a45f60bc837efc68e875e3f897267f31be7498ba',
    message: 'test commit',
    diff: `diff --git a/src/App.tsx b/src/App.tsx
index 9af1638..4bde507 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -10,7 +10,12 @@ function App() {
   const [isOpen, setIsOpen] = useState(false);

   const toggleOpen = () => {
-    setIsOpen(!isOpen);
+    if (isOpen) {
+      console.log('Closing...');
+    } else {
+      console.log('Opening...');
+    }
+    setIsOpen(!isOpen);
   };

   return (
@@ -30,4 +35,5 @@ function App() {
       <button onClick={toggleOpen}>Toggle</button>
       {isOpen && <div>Content is now visible!</div>}
     </div>
+    <p>New footer message</p>
   );
 }
diff --git a/src/NewComponent.tsx b/src/NewComponent.tsx
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/src/NewComponent.tsx
@@ -0,0 +1,10 @@
+import React from 'react';
+
+export default function NewComponent() {
+  return (
+    <div>
+      <h1>New Component</h1>
+      <p>This is a brand new component added to the project.</p>
+    </div>
+  );
+}
diff --git a/src/unusedFile.tsx b/src/unusedFile.tsx
deleted file mode 100644
index 3b17f6d..0000000
--- a/src/unusedFile.tsx
+++ /dev/null
@@ -1,5 +0,0 @@
-import React from 'react';
-
-export default function UnusedFile() {
-  return <div>This file is no longer used and has been removed.</div>;
-}`,
    timestamp: new Date()
  }
];
