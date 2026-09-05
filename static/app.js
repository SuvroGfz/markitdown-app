document.addEventListener('DOMContentLoaded', () => {
  initThreeJs();
  initAppLogic();
  initPageNav();
  initMCPPage();
});

function initThreeJs() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  
  // Camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles
  const particleCount = 250;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

    velocities.push({
      x: (Math.random() - 0.5) * 0.004,
      y: (Math.random() - 0.5) * 0.004,
      z: (Math.random() - 0.5) * 0.004
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Material for points
  const pointsMaterial = new THREE.PointsMaterial({
    color: 0x8B5CF6,
    size: 0.06,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, pointsMaterial);
  scene.add(particles);

  // Material for lines
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x6366F1,
    transparent: true,
    opacity: 0.05
  });

  const lineGeometry = new THREE.BufferGeometry();
  // Allocate plenty of space for lines
  const maxLines = 200;
  const linePositions = new Float32Array(maxLines * 6);
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  
  const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(linesMesh);

  // Mouse Parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  
  document.addEventListener('mousemove', (e) => {
    // Normalize mouse coords to -1 to +1
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  const distanceThreshold = 22;
  const distanceThresholdSq = distanceThreshold * distanceThreshold;

  function animate() {
    requestAnimationFrame(animate);

    // Parallax: max ±2 units on X/Y axes with 0.03 lerp
    targetX = mouseX * 2;
    targetY = mouseY * 2;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    const positions = particles.geometry.attributes.position.array;
    
    // Update particle positions
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;

      // Wrap around bounds
      if (positions[i * 3] > 50) positions[i * 3] = -50;
      else if (positions[i * 3] < -50) positions[i * 3] = 50;

      if (positions[i * 3 + 1] > 50) positions[i * 3 + 1] = -50;
      else if (positions[i * 3 + 1] < -50) positions[i * 3 + 1] = 50;
      
      if (positions[i * 3 + 2] > 25) positions[i * 3 + 2] = -25;
      else if (positions[i * 3 + 2] < -25) positions[i * 3 + 2] = 25;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    // Update lines based on distance
    let lineIndex = 0;
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < distanceThresholdSq && lineIndex < maxLines * 6) {
          linePositions[lineIndex++] = positions[i * 3];
          linePositions[lineIndex++] = positions[i * 3 + 1];
          linePositions[lineIndex++] = positions[i * 3 + 2];

          linePositions[lineIndex++] = positions[j * 3];
          linePositions[lineIndex++] = positions[j * 3 + 1];
          linePositions[lineIndex++] = positions[j * 3 + 2];
        }
      }
    }
    linesMesh.geometry.setDrawRange(0, lineIndex / 3);
    linesMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function initAppLogic() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  
  const uploadView = document.getElementById('upload-view');
  const loadingView = document.getElementById('loading-view');
  const errorView = document.getElementById('error-view');
  const resultsView = document.getElementById('results-view');
  const heroSection = document.getElementById('hero-section');
  
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');
  const convertAnotherBtn = document.getElementById('convert-another-btn');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  
  let currentFile = null;
  let currentMarkdown = "";
  let currentFilename = "";

  function showView(viewId) {
    [uploadView, loadingView, errorView, resultsView].forEach(v => v.classList.remove('active', 'active-flex'));
    const target = document.getElementById(viewId);
    if (viewId === 'loading-view' || viewId === 'error-view') {
      target.classList.add('active-flex');
    } else {
      target.classList.add('active');
    }

    if (viewId === 'results-view') {
      heroSection.style.display = 'none'; // hide hero in results view to match bento feel
    } else {
      heroSection.style.display = 'block';
    }
  }

  // --- Drag and Drop ---
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target !== browseBtn) fileInput.click();
  });

  retryBtn.addEventListener('click', () => {
    showView('upload-view');
    fileInput.value = "";
  });

  convertAnotherBtn.addEventListener('click', () => {
    showView('upload-view');
    fileInput.value = "";
    document.getElementById('progress-bar').style.width = '0%';
  });

  function handleFile(file) {
    // Validations
    if (file.type !== 'application/pdf') {
      showError("Please upload a PDF file only.");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      showError("File size exceeds 10MB limit.");
      return;
    }

    currentFile = file;
    currentFilename = file.name;
    uploadFile(file);
  }

  function showError(message) {
    errorMessage.textContent = message;
    showView('error-view');
  }

  async function uploadFile(file) {
    showView('loading-view');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("Server error during conversion.");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to convert file.");
      }

      displayResults(data);

    } catch (err) {
      showError(err.message || "An unexpected error occurred.");
    }
  }

  function displayResults(data) {
    currentMarkdown = data.markdown;
    
    // Set Stats
    document.getElementById('raw-tokens').textContent = data.stats.raw_token_count.toLocaleString();
    document.getElementById('clean-tokens').textContent = data.stats.md_token_count.toLocaleString();
    
    document.getElementById('savings-badge').textContent = `${data.stats.savings_percentage}% saved`;
    
    // File Size
    const mb = (data.stats.file_size_bytes / (1024 * 1024)).toFixed(2);
    document.getElementById('stat-file-size').textContent = `${mb} MB`;
    
    // Processing Time
    document.getElementById('stat-time').textContent = `${Math.round(data.stats.processing_time_ms)}ms`;
    
    // Output Chars
    document.getElementById('stat-chars').textContent = `${data.stats.markdown_length.toLocaleString()} chars`;

    // Preview
    document.getElementById('content-preview').innerHTML = marked.parse(currentMarkdown);
    document.getElementById('raw-markdown-code').textContent = currentMarkdown;

    showView('results-view');
    
    // Animate progress bar slightly after showing view
    setTimeout(() => {
      document.getElementById('progress-bar').style.width = `${data.stats.savings_percentage}%`;
    }, 100);
  }

  // --- Tabs ---
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-tab');
      tabContents.forEach(tc => {
        if (tc.id === `content-${targetId}`) tc.classList.add('active');
        else tc.classList.remove('active');
      });
    });
  });

  // --- Actions ---
  copyBtn.addEventListener('click', () => {
    if (currentMarkdown) {
      navigator.clipboard.writeText(currentMarkdown).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 2000);
      });
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (currentMarkdown) {
      const blob = new Blob([currentMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFilename.replace(/\.[^/.]+$/, "") + ".md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });
}

/* ── Page Navigation ── */
function initPageNav() {
  const navTabs = document.querySelectorAll('.nav-tab');
  const mainContent = document.querySelector('.main-content');
  const heroSection = document.getElementById('hero-section');
  const mcpPage = document.getElementById('mcp-setup-page');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;

      // Update active tab
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (page === 'converter') {
        mainContent.style.display = 'flex';
        heroSection.style.display = 'block';
        mcpPage.classList.remove('active');
      } else if (page === 'mcp-setup') {
        mainContent.style.display = 'none';
        mcpPage.classList.add('active');
      }
    });
  });
}

