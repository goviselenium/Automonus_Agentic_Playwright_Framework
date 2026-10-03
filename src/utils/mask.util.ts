import { frameworkConfig } from '../../config/framework.config';

export class MaskUtil {
  public static maskSensitiveData(input: string): string {
    if (!frameworkConfig.maskSensitiveData || !input) {
      return input;
    }

    let masked = input;
    for (const pattern of frameworkConfig.secretPatterns) {
      const regex = new RegExp(`(${pattern}\\s*[:=]\\s*)(['"]?)([^'"\\s]+)(['"]?)`, 'gi');
      masked = masked.replace(regex, '$1$2***MASKED***$4');
    }
    return masked;
  }
}
