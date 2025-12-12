interface CobaltResponse {
  status: string;
  text?: string;
  url?: string;
  picker?: any[];
  filename?: string;
}

export const extractYoutubeAudio = async (url: string): Promise<{ url: string, filename: string }> => {
  // We use the Cobalt API which is a reliable, free, and ad-free media downloader.
  
  // 'corsproxy.io' often returns 400 for POST requests with JSON bodies.
  // 'api.codetabs.com' handles POST requests/headers more reliably for this specific API.
  const BASE_URL = 'https://api.cobalt.tools/api/json';
  const PROXY_URL = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(BASE_URL);

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        isAudioOnly: true,
        aFormat: 'mp3',
        filenamePattern: 'basic' 
      })
    });

    if (!response.ok) {
        // Try to read the error text if possible
        const errText = await response.text().catch(() => '');
        console.error("API Error Body:", errText);
        throw new Error(`API Network Error: ${response.status}`);
    }

    const data: CobaltResponse = await response.json();

    if (data.status === 'error') {
      throw new Error(data.text || 'Failed to extract audio');
    }

    if (data.status === 'picker') {
        throw new Error('Video requires selection, please try a single video URL.');
    }

    const filename = data.filename || 'Extracted Song';

    return { 
        url: data.url || '', 
        filename: filename 
    };

  } catch (error) {
    console.error('Extraction API Error:', error);
    throw error;
  }
};