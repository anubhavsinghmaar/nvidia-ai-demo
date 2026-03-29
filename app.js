// ─── API Key Management ───
const API_KEYS = {
  flux:     'nvidia_key_flux',
  mistral:  'nvidia_key_mistral',
  minimax:  'nvidia_key_minimax',
  qwen:     'nvidia_key_qwen',
  glm:      'nvidia_key_glm',
  kimi:     'nvidia_key_kimi',
  deepseek: 'nvidia_key_deepseek',
  cached:   'nvidia_key_cached',
  trellis:  'nvidia_key_trellis',
};

function getKey(model) {
  return sessionStorage.getItem(API_KEYS[model]) || '';
}

function requireKey(model) {
  if (!getKey(model)) {
    showApiModal();
    return false;
  }
  return true;
}

function showApiModal() {
  document.getElementById('apiModal').classList.add('active');
  // Populate existing saved keys
  Object.entries(API_KEYS).forEach(([model, storageKey]) => {
    const el = document.getElementById('key_' + model);
    if (el) el.value = sessionStorage.getItem(storageKey) || '';
  });
}

function hideApiModal() {
  document.getElementById('apiModal').classList.remove('active');
}

function hasAnyKey() {
  return Object.values(API_KEYS).some(k => sessionStorage.getItem(k));
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  if (!hasAnyKey()) showApiModal();

  document.getElementById('saveApiKey').addEventListener('click', () => {
    let saved = 0;
    Object.keys(API_KEYS).forEach(model => {
      const el = document.getElementById('key_' + model);
      if (el && el.value.trim()) {
        sessionStorage.setItem(API_KEYS[model], el.value.trim());
        saved++;
      }
    });
    if (!saved) { alert('Please enter at least one API key.'); return; }
    hideApiModal();
  });

  document.getElementById('apiConfigBtn').addEventListener('click', showApiModal);

  // Section switching
  document.getElementById('sectionSelect').addEventListener('change', (e) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section' + e.target.value).classList.add('active');
  });

  // FLUX steps label
  document.getElementById('fluxSteps').addEventListener('input', (e) => {
    document.getElementById('fluxStepsVal').textContent = e.target.value;
  });

  // Section 1 - FLUX
  document.getElementById('fluxGenerate').addEventListener('click', generateFluxImage);

  // Section 2 - Code Gen
  document.getElementById('codeGenerate').addEventListener('click', generateCode);

  // Section 2 - Copy/Download buttons
  document.querySelectorAll('.model-card .btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.model-card').querySelector('code').textContent;
      navigator.clipboard.writeText(code);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });
  document.querySelectorAll('.model-card .btn-download').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.model-card');
      const code = card.querySelector('code').textContent;
      const name = card.querySelector('.model-name').textContent.replace(/[^a-zA-Z0-9]/g, '_');
      downloadText(code, name + '_output.txt');
    });
  });

  // Section 3 - CACHED
  setupFileUpload('cachedDropZone', 'cachedUpload', 'cachedPreview');
  document.getElementById('cachedAnalyze').addEventListener('click', analyzeChart);

  // Section 4 - TRELLIS
  setupFileUpload('trellisDropZone', 'trellisUpload', 'trellisPreview');
  document.getElementById('trellisGenerate').addEventListener('click', generateTrellis);
});


// ─── File Upload Helpers ───
function setupFileUpload(dropZoneId, inputId, previewId) {
  const dropZone = document.getElementById(dropZoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  dropZone.addEventListener('click', () => input.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      showPreview(input, preview);
    }
  });
  input.addEventListener('change', () => showPreview(input, preview));
}

function showPreview(input, preview) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.hidden = false;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


