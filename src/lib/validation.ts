// Password validation rules
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: 'Şifre en az 8 karakter olmalıdır' };
  }

  if (password.length > 16) {
    return { isValid: false, error: 'Şifre en fazla 16 karakter olabilir' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Şifre en az bir büyük harf içermelidir' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Şifre en az bir küçük harf içermelidir' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Şifre en az bir rakam içermelidir' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Şifre en az bir özel karakter içermelidir (!@#$%^&*(),.?":{}|<>)' };
  }

  return { isValid: true };
};

// Password strength indicator
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character type checks
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  // Return score and corresponding label/color
  switch (score) {
    case 0:
    case 1:
      return { score, label: 'Çok Zayıf', color: 'bg-red-500' };
    case 2:
    case 3:
      return { score, label: 'Zayıf', color: 'bg-orange-500' };
    case 4:
      return { score, label: 'Orta', color: 'bg-yellow-500' };
    case 5:
      return { score, label: 'Güçlü', color: 'bg-green-500' };
    default:
      return { score: 6, label: 'Çok Güçlü', color: 'bg-green-600' };
  }
};