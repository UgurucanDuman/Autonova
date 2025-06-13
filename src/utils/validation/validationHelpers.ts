import { CarImageValidator } from './carImageValidator';

// Kolay kullanım için basit doğrulama
export const validateCarImage = async (file: File): Promise<boolean> => {
  const validator = CarImageValidator.getInstance();
  const result = await validator.validateCarImage(file);
  return result.isValid;
};

// Detaylı doğrulama sonucu
export const validateCarImageDetailed = async (file: File) => {
  const validator = CarImageValidator.getInstance();
  return await validator.validateCarImage(file);
};

// Toplu doğrulama
export const validateMultipleImages = async (files: File[]) => {
  const validator = CarImageValidator.getInstance();
  const results = [];
  
  for (const file of files) {
    const result = await validator.validateCarImage(file);
    results.push({ file, ...result });
  }
  
  return results;
};