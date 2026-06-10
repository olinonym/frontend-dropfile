import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

// Firebase config
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
});

const auth = getAuth(app);
const storage = getStorage(app);

const $ = (id) => document.getElementById(id);
let selectedFiles = [];

// -------------------- Auth --------------------
onAuthStateChanged(auth, (user) => {
  $("login").hidden = !!user;
  $("app").hidden = !user;
  $("who").textContent = user?.email || '';
});

$("loginBtn").onclick = async () => {
  $("loginErr").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
  } catch (e) {
    $("loginErr").textContent = e.message;
  }
};

$("logoutBtn").onclick = () => signOut(auth);

// -------------------- Upload UI --------------------
const drop = $("drop");
const picker = $("picker");
const uploadBtn = $("uploadBtn");
const readyStatus = $("readyStatus");
const fileList = $("fileList");

function updateStatus(message, isError = false) {
  const li = document.createElement('li');
  li.textContent = message;
  if (isError) li.style.color = '#b91c1c';
  $("status").appendChild(li);
}

drop.onclick = () => picker.click();

uploadBtn.onclick = async () => {
  if (!selectedFiles.length) { picker.click(); return; }
  await upload(selectedFiles);
  selectedFiles = [];
  picker.value = '';
};

picker.onchange = (e) => {

  selectedFiles = [
    ...selectedFiles,
    ...Array.from(e.target.files)
  ];

  renderSelectedFiles();
};

drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => {

  e.preventDefault();
  drop.classList.remove('over');

  selectedFiles = [
    ...selectedFiles,
    ...Array.from(e.dataTransfer.files)
  ];

  renderSelectedFiles();
};

// -------------------- Upload to Firebase Storage --------------------
async function upload(files) {

  for (const file of files) {

    const li = document.createElement('li');
    li.textContent = `${file.name}: uploading...`;
    $("status").appendChild(li);

    try {

      const storageRef = ref(
        storage,
        `uploads/${Date.now()}-${file.name}`
      );

      await uploadBytes(storageRef, file);

      li.innerHTML = `
        <strong>${file.name}</strong>
        <span style="color:green"> Success ✓</span>
      `;

    } catch (err) {

      li.innerHTML = `
        <strong>${file.name}</strong>
        <span style="color:red"> Fail ✗</span>
      `;
    }
  }

  // ทำหลังอัปโหลดครบทุกไฟล์
  selectedFiles = [];
  picker.value = '';

  drop.innerHTML = 'Drop files here, or click to choose';

  fileList.innerHTML = '';

  readyStatus.textContent = '';

  setTimeout(() => {
    $("status").innerHTML = '';
  }, 2000);

} // <-- ปิด upload ตรงนี้


function renderSelectedFiles() {

  fileList.innerHTML = '';

  selectedFiles.forEach(file => {

    const div = document.createElement('div');

    div.className = 'file-item';
    div.textContent = `📄 ${file.name}`;

    fileList.appendChild(div);
  });

  readyStatus.textContent =
    `Ready to upload ${selectedFiles.length} file(s)`;
}