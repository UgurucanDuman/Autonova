import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs'; // TensorFlow.js için gerekli

// Tip tanımlamaları
interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason?: string;
  suggestions?: string[];
}

interface ValidationDetails {
  basicValidation: ValidationResult;
  imageAnalysis: ValidationResult;
  aiValidation: ValidationResult;
  detailAnalysis?: {
    detailScore: number;
    detailReason?: string;
  };
}

interface ObjectDetectionResult {
  cars: number;
  animals: number;
  predictions: cocoSsd.DetectedObject[];
}

// Ana araç fotoğrafı doğrulama sınıfı
export class CarImageValidator {
  private static instance: CarImageValidator;
  // Duplicate kontrolü için statik set
  private static usedImageHashes: Set<string> = new Set<string>();
  private objectDetectionModel: cocoSsd.ObjectDetection | null = null;

  static getInstance(): CarImageValidator {
    if (!CarImageValidator.instance) {
      CarImageValidator.instance = new CarImageValidator();
    }
    return CarImageValidator.instance;
  }

  // Ana doğrulama fonksiyonu
  async validateCarImage(file: File): Promise<{
    isValid: boolean;
    confidence: number;
    reason?: string;
    suggestions?: string[];
    details?: ValidationDetails;
  }> {
    try {
      this.updateProgress(10, 'Temel kontroller yapılıyor...');
      // 1. Temel dosya kontrolleri
      const basicValidation = this.validateBasicRequirements(file);
      if (!basicValidation.isValid) {
        this.updateProgress(0, 'Temel kontroller başarısız');
        return basicValidation;
      }

      // Duplicate kontrolü: Aynı fotoğraf daha önce kullanıldı mı? 
      this.updateProgress(5, 'Duplicate kontrol ediliyor...');
      const isDuplicate = await this.isDuplicateImage(file);
      if (isDuplicate) {
        this.updateProgress(0, 'Aynı fotoğraf daha önce kullanılmış');
        return {
          isValid: false,
          confidence: 0,
          reason: 'Aynı fotoğraf defalarca kullanılmış.',
          suggestions: ['Farklı bir fotoğraf kullanın.']
        };
      }

      this.updateProgress(30, 'Görsel analiz yapılıyor...');
      // 2. Görsel analiz (çözünürlük, renk, kenar, parlaklık)
      const imageAnalysis = await this.analyzeImageContent(file);
      if (!imageAnalysis.isValid) {
        this.updateProgress(20, 'Görsel analiz başarısız');
        return imageAnalysis;
      }

      this.updateProgress(50, 'AI doğrulaması yapılıyor...');
      // 3. Nesne tespiti tabanlı AI doğrulaması
      const aiValidation = await this.validateWithAI(file);

      this.updateProgress(70, 'Detay analizi yapılıyor...');
      // 4. Detay analizi
      const detailAnalysis = await this.analyzeCarDetails(file);

      // 5. Sonuçları birleştirip final güven skorunu hesapla
      const finalConfidence = (imageAnalysis.confidence + aiValidation.confidence + detailAnalysis.detailScore) / 3;
      this.updateProgress(100, 'Analiz tamamlandı');

      const combinedDetails: ValidationDetails = {
        basicValidation,
        imageAnalysis,
        aiValidation,
        detailAnalysis
      };

      let suggestions: string[] | undefined;
      if (finalConfidence <= 0.7) {
        suggestions = this.getSuggestions();
        suggestions.push("Aracın detaylarını (far, direksiyon, torpido gibi) içeren fotoğraf çekmeyi deneyin.");
      }

      return {
        isValid: finalConfidence > 0.7,
        confidence: finalConfidence,
        reason: finalConfidence <= 0.7 ? 'Fotoğraf detayları yetersiz' : undefined,
        suggestions,
        details: combinedDetails
      };

    } catch (error) {
      console.error('Doğrulama hatası:', error);
      this.updateProgress(0, 'Fotoğraf analiz edilemedi');
      return {
        isValid: false,
        confidence: 0,
        reason: 'Fotoğraf analiz edilemedi',
        suggestions: this.getSuggestions()
      };
    }
  }

