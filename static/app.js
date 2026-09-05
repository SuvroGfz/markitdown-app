document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const resultPanel = document.getElementById('result-panel');
    
    const statSize = document.getElementById('stat-size');
    const statTime = document.getElementById('stat-time');
    const statTokens = document.getElementById('stat-tokens');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const previewContent = document.getElementById('preview-content');
    const rawContent = document.getElementById('raw-content');
    
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const convertAnotherBtn = document.getElementById('convert-another-btn');
    const toast = document.getElementById('toast');

    // State
    let currentMarkdown = '';
    let currentFilename = 'document';

    // Constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Drag and Drop Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        }, false);
    });

    uploadZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Click to upload
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) {
            fileInput.click();
        }
    });

    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
        // Reset value to allow uploading the same file again
        this.value = '';
    });

    // File Validation & Handling
    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            showError('Please select a valid PDF file.');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showError(`File size exceeds 10MB. (Your file: ${formatFileSize(file.size)})`);
            return;
        }

        currentFilename = file.name.replace(/\.[^/.]+$/, "");
        uploadFile(file);
    }

    // Upload & Convert
    async function uploadFile(file) {
        showLoading();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();
            renderResults(data);
        } catch (error) {
            showError(error.message || 'An unexpected error occurred during conversion.');
        }
    }

    // Render Results
    function renderResults(data) {
        hideLoading();
        
        currentMarkdown = data.markdown || '';
        
        // Update stats
        const stats = data.stats || {};
        statSize.textContent = formatFileSize(stats.file_size_bytes || 0);
        statTime.textContent = Math.round(stats.processing_time_ms || 0) + 'ms';
        statTokens.textContent = (stats.token_count || 0).toLocaleString();

        // Update content
        rawContent.textContent = currentMarkdown;
        try {
            previewContent.innerHTML = marked.parse(currentMarkdown);
        } catch (e) {
            previewContent.innerHTML = '<p class="error-text">Failed to parse markdown preview.</p>';
        }

        // Show panel and reset to preview tab
        resultPanel.classList.remove('hidden');
        switchTab('preview');
    }

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    function switchTab(tabId) {
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabId}-content`) {
                content.classList.add('active');
            }
        });
    }

    // Actions
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
        } catch (err) {
            showToast('Failed to copy text', true);
        }
    });

    convertAnotherBtn.addEventListener('click', () => {
        resetApp();
    });

    retryBtn.addEventListener('click', () => {
        resetApp();
    });

    // UI State Management
    function showLoading() {
        uploadZone.classList.add('hidden');
        errorState.classList.add('hidden');
        resultPanel.classList.add('hidden');
        loadingState.classList.remove('hidden');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
    }

    function showError(msg) {
        hideLoading();
        uploadZone.classList.add('hidden');
        resultPanel.classList.add('hidden');
        
        errorMessage.textContent = msg;
        errorState.classList.remove('hidden');
    }

    function resetApp() {
        currentMarkdown = '';
        currentFilename = 'document';
        
        errorState.classList.add('hidden');
        resultPanel.classList.add('hidden');
        loadingState.classList.add('hidden');
        uploadZone.classList.remove('hidden');
    }

    let toastTimeout;
    function showToast(msg, isError = false) {
        toast.textContent = msg;
        toast.style.background = isError ? 'var(--error-color)' : 'var(--success-color)';
        
        toast.classList.remove('hidden');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2500);
    }

    // Helpers
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
});