// ─── Section 1: FLUX Image Generation ───
async function generateFluxImage() {
  if (!requireKey('flux')) return;

  const btn = document.getElementById('fluxGenerate');
  const result = document.getElementById('fluxResult');
  const prompt = document.getElementById('fluxPrompt').value.trim();
  if (!prompt) { alert('Please enter a prompt'); return; }

  const [width, height] = document.getElementById('fluxResolution').value.split('x').map(Number);
  const steps = parseInt(document.getElementById('fluxSteps').value);
  const seed = parseInt(document.getElementById('fluxSeed').value);

  btn.disabled = true;
  btn.textContent = 'Generating...';
  result.innerHTML = '<div class="placeholder"><span class="loader"></span><br>Generating image...</div>';

  try {
    const response = await fetch('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getKey('flux'),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, width, height, seed, steps })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('API Error ' + response.status + ': ' + err);
    }

    const data = await response.json();

    // Handle various response formats
    let imgSrc = null;
    if (data.artifacts && data.artifacts[0]) {
      imgSrc = 'data:image/png;base64,' + data.artifacts[0].base64;
    } else if (data.b64_json) {
      imgSrc = 'data:image/png;base64,' + data.b64_json;
    } else if (data.image) {
      imgSrc = data.image.url || ('data:image/png;base64,' + data.image);
    } else if (data.output && data.output[0]) {
      imgSrc = data.output[0].url || ('data:image/png;base64,' + data.output[0]);
    }

    if (imgSrc) {
      result.innerHTML = `
        <div class="result-actions">
          <button class="btn btn-sm" onclick="downloadImage()">Download Image</button>
        </div>
        <img id="fluxImg" src="${imgSrc}" alt="Generated image">
      `;
    } else {
      result.innerHTML = '<div class="json-output">' + JSON.stringify(data, null, 2) + '</div>';
    }
  } catch (err) {
    result.innerHTML = '<div class="placeholder" style="color:var(--danger)">' + escapeHtml(err.message) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Image';
  }
}

function downloadImage() {
  const img = document.getElementById('fluxImg');
  if (!img) return;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = 'flux_generated.png';
  a.click();
}


// ─── Section 2: Multi-Model Code Generation ───
const CODING_MODELS = [
  {
    key: 'mistral',
    id: 'mistralai/mistral-small-4-119b-2603',
    params: { reasoning_effort: 'high', temperature: 0.10, top_p: 1.00, max_tokens: 16384 }
  },
  {
    key: 'minimax',
    id: 'minimaxai/minimax-m2.5',
    params: { temperature: 1, top_p: 0.95, max_tokens: 8192 }
  },
  {
    key: 'qwen',
    id: 'qwen/qwen3.5-397b-a17b',
    params: { temperature: 0.6, top_p: 0.95, max_tokens: 32768 }
  },
  {
    key: 'glm',
    id: 'z-ai/glm5',
    params: { temperature: 1, top_p: 1, max_tokens: 16384 },
    extra_body: { chat_template_kwargs: { enable_thinking: true, clear_thinking: false } }
  },
  {
    key: 'kimi',
    id: 'moonshotai/kimi-k2.5',
    params: { temperature: 1.00, top_p: 1.00, max_tokens: 16384, chat_template_kwargs: { thinking: true } }
  },
  {
    key: 'deepseek',
    id: 'deepseek-ai/deepseek-v3.2',
    params: { temperature: 1, top_p: 0.95, max_tokens: 8192 },
    extra_body: { chat_template_kwargs: { thinking: true } }
  }
];

async function generateCode() {
  // Check at least one coding key is set
  const hasCodeKey = ['mistral','minimax','qwen','glm','kimi','deepseek'].some(m => getKey(m));
  if (!hasCodeKey) { showApiModal(); return; }

  const prompt = document.getElementById('codePrompt').value.trim();
  if (!prompt) { alert('Please enter a coding prompt'); return; }

  const btn = document.getElementById('codeGenerate');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  // Clear all outputs
  document.querySelectorAll('.model-card code').forEach(el => el.textContent = '');
  document.querySelectorAll('.model-status').forEach(el => {
    el.textContent = 'Waiting...';
    el.className = 'model-status';
  });

  // Fire all models in parallel
  const promises = CODING_MODELS.map(model => streamCodingModel(model, prompt));
  await Promise.allSettled(promises);

  btn.disabled = false;
  btn.textContent = 'Generate Code (All Models)';
}

