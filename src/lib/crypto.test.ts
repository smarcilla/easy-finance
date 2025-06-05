import { computeHash } from './crypto';

describe('computeHash', () => {
    it('debe calcular correctamente el hash SHA-256', () => {
        const input = 'Hola Mundo';
        const expectedHash = 'c3a4a2e49d91f2177113a9adfcb9ef9af9679dc4557a0a3a4602e1bd39a6f481';
        
        const result = computeHash(input);
        expect(result).toBe(expectedHash);
    });

    it('debe producir hashes diferentes para entradas diferentes', () => {
        const input1 = 'Hola Mundo';
        const input2 = 'Hola Mundo!';
        
        const hash1 = computeHash(input1);
        const hash2 = computeHash(input2);
        
        expect(hash1).not.toBe(hash2);
    });

    it('debe producir el mismo hash para la misma entrada', () => {
        const input = 'Hola Mundo';
        const hash1 = computeHash(input);
        const hash2 = computeHash(input);
        
        expect(hash1).toBe(hash2);
    });
});