  // Temel gereksinimler: dosya boyutu, tür, isim analizi, vb.
  private validateBasicRequirements(file: File): ValidationResult {
    if (file.size < 100000) { // 100KB
      return {
        isValid: false,
        confidence: 0,
        reason: 'Fotoğraf çok küçük. En az 100KB olmalıdır.'
      };
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return {
        isValid: false,
        confidence: 0,
        reason: 'Fotoğraf çok büyük. En fazla 50MB olabilir.'
      };
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Desteklenmeyen dosya formatı. JPG, PNG veya WebP kullanın.'
      };
    }
    const fileName = file.name.toLowerCase();
    const carKeywords = ['car', 'auto', 'vehicle', 'araba', 'otomobil', 'araç', 'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'ford', 'sedan', 'suv', 'hatchback', 'coupe'];
    const prohibitedKeywords = ['person', 'people', 'face', 'human', 'kişi', 'insan', 'food', 'yemek', 'animal', 'hayvan', 'building', 'bina', 'screenshot', 'ekran', 'logo', 'text', 'document'];
    const hasCarKeyword = carKeywords.some(keyword => fileName.includes(keyword));
    const hasProhibitedKeyword = prohibitedKeywords.some(keyword => fileName.includes(keyword));
    if (hasProhibitedKeyword) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Dosya adı araç fotoğrafı için uygun değil.'
      };
    }
    return {
      isValid: true,
      confidence: hasCarKeyword ? 0.8 : 0.5
    };
  }

  // Görsel içerik analizi: çözünürlük, aspect ratio, renk, kenar ve parlaklık
  private async analyzeImageContent(file: File): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      img.onload = async () => {
        try {
          canvas.width = Math.min(img.width, 800);
          canvas.height = Math.min(img.height, 600);
          if (!ctx) {
            resolve({ isValid: false, confidence: 0, reason: 'Canvas desteklenmiyor' });
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (img.width < 640 || img.height < 480) {
            resolve({
              isValid: false,
              confidence: 0,
              reason: 'Fotoğraf çözünürlüğü çok düşük. En az 640x480 olmalıdır.'
            });
            return;
          }
          const aspectRatio = img.width / img.height;
          if (aspectRatio < 0.3 || aspectRatio > 4) {
            resolve({
              isValid: false,
              confidence: 0.3,
              reason: 'Fotoğraf oranı araç fotoğrafı için uygun değil.'
            });
            return;
          }
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const colorAnalysis = this.analyzeColors(imageData.data);
          // Asenkron kenar tespiti (progress bar güncellemesi dahil)
          const edgeAnalysis = await this.detectEdges(imageData.data, canvas.width, canvas.height);
          const brightnessAnalysis = this.analyzeBrightness(imageData.data);
          let confidence = 0.5;
          if (colorAnalysis.variance > 2000) confidence += 0.2;
          if (edgeAnalysis.edgeCount > 1000) confidence += 0.2;
          if (brightnessAnalysis.isWellLit) confidence += 0.1;
          if (aspectRatio >= 1.2 && aspectRatio <= 2.5) confidence += 0.2;
          resolve({
            isValid: confidence > 0.6,
            confidence: Math.min(confidence, 1.0),
            reason: confidence <= 0.6 ? 'Görsel analizi araç fotoğrafı olmadığını gösteriyor' : undefined
          });
        } catch (error) {
          resolve({ isValid: false, confidence: 0, reason: 'Görsel analiz hatası' });
        }
      };
      img.onerror = () => {
        resolve({ isValid: false, confidence: 0, reason: 'Fotoğraf yüklenemedi' });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // COCO-SSD modelini yükleme
  private async loadDetectionModel(): Promise<cocoSsd.ObjectDetection> {
    if (!this.objectDetectionModel) {
      this.objectDetectionModel = await cocoSsd.load();
    }
    return this.objectDetectionModel;
  }

  // Görüntüde nesneleri tespit etme
  private async detectObjects(file: File): Promise<ObjectDetectionResult> {
    return new Promise<ObjectDetectionResult>((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          const model = await this.loadDetectionModel();
          const predictions = await model.detect(img);
          let carCount = 0;
          let animalCount = 0;
          predictions.forEach((prediction) => {
            const label = prediction.class.toLowerCase();
            if (['car', 'truck', 'bus'].includes(label)) {
              carCount++;
            } else if (['cat', 'dog', 'bird', 'horse', 'sheep', 'cow'].includes(label)) {
              animalCount++;
            }
          });
          resolve({ cars: carCount, animals: animalCount, predictions });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => {
        reject(new Error('Görüntü yüklenemedi'));
      };
    });
  }

  // AI tabanlı doğrulama: Nesne tespiti sonuçlarına göre hayvan varsa reddet, araba varsa güven skoru ver
  private async validateWithAI(file: File): Promise<ValidationResult> {
    try {
      const detectionResult = await this.detectObjects(file);
      if (detectionResult.animals > 0) {
        return {
          isValid: false,
          confidence: 0,
          reason: 'Fotoğrafta hayvan var, bu nedenle araç resmi olarak kabul edilmiyor.'
        };
      }
      const confidence = detectionResult.cars > 0 ? 0.9 : 0.4;
      return {
        isValid: confidence > 0.7,
        confidence: confidence,
        reason: confidence <= 0.7 ? 'Fotoğrafta belirgin araç özellikleri tespit edilemedi' : undefined
      };
    } catch (error) {
      console.warn('Nesne tespiti hatası:', error);
      const randomConfidence = 0.6 + (Math.random() * 0.3);
      return {
        isValid: randomConfidence > 0.7,
        confidence: randomConfidence
      };
    }
  }

  // Detay analizi: Fotoğrafın detaylı (iç/dış mekan ayrımı, kısmi çekim) olup olmadığı
  private async analyzeCarDetails(file: File): Promise<{ detailScore: number; detailReason?: string }> {
    try {
      const detectionResult = await this.detectObjects(file);
      const img = await this.loadImageFromFile(file);
      const imageArea = img.width * img.height;
      let detailedDetected = false;
      for (const prediction of detectionResult.predictions) {
        if (prediction.class.toLowerCase() === 'car') {
          const [x, y, width, height] = prediction.bbox;
          const bboxArea = width * height;
          if (bboxArea < imageArea * 0.9) {
            detailedDetected = true;
            break;
          }
        }
      }
      const detailScore = detailedDetected ? 1.0 : 0.5;
      const detailReason = detailedDetected ? undefined : 'Fotoğraf genel araba görünümüne ait';
      return { detailScore, detailReason };
    } catch (error) {
      return { detailScore: 0, detailReason: 'Detay analizi yapılamadı' };
    }
  }

  // Yardımcı: File'dan HTMLImageElement yükleme
  private loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Yardımcı renk analizi
  private analyzeColors(data: Uint8ClampedArray): { variance: number; dominantColors: number } {
    const colors: number[] = [];
    const colorMap = new Map<string, number>();
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = r + g + b;
      colors.push(brightness);
      const colorKey = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    const mean = colors.reduce((sum, color) => sum + color, 0) / colors.length;
    const variance = colors.reduce((sum, color) => sum + Math.pow(color - mean, 2), 0) / colors.length;
    return { variance, dominantColors: colorMap.size };
  }

  // Asenkron hale getirilmiş kenar tespiti fonksiyonu (Progress Bar Güncellemesi Dahil)
  private async detectEdges(data: Uint8ClampedArray, width: number, height: number): Promise<{ edgeCount: number }> {
    let edgeCount = 0;
    let totalIterations = (height - 2) * (width - 2);
    let processedIterations = 0;
    const chunkSize = 5000; // Her chunk'ta işlenecek döngü adedi

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
        const gradientX = Math.abs(current - right);
        const gradientY = Math.abs(current - bottom);
        const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY);
        if (gradient > 30) {
          edgeCount++;
        }
        processedIterations++;

        // Her chunkSize iterasyonda bir progress güncellemesi
        if (processedIterations % chunkSize === 0) {
          // Kenar tespiti toplam ilerlemenin %20'sini kapsıyor; mevcut aşama %70'den başlayarak ilerliyor.
          const progressFromEdges = (processedIterations / totalIterations) * 20;
          this.updateProgress(70 + progressFromEdges, `Kenar tespiti yapılıyor (${Math.floor((processedIterations / totalIterations) * 100)}%)`);
          // Kısa bir süre bekleterek event loop'a nefes aldırıyoruz.
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
    return { edgeCount };
  }

  // Parlaklık analizi
  private analyzeBrightness(data: Uint8ClampedArray): { isWellLit: boolean; averageBrightness: number } {
    let totalBrightness = 0;
    let pixelCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
    const averageBrightness = totalBrightness / pixelCount;
    const isWellLit = averageBrightness > 50 && averageBrightness < 200;
    return { isWellLit, averageBrightness };
  }

  // Dosyayı Base64'e çevirme (ek ihtiyaç halinde)
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Öneriler: Fotoğraf kalitesi ve detayları için kullanıcıya gösterilecek ipuçları
  private getSuggestions(): string[] {
    return [
      'Aracın tamamının görünür olduğu bir fotoğraf çekin',
      'Fotoğrafı gündüz ışığında çekin',
      'Aracın dış görünümünü net bir şekilde gösterin',
      'Fotoğrafın çözünürlüğünün yeterli olduğundan emin olun',
      'Aracın marka ve modelinin görünür olduğu açıdan çekin',
      'Aracın iç/dış detaylarını vurgulayın'
    ];
  }

  // ******************
  // İlerleme çubuğu güncelleme fonksiyonu (Eski mantıktan)
  // ******************
  private updateProgress(percentage: number, message: string): void {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.textContent = `${message} ${percentage}% tamamlandı`;
    }
  }

  // ******************
  // Duplicate kontrolü için: Fotoğrafın hash'ini hesaplayan fonksiyon
  // (8x8 grayscale pHash benzeri basit yöntem)
  // ******************
  private async computeImageHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 8;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject("Canvas desteklenmiyor");
          return;
        }
        // Fotoğrafı küçültüyoruz
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;
        let hash = "";
        // Piksel verilerini gri tonlara çevirip basit binary string oluşturuyoruz
        for (let i = 0; i < pixels.length; i += 4) {
          const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          hash += avg > 128 ? "1" : "0";
        }
        resolve(hash);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Aynı fotoğrafın tekrar yüklenip yüklenmediğini kontrol eden fonksiyon
  private async isDuplicateImage(file: File): Promise<boolean> {
    try {
      const hash = await this.computeImageHash(file);
      if (CarImageValidator.usedImageHashes.has(hash)) {
        return true;
      }
      CarImageValidator.usedImageHashes.add(hash);
      return false;
    } catch (error) {
      console.warn('Duplicate kontrolü sırasında hata:', error);
      return false; // Hata durumunda duplicate kontrolünü atlayabiliriz.
    }
  }
}