async function streamCodingModel(model, prompt) {
  const card = document.querySelector(`.model-card[data-model="${model.key}"]`);
  const codeEl = card.querySelector('code');
  const statusEl = card.querySelector('.model-status');

  const apiKey = getKey(model.key);
  if (!apiKey) {
    statusEl.textContent = 'No key set';
    statusEl.className = 'model-status error';
    codeEl.textContent = 'No API key configured for this model. Click the ⚙ gear icon to add one.';
    return;
  }

  statusEl.textContent = 'Running...';
  statusEl.className = 'model-status running';

  const payload = {
    model: model.id,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    ...model.params,
    ...(model.extra_body || {})
  };

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('API ' + response.status + ': ' + err.slice(0, 200));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (delta) {
            // Handle reasoning content (thinking)
            const reasoning = delta.reasoning_content;
            if (reasoning) {
              codeEl.textContent += reasoning;
            }
            // Handle regular content
            if (delta.content) {
              codeEl.textContent += delta.content;
            }
          }
        } catch (e) {
          // Skip unparseable lines
        }
      }

      // Auto-scroll
      const pre = card.querySelector('.model-output');
      pre.scrollTop = pre.scrollHeight;
    }

    statusEl.textContent = 'Done';
    statusEl.className = 'model-status';
  } catch (err) {
    statusEl.textContent = 'Error';
    statusEl.className = 'model-status error';
    codeEl.textContent = 'Error: ' + err.message;
  }
}


// ─── Section 3: CACHED Chart Detection ───
async function analyzeChart() {
  if (!requireKey('cached')) return;

  const input = document.getElementById('cachedUpload');
  if (!input.files || !input.files[0]) { alert('Please upload a chart image'); return; }

  const btn = document.getElementById('cachedAnalyze');
  const result = document.getElementById('cachedResult');

  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  result.innerHTML = '<div class="placeholder"><span class="loader"></span><br>Detecting chart elements...</div>';

  try {
    const dataUrl = await fileToBase64(input.files[0]);
    const base64Part = dataUrl.split(',')[1];

    if (base64Part.length > 180000) {
      throw new Error('Image too large. Please use an image under 180KB base64 (~135KB file size).');
    }

    const response = await fetch('https://ai.api.nvidia.com/v1/cv/university-at-buffalo/cached', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getKey('cached'),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          content: [{
            type: 'image_url',
            image_url: { url: dataUrl }
          }]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('API Error ' + response.status + ': ' + err);
    }

    const data = await response.json();
    renderCachedResults(data, result);
  } catch (err) {
    result.innerHTML = '<div class="placeholder" style="color:var(--danger)">' + escapeHtml(err.message) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze Chart';
  }
}

