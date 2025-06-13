// Validation tip tanımlamaları

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason?: string;
  suggestions?: string[];
}

export interface ValidationDetails {
  basicValidation: ValidationResult;
  imageAnalysis: ValidationResult;
  aiValidation: ValidationResult;
}

export interface FileWithValidation extends File {
  validation?: ValidationResult;
  preview?: string;
}

export interface ColorAnalysis {
  variance: number;
  dominantColors: number;
  averageBrightness: number;
}

export interface EdgeAnalysis {
  edgeCount: number;
  edgeDensity: number;
}

export interface BrightnessAnalysis {
  isWellLit: boolean;
  averageBrightness: number;
  contrastLevel: number;
}