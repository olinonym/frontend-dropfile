import { onAuthStateChanged } from "firebase/auth";
import {
  ref,
  listAll,
  getDownloadURL,
  getMetadata
} from "firebase/storage";
import { auth, storage } from "./firebase.js";

const $ = (id) => document.getElementById(id);

onAuthStateChanged(auth, (user) => {
  $("signinNotice").hidden = !!user;
  $("app").hidden = !user;
  if (user) loadFiles();
});

$("refreshBtn").onclick = () => loadFiles();

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Uploads are stored as `uploads/<timestamp>-<original name>`
function displayName(name) {
  const match = name.match(/^\d{13}-(.+)$/);
  return match ? match[1] : name;
}

// Fetch as a blob and save via a temporary object URL so the browser
// downloads in place instead of opening the file in a new tab.
async function downloadFile(btn, url, filename) {
  btn.disabled = true;
  btn.textContent = 'Downloading…';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Blocked by bucket CORS — fall back to opening the download URL.
    window.open(url, '_blank', 'noopener');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download';
  }
}

async function loadFiles() {
  const fileList = $("fileList");
  $("listErr").hidden = true;
  $("empty").hidden = true;
  $("loading").hidden = false;
  fileList.innerHTML = '';

  try {
    const { items } = await listAll(ref(storage, 'uploads'));

    const files = await Promise.all(items.map(async (item) => {
      const [url, meta] = await Promise.all([
        getDownloadURL(item),
        getMetadata(item)
      ]);
      return { name: item.name, url, size: meta.size, updated: meta.updated };
    }));

    // newest first
    files.sort((a, b) => new Date(b.updated) - new Date(a.updated));

    $("loading").hidden = true;

    if (!files.length) {
      $("empty").hidden = false;
      return;
    }

    for (const file of files) {
      const row = document.createElement('div');
      row.className = 'file-row';

      const info = document.createElement('div');
      info.className = 'file-info';

      const name = document.createElement('div');
      name.className = 'file-name';
      name.textContent = `📄 ${displayName(file.name)}`;

      const meta = document.createElement('div');
      meta.className = 'file-meta';
      meta.textContent = `${formatSize(file.size)} · ${new Date(file.updated).toLocaleString()}`;

      info.append(name, meta);

      const btn = document.createElement('button');
      btn.className = 'download';
      btn.textContent = 'Download';
      btn.onclick = () => downloadFile(btn, file.url, displayName(file.name));

      row.append(info, btn);
      fileList.appendChild(row);
    }
  } catch (err) {
    $("loading").hidden = true;
    $("listErr").textContent = err.message;
    $("listErr").hidden = false;
  }
}