function renderCachedResults(data, container) {
  // Try to parse known response structures
  let html = '<div class="result-actions"><button class="btn btn-sm" id="downloadCachedJson">Download JSON</button></div>';

  if (data.data || data.choices || data.detections) {
    const detections = data.detections || data.data || data.choices;
    if (Array.isArray(detections)) {
      html += '<div class="detection-results">';
      for (const det of detections) {
        html += '<div class="detection-item">';
        if (det.label || det.class) {
          html += '<div class="det-label">' + escapeHtml(det.label || det.class) + '</div>';
        }
        if (det.text || det.content) {
          html += '<div>' + escapeHtml(det.text || det.content) + '</div>';
        }
        if (det.bbox || det.bounding_box) {
          const bbox = det.bbox || det.bounding_box;
          html += '<div style="color:var(--text-dim);font-size:0.75rem">bbox: [' + bbox.join(', ') + ']</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
  }

  // Always show raw JSON
  html += '<details style="margin-top:1rem"><summary style="cursor:pointer;color:var(--text-dim);font-size:0.85rem">Raw JSON Response</summary>';
  html += '<div class="json-output">' + escapeHtml(JSON.stringify(data, null, 2)) + '</div>';
  html += '</details>';

  container.innerHTML = html;

  document.getElementById('downloadCachedJson').addEventListener('click', () => {
    downloadText(JSON.stringify(data, null, 2), 'cached_results.json');
  });
}


// ─── Section 4: TRELLIS 3D Generation ───
async function generateTrellis() {
  if (!requireKey('trellis')) return;

  const input = document.getElementById('trellisUpload');
  if (!input.files || !input.files[0]) { alert('Please upload a reference image'); return; }

  const btn = document.getElementById('trellisGenerate');
  const result = document.getElementById('trellisResult');

  btn.disabled = true;
  btn.textContent = 'Generating 3D...';
  result.innerHTML = '<div class="placeholder"><span class="loader"></span><br>Generating 3D model... This may take a while.</div>';

  try {
    const dataUrl = await fileToBase64(input.files[0]);

    const response = await fetch('https://ai.api.nvidia.com/v1/genai/microsoft/trellis', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getKey('trellis'),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: dataUrl,
        slat_cfg_scale: parseFloat(document.getElementById('trellisCfg').value),
        ss_cfg_scale: parseFloat(document.getElementById('trellisSsCfg').value),
        slat_sampling_steps: parseInt(document.getElementById('trellisSteps').value),
        ss_sampling_steps: parseInt(document.getElementById('trellisSteps').value),
        seed: parseInt(document.getElementById('trellisSeed').value)
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('API Error ' + response.status + ': ' + err);
    }

    const data = await response.json();
    renderTrellisResult(data, result);
  } catch (err) {
    result.innerHTML = '<div class="placeholder" style="color:var(--danger)">' + escapeHtml(err.message) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate 3D';
  }
}

function renderTrellisResult(data, container) {
  let html = '<div class="result-actions">';

  // Try to find GLB data or URL in various response formats
  let glbUrl = null;

  if (data.output_glb) {
    glbUrl = data.output_glb;
  } else if (data.output && data.output.glb) {
    glbUrl = data.output.glb;
  } else if (data.artifacts && data.artifacts[0]) {
    const artifact = data.artifacts[0];
    if (artifact.url) glbUrl = artifact.url;
    else if (artifact.base64) {
      const blob = base64ToBlob(artifact.base64, 'model/gltf-binary');
      glbUrl = URL.createObjectURL(blob);
    }
  } else if (data.b64_json) {
    const blob = base64ToBlob(data.b64_json, 'model/gltf-binary');
    glbUrl = URL.createObjectURL(blob);
  }

  if (glbUrl) {
    html += '<button class="btn btn-sm" id="downloadGlb">Download GLB</button></div>';
    html += `<model-viewer src="${glbUrl}" auto-rotate camera-controls shadow-intensity="1" environment-image="neutral" style="width:100%;height:500px;border-radius:10px;background:#1a1a26;"></model-viewer>`;
    container.innerHTML = html;
    document.getElementById('downloadGlb').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = glbUrl;
      a.download = 'trellis_model.glb';
      a.click();
    });
  } else {
    html += '<button class="btn btn-sm" id="downloadTrellisJson">Download JSON</button></div>';
    html += '<div class="json-output">' + escapeHtml(JSON.stringify(data, null, 2)) + '</div>';
    container.innerHTML = html;
    document.getElementById('downloadTrellisJson').addEventListener('click', () => {
      downloadText(JSON.stringify(data, null, 2), 'trellis_result.json');
    });
  }
}

function base64ToBlob(base64, contentType) {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: contentType });
}


// ─── Utility ───
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
