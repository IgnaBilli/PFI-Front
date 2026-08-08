const CARAVANA_SEQUENCE_DIGITS = 3;

export function nameInitials(name) {
  const letters = String(name || '').replace(/[^a-zA-Z]/g, '');
  return (letters.slice(0, 2) || 'XX').toUpperCase();
}

// Caravana automática: 2 primeras letras de la estancia + 2 primeras letras
// del potrero + número secuencial según cuántos animales ya tiene ese
// potrero. No depende de ningún contador del backend: la unicidad se
// garantiza acá mismo probando contra las caravanas ya cargadas
// (existingCaravanas) y avanzando el secuencial hasta encontrar una libre.
export function generateCaravanas({ estanciaName, paddockName, startCount, quantity, existingCaravanas }) {
  const prefix = `${nameInitials(estanciaName)}${paddockName ? nameInitials(paddockName) : 'SP'}`;
  const used = new Set(existingCaravanas.map((c) => String(c).trim().toLowerCase()));
  const codes = [];
  let seq = Math.max(0, startCount) + 1;
  for (let i = 0; i < quantity; i += 1) {
    let candidate;
    do {
      candidate = `${prefix}${String(seq).padStart(CARAVANA_SEQUENCE_DIGITS, '0')}`;
      seq += 1;
    } while (used.has(candidate.toLowerCase()));
    used.add(candidate.toLowerCase());
    codes.push(candidate);
  }
  return codes;
}
