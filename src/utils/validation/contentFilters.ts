// İçerik filtreleme fonksiyonları

// Yasaklı içerik türlerini kontrol et
export function isProhibitedContent(fileName: string): boolean {
  const prohibitedKeywords = [
    'person', 'people', 'face', 'human', 'kişi', 'insan', 'yüz',
    'food', 'yemek', 'meal', 'restaurant',
    'animal', 'hayvan', 'pet', 'dog', 'cat', 'köpek', 'kedi',
    'building', 'house', 'ev', 'bina', 'architecture',
    'nature', 'landscape', 'doğa', 'manzara',
    'screenshot', 'ekran', 'screen', 'logo', 'text', 'document'
  ];

  const lowerFileName = fileName.toLowerCase();
  return prohibitedKeywords.some(keyword => lowerFileName.includes(keyword));
}

// Gelişmiş doğrulama - dosya metadata kontrolü
export function validateImageMetadata(file: File): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (!extension || !validExtensions.includes(extension)) {
    return false;
  }

  // Minimum dosya boyutu kontrolü
  return file.size > 100000; // 100KB minimum
}

// MIME type kontrolü
export function validateMimeType(file: File): boolean {
  const validMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];
  
  return validMimeTypes.includes(file.type);
}

// Dosya adında araç kelimesi var mı kontrol et
export function hasCarKeywords(fileName: string): boolean {
  const carKeywords = [
    'car', 'auto', 'vehicle', 'araba', 'otomobil', 'araç',
    'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'ford',
    'volkswagen', 'nissan', 'hyundai', 'kia', 'mazda',
    'sedan', 'suv', 'hatchback', 'coupe', 'convertible'
  ];
  
  const lowerFileName = fileName.toLowerCase();
  return carKeywords.some(keyword => lowerFileName.includes(keyword));
}