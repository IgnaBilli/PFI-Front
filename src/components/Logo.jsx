import logoFull from '../assets/logo-terrabovina.png';
import logoIcon from '../assets/logo-icon-terrabovina.png';

export default function Logo({ variant = 'full', size = 40, className = '' }) {
  if (variant === 'icon') {
    return (
      <img
        src={logoIcon}
        alt="TerraBovina"
        style={{ height: size, width: 'auto' }}
        className={className}
      />
    );
  }

  return (
    <img
      src={logoFull}
      alt="TerraBovina — Mejores decisiones"
      style={{ height: size, width: 'auto' }}
      className={className}
    />
  );
}
