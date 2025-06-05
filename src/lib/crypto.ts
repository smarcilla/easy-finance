import { createHash } from 'crypto';

/**
 * Calcula el hash SHA-256 de una cadena de texto y lo devuelve en formato hexadecimal.
 * @param input La cadena de texto a hashear
 * @returns El hash SHA-256 en formato hexadecimal
 */
export function computeHash(input: string): string {
    return createHash('sha256')
        .update(input)
        .digest('hex');
}

// Ejemplo de uso
if (require.main === module) {
    const testString = 'Hola Mundo';
    const hash = computeHash(testString);
    console.log(`Hash de "${testString}":`, hash);
}
