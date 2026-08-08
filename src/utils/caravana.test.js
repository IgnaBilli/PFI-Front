import { describe, expect, it } from 'vitest';
import { generateCaravanas, nameInitials } from './caravana.js';

describe('nameInitials', () => {
  it('takes the first two letters, uppercased', () => {
    expect(nameInitials('Estancia El Refugio')).toBe('ES');
    expect(nameInitials('Lote Norte')).toBe('LO');
  });

  it('skips non-letter characters at the start', () => {
    expect(nameInitials('  #7 Potrero')).toBe('PO');
  });

  it('falls back to "XX" when there are no letters at all', () => {
    expect(nameInitials('')).toBe('XX');
    expect(nameInitials(null)).toBe('XX');
    expect(nameInitials('123')).toBe('XX');
  });
});

describe('generateCaravanas', () => {
  it('combines estancia + potrero initials with a sequential number after the current herd', () => {
    const codes = generateCaravanas({
      estanciaName: 'Estancia El Refugio',
      paddockName: 'Lote Norte',
      startCount: 2,
      quantity: 3,
      existingCaravanas: [],
    });
    expect(codes).toEqual(['ESLO003', 'ESLO004', 'ESLO005']);
  });

  it('starts at 001 when the paddock has no animals yet', () => {
    const codes = generateCaravanas({
      estanciaName: 'Estancia El Refugio',
      paddockName: 'Lote Norte',
      startCount: 0,
      quantity: 1,
      existingCaravanas: [],
    });
    expect(codes).toEqual(['ESLO001']);
  });

  it('falls back to "SP" when no paddock is selected', () => {
    const codes = generateCaravanas({
      estanciaName: 'Estancia El Refugio',
      paddockName: '',
      startCount: 0,
      quantity: 1,
      existingCaravanas: [],
    });
    expect(codes).toEqual(['ESSP001']);
  });

  it('skips over codes that already exist, case-insensitively, to guarantee uniqueness', () => {
    const codes = generateCaravanas({
      estanciaName: 'Estancia El Refugio',
      paddockName: 'Lote Norte',
      startCount: 0,
      quantity: 2,
      existingCaravanas: ['eslo001', 'ESLO002'],
    });
    expect(codes).toEqual(['ESLO003', 'ESLO004']);
  });

  it('never produces duplicates within the same batch even after skipping collisions', () => {
    const codes = generateCaravanas({
      estanciaName: 'Estancia El Refugio',
      paddockName: 'Lote Norte',
      startCount: 0,
      quantity: 4,
      existingCaravanas: ['ESLO002', 'ESLO003'],
    });
    expect(codes).toEqual(['ESLO001', 'ESLO004', 'ESLO005', 'ESLO006']);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
