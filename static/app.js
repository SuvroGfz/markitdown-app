/* ── Three.js Animated Particle Background ── */
(function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 30;

    // Particle system
    const COUNT = 350;
    const positions = new Float32Array(COUNT * 3);
    const velocities = [];

    for (let i = 0; i < COUNT; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
        velocities.push({
            x: (Math.random() - 0.5) * 0.008,
            y: (Math.random() - 0.5) * 0.008,
            z: (Math.random() - 0.5) * 0.004,
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x8b5cf6,
        size: 0.08,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Floating connection lines
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.04,
    });

    const linePositions = new Float32Array(100 * 6); // 100 lines * 2 verts * 3 coords
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);

        const pos = geometry.attributes.position.array;
        let lineIdx = 0;

        for (let i = 0; i < COUNT; i++) {
            pos[i * 3]     += velocities[i].x;
            pos[i * 3 + 1] += velocities[i].y;
            pos[i * 3 + 2] += velocities[i].z;

            // Wrap around
            if (pos[i * 3] > 30)  pos[i * 3] = -30;
            if (pos[i * 3] < -30) pos[i * 3] = 30;
            if (pos[i * 3 + 1] > 30)  pos[i * 3 + 1] = -30;
            if (pos[i * 3 + 1] < -30) pos[i * 3 + 1] = 30;

            // Draw lines between nearby particles
            if (lineIdx < 100) {
                for (let j = i + 1; j < COUNT && lineIdx < 100; j++) {
                    const dx = pos[i*3] - pos[j*3];
                    const dy = pos[i*3+1] - pos[j*3+1];
                    const dz = pos[i*3+2] - pos[j*3+2];
                    const dist = dx*dx + dy*dy + dz*dz;
                    if (dist < 25) {
                        linePositions[lineIdx * 6]     = pos[i*3];
                        linePositions[lineIdx * 6 + 1] = pos[i*3+1];
                        linePositions[lineIdx * 6 + 2] = pos[i*3+2];
                        linePositions[lineIdx * 6 + 3] = pos[j*3];
                        linePositions[lineIdx * 6 + 4] = pos[j*3+1];
                        linePositions[lineIdx * 6 + 5] = pos[j*3+2];
                        lineIdx++;
                    }
                }
            }
        }

        // Clear unused line segments
        for (let k = lineIdx; k < 100; k++) {
            linePositions[k * 6] = 0;
            linePositions[k * 6 + 1] = 0;
            linePositions[k * 6 + 2] = 0;
            linePositions[k * 6 + 3] = 0;
            linePositions[k * 6 + 4] = 0;
            linePositions[k * 6 + 5] = 0;
        }

        geometry.attributes.position.needsUpdate = true;
        lineGeometry.attributes.position.needsUpdate = true;

        // Subtle mouse parallax
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        points.rotation.y += 0.0003;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();


/* ── Main Application Logic ── */
document.addEventListener('DOMContentLoaded', () => {
    // DOM refs
    const uploadZone    = document.getElementById('upload-zone');
    const fileInput     = document.getElementById('file-input');
    const browseBtn     = document.getElementById('browse-btn');
    const loadingState  = document.getElementById('loading-state');
    const errorState    = document.getElementById('error-state');
    const errorMessage  = document.getElementById('error-message');
    const retryBtn      = document.getElementById('retry-btn');
    const resultPanel   = document.getElementById('result-panel');

    const statSize       = document.getElementById('stat-size');
    const statTime       = document.getElementById('stat-time');
    const statChars      = document.getElementById('stat-chars');
    const statRawTokens  = document.getElementById('stat-raw-tokens');
    const statMdTokens   = document.getElementById('stat-md-tokens');
    const savingsPct     = document.getElementById('savings-pct');
    const savingsBar     = document.getElementById('savings-bar');

    const tabBtns        = document.querySelectorAll('.tab-btn');
    const previewContent = document.getElementById('preview-content');
    const rawContent     = document.getElementById('raw-content');
    const downloadBtn    = document.getElementById('download-btn');
    const copyBtn        = document.getElementById('copy-btn');
    const convertAnother = document.getElementById('convert-another-btn');
    const toast          = document.getElementById('toast');
    const toastText      = document.getElementById('toast-text');

    let currentMarkdown = '';
    let currentFilename = 'document';
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    // ── Drag & Drop ──
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
        uploadZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
    );

    ['dragenter', 'dragover'].forEach(ev =>
        uploadZone.addEventListener(ev, () => uploadZone.classList.add('dragover'))
    );

    ['dragleave', 'drop'].forEach(ev =>
        uploadZone.addEventListener(ev, () => uploadZone.classList.remove('dragover'))
    );

    uploadZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    uploadZone.addEventListener('click', e => {
        if (e.target !== browseBtn) fileInput.click();
    });

    browseBtn.addEventListener('click', e => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) handleFile(this.files[0]);
        this.value = '';
    });

    // ── File handling ──
    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            showError('Invalid file type. Please select a PDF file.');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showError(`File too large (${formatSize(file.size)}). Maximum is 10 MB.`);
            return;
        }
        currentFilename = file.name.replace(/\.[^/.]+$/, '');
        uploadFile(file);
    }

    async function uploadFile(file) {
        showLoading();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => null);
                throw new Error(err?.detail || `Conversion failed (${response.status})`);
            }

            const data = await response.json();
            showResults(data);
        } catch (error) {
            showError(error.message || 'An unexpected error occurred.');
        }
    }

    // ── Render results ──
    function showResults(data) {
        hideAll();
        currentMarkdown = data.markdown || '';
        const s = data.stats || {};

        // Stats
        statSize.textContent  = formatSize(s.file_size_bytes || 0);
        statTime.textContent  = Math.round(s.processing_time_ms || 0) + 'ms';
        statChars.textContent = (s.markdown_length || 0).toLocaleString() + ' chars';

        // Token savings with animation
        const raw = s.raw_token_count || 0;
        const md  = s.md_token_count  || 0;
        const pct = s.savings_percentage || 0;

        statRawTokens.textContent = raw.toLocaleString();
        statMdTokens.textContent  = md.toLocaleString();
        savingsPct.textContent    = pct + '%';

        // Animate savings bar
        setTimeout(() => {
            savingsBar.style.width = Math.min(pct, 100) + '%';
        }, 100);

        // Markdown content
        rawContent.textContent = currentMarkdown;
        try {
            previewContent.innerHTML = marked.parse(currentMarkdown);
        } catch {
            previewContent.textContent = currentMarkdown;
        }

        resultPanel.classList.remove('hidden');
        switchTab('preview');
    }

    // ── Tabs ──
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    function switchTab(tabId) {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === tabId + '-content');
        });
    }

    // ── Actions ──
    downloadBtn.addEventListener('click', () => {
        if (!currentMarkdown) return;
        const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFilename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    copyBtn.addEventListener('click', async () => {
        if (!currentMarkdown) return;
        try {
            await navigator.clipboard.writeText(currentMarkdown);
            showToast('Copied to clipboard!');
        } catch {
            showToast('Failed to copy', true);
        }
    });

    convertAnother.addEventListener('click', resetApp);
    retryBtn.addEventListener('click', resetApp);

    // ── UI state ──
    function hideAll() {
        uploadZone.classList.add('hidden');
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        resultPanel.classList.add('hidden');
    }

    function showLoading() {
        hideAll();
        loadingState.classList.remove('hidden');
    }

    function showError(msg) {
        hideAll();
        errorMessage.textContent = msg;
        errorState.classList.remove('hidden');
    }

    function resetApp() {
        currentMarkdown = '';
        currentFilename = 'document';
        savingsBar.style.width = '0%';
        hideAll();
        uploadZone.classList.remove('hidden');
    }

    let toastTimer;
    function showToast(msg, isError = false) {
        toastText.textContent = msg;
        toast.className = 'toast' + (isError ? ' error' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
    }

    // ── Helpers ──
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }
});