/* ── MCP Setup Page ── */
function initMCPPage() {
  const baseUrl = window.location.origin;
  const sseUrl = baseUrl + '/mcp/sse';

  // Populate SSE URL
  const sseUrlEl = document.getElementById('sse-url');
  if (sseUrlEl) sseUrlEl.textContent = sseUrl;

  // Claude Desktop config
  const claudeConfig = document.getElementById('claude-config');
  if (claudeConfig) {
    claudeConfig.textContent = JSON.stringify({
      "mcpServers": {
        "markitdown": {
          "url": sseUrl
        }
      }
    }, null, 2);
  }

  // Cursor / generic SSE config
  const cursorConfig = document.getElementById('cursor-config');
  if (cursorConfig) {
    cursorConfig.textContent = JSON.stringify({
      "mcpServers": {
        "markitdown": {
          "url": sseUrl,
          "transport": "sse"
        }
      }
    }, null, 2);
  }

  // Copy code buttons
  document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      try {
        await navigator.clipboard.writeText(targetEl.textContent);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      } catch (e) {
        // Fallback
        const range = document.createRange();
        range.selectNodeContents(targetEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      }
    });
  });

  // Check MCP server health
  checkMCPHealth();
}

async function checkMCPHealth() {
  const statusEl = document.getElementById('mcp-status');
  if (!statusEl) return;

  try {
    const resp = await fetch('/api/health');
    if (resp.ok) {
      const data = await resp.json();
      if (data.mcp) {
        statusEl.classList.add('online');
        statusEl.classList.remove('offline');
        statusEl.querySelector('span').textContent = 'MCP server is online and ready';
      }
    }
  } catch (e) {
    statusEl.classList.add('offline');
    statusEl.classList.remove('online');
    statusEl.querySelector('span').textContent = 'MCP server is offline';
  }
}
