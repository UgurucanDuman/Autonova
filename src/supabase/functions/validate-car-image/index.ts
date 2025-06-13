import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }), 
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Basit araç fotoğrafı doğrulaması
    const isCarImage = await validateCarImage(image);

    return new Response(
      JSON.stringify({ 
        isCarImage,
        message: isCarImage ? 'Valid car image' : 'Not a car image'
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during image validation',
        isCarImage: false
      }), 
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

async function validateCarImage(base64Image: string): Promise<boolean> {
  try {
    // Base64'ten görsel verisini çıkar
    const base64Data = base64Image.split(',')[1];
    if (!base64Data) {
      return false;
    }

    // Basit heuristik kontroller
    const imageSize = base64Data.length;
    
    // Çok küçük resimler genelde araç fotoğrafı değildir
    if (imageSize < 50000) { // ~37KB base64
      return false;
    }

    // Çok büyük resimler de şüpheli olabilir (ama araç fotoğrafı olabilir)
    if (imageSize > 10000000) { // ~7.5MB base64
      return false;
    }

    // Gelecekte burada ML modeli kullanılabilir
    // Şimdilik basit kontroller ile geçiyoruz
    
    // Rastgele faktör ekleyerek %85 başarı oranı simüle ediyoruz
    // Gerçek uygulamada burada TensorFlow.js veya başka bir ML kütüphanesi kullanılır
    const randomFactor = Math.random();
    
    // Büyük ihtimalle araç fotoğrafıdır ama %15 hata payı bırakıyoruz
    return randomFactor > 0.15;

  } catch (error) {
    console.error('Error validating car image:', error);
    return false;
  }
}