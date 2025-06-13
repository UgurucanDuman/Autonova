import { supabase } from '../lib/supabase';

// Fotoğraf hash'i oluşturma fonksiyonu (SHA-256 ile güçlü hash)
export async function generateImageHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Perceptual hash oluşturma (görsel benzerlik için)
export async function generatePerceptualHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 8x8 boyutuna küçült
        canvas.width = 8;
        canvas.height = 8;
        
        if (!ctx) {
          reject('Canvas desteklenmiyor');
          return;
        }
        
        // Resmi küçült ve gri tonlara çevir
        ctx.drawImage(img, 0, 0, 8, 8);
        const imageData = ctx.getImageData(0, 0, 8, 8);
        const pixels = imageData.data;
        
        // Ortalama parlaklığı hesapla
        let totalBrightness = 0;
        const grayscale: number[] = [];
        
        for (let i = 0; i < pixels.length; i += 4) {
          const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          grayscale.push(brightness);
          totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / grayscale.length;
        
        // Binary hash oluştur
        let hash = '';
        for (const brightness of grayscale) {
          hash += brightness > avgBrightness ? '1' : '0';
        }
        
        resolve(hash);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Kullanıcının daha önce aynı fotoğrafı yüklemiş mi kontrol et (hem SHA-256 hem perceptual hash ile)
export async function checkDuplicateImage(userId: string, imageHash: string, perceptualHash?: string): Promise<{
  isDuplicate: boolean;
  existingListing?: any;
  duplicateType?: 'exact' | 'similar';
}> {
  try {
    // Önce exact match kontrol et (SHA-256)
    const { data: exactMatch, error: exactError } = await supabase
      .from('car_images')
      .select(`
        *,
        car_listings!inner (
          id,
          user_id,
          brand,
          model,
          year,
          status
        )
      `)
      .eq('image_hash', imageHash)
      .eq('car_listings.user_id', userId);

    if (exactError) {
      console.error('Exact duplicate check error:', exactError);
    } else if (exactMatch && exactMatch.length > 0) {
      return {
        isDuplicate: true,
        existingListing: exactMatch[0].car_listings,
        duplicateType: 'exact'
      };
    }

    // Eğer perceptual hash varsa, benzer fotoğrafları da kontrol et
    if (perceptualHash) {
      const { data: similarMatches, error: similarError } = await supabase
        .from('car_images')
        .select(`
          *,
          car_listings!inner (
            id,
            user_id,
            brand,
            model,
            year,
            status
          )
        `)
        .eq('car_listings.user_id', userId);

      if (similarError) {
        console.error('Similar duplicate check error:', similarError);
      } else if (similarMatches && similarMatches.length > 0) {
        // Perceptual hash benzerliği kontrol et
        for (const match of similarMatches) {
          if (match.perceptual_hash) {
            const similarity = calculateHashSimilarity(perceptualHash, match.perceptual_hash);
            // %90 ve üzeri benzerlik varsa duplicate kabul et
            if (similarity >= 0.9) {
              return {
                isDuplicate: true,
                existingListing: match.car_listings,
                duplicateType: 'similar'
              };
            }
          }
        }
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicate image:', error);
    return { isDuplicate: false };
  }
}

// Hash benzerliği hesaplama (Hamming distance)
function calculateHashSimilarity(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) {
      matches++;
    }
  }
  
  return matches / hash1.length;
}

// Araç fotoğrafı doğrulama için basit kontroller
export async function validateCarImage(imageFile: File): Promise<boolean> {
  try {
    // Dosya boyutu kontrolü (çok küçük resimler genelde araç fotoğrafı değildir)
    if (imageFile.size < 50000) { // 50KB'den küçükse
      return false;
    }

    // Dosya adı kontrolü - araç ile ilgili kelimeler
    const fileName = imageFile.name.toLowerCase();
    const carKeywords = ['car', 'auto', 'vehicle', 'araba', 'otomobil', 'araç'];
    const hasCarKeyword = carKeywords.some(keyword => fileName.includes(keyword));

    // Görsel analizi için Canvas kullanarak basit kontroller
    const isValidImage = await analyzeImageContent(imageFile);

    // Eğer dosya adında araç kelimesi varsa veya görsel analizi geçerse kabul et
    if (hasCarKeyword || isValidImage) {
      return true;
    }

    // Supabase edge function ile gelişmiş doğrulama (opsiyonel)
    try {
      const base64 = await fileToBase64(imageFile);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-car-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 }),
      });

      if (response.ok) {
        const { isCarImage } = await response.json();
        return isCarImage;
      }
    } catch (error) {
      console.warn('Edge function validation failed, using local validation');
    }

    // Varsayılan olarak reddediyoruz
    return false;
  } catch (error) {
    console.error('Error validating image:', error);
    // Hata durumunda güvenli tarafta kalıp reddediyoruz
    return false;
  }
}

// Dosyayı base64'e çevir
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Görsel içeriği analiz et
async function analyzeImageContent(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        resolve(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      
      try {
        // Görsel boyut oranı kontrolü (araçlar genelde yatay)
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 3) {
          resolve(false);
          return;
        }

        // Renk analizi - araçlar genelde çeşitli renkler içerir
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colorVariance = calculateColorVariance(imageData.data);
        
        // Çok düşük renk çeşitliliği varsa (tek renk, logo vb.) reddet
        if (colorVariance < 1000) {
          resolve(false);
          return;
        }

        resolve(true);
      } catch (error) {
        console.warn('Image analysis failed:', error);
        resolve(false);
      }
    };

    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
}

// Renk çeşitliliğini hesapla
function calculateColorVariance(data: Uint8ClampedArray): number {
  const colors: number[] = [];
  
  // Her 100. pikseli örnekle (performans için)
  for (let i = 0; i < data.length; i += 400) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    colors.push(r + g + b);
  }

  if (colors.length === 0) return 0;

  const mean = colors.reduce((sum, color) => sum + color, 0) / colors.length;
  const variance = colors.reduce((sum, color) => sum + Math.pow(color - mean, 2), 0) / colors.length;
  
  return variance;
}

// Yasaklı içerik türlerini kontrol et
export function isProhibitedContent(fileName: string): boolean {
  const prohibitedKeywords = [
    'person', 'people', 'face', 'human', 'kişi', 'insan', 'yüz',
    'food', 'yemek', 'meal', 'restaurant',
    'animal', 'hayvan', 'pet', 'dog', 'cat', 'köpek', 'kedi',
    'building', 'house', 'ev', 'bina', 'architecture',
    'nature', 'landscape', 'doğa', 'manzara',
    'screenshot', 'ekran', 'screen'
  ];

  const lowerFileName = fileName.toLowerCase();
  return prohibitedKeywords.some(keyword => lowerFileName.includes(keyword));
}

// Gelişmiş doğrulama - dosya metadata kontrolü
export function validateImageMetadata(file: File): boolean {
  // EXIF verilerinde araç bilgisi arama (gelecekte eklenebilir)
  // Şimdilik temel kontroller
  
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (!extension || !validExtensions.includes(extension)) {
    return false;
  }

  // Minimum çözünürlük kontrolü
  return file.size > 100000; // 100KB minimum
}