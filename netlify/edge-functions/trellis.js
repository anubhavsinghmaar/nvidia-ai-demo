// TRELLIS 3D generation — requires 3-step NVIDIA asset upload flow:
// 1. Create an NVIDIA asset → get assetId + pre-signed uploadUrl
// 2. PUT the raw image bytes to the uploadUrl
// 3. Call TRELLIS with asset_id reference
export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { apiKey, imageBase64, imageType, slatCfg, ssCfg, steps, seed } = await request.json();

    const contentType = imageType || 'image/png';

    // ── Step 1: Register asset with NVIDIA ──────────────────────────────────
    const assetRes = await fetch('https://api.nvcf.nvidia.com/v2/nvcf/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        contentType,
        description: 'trellis-input',
      }),
    });

    if (!assetRes.ok) {
      const err = await assetRes.text();
      return new Response(
        JSON.stringify({ error: `Asset create failed (${assetRes.status}): ${err}` }),
        { status: assetRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { assetId, uploadUrl } = await assetRes.json();

    // ── Step 2: Upload raw image bytes to pre-signed URL ────────────────────
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-meta-nvcf-asset-description': 'trellis-input',
      },
      body: imageBytes,
    });

    if (!uploadRes.ok) {
      return new Response(
        JSON.stringify({ error: `Image upload failed (${uploadRes.status})` }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // ── Step 3: Call TRELLIS with asset_id reference ────────────────────────
    const trellisRes = await fetch('https://ai.api.nvidia.com/v1/genai/microsoft/trellis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'NVCF-INPUT-ASSET-REFERENCES': assetId,
      },
      body: JSON.stringify({
        image: `data:${contentType};example_id,${assetId}`,
        slat_cfg_scale: slatCfg,
        ss_cfg_scale: ssCfg,
        slat_sampling_steps: steps,
        ss_sampling_steps: steps,
        seed,
      }),
    });

    const data = await trellisRes.text();

    return new Response(data, {
      status: trellisRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
};

export const config = { path: '/api/trellis' };
