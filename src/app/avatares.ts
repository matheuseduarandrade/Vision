/** Catálogo de avatares (caricaturas). Para trocar um nome ou imagem, edite aqui e substitua o arquivo em src/assets/avatars/. */
export interface Avatar { id: string; nome: string; caminho: string; }

export const AVATARES: Avatar[] = [
  { id: 'avatar_001', nome: 'Avatar 01', caminho: 'assets/avatars/avatar-001.webp' },
  { id: 'avatar_002', nome: 'Avatar 02', caminho: 'assets/avatars/avatar-002.webp' },
  { id: 'avatar_003', nome: 'Avatar 03', caminho: 'assets/avatars/avatar-003.webp' },
  { id: 'avatar_004', nome: 'Avatar 04', caminho: 'assets/avatars/avatar-004.webp' },
  { id: 'avatar_005', nome: 'Avatar 05', caminho: 'assets/avatars/avatar-005.webp' },
  { id: 'avatar_006', nome: 'Avatar 06', caminho: 'assets/avatars/avatar-006.webp' },
  { id: 'avatar_007', nome: 'Avatar 07', caminho: 'assets/avatars/avatar-007.webp' },
  { id: 'avatar_008', nome: 'Avatar 08', caminho: 'assets/avatars/avatar-008.webp' },
  { id: 'avatar_009', nome: 'Avatar 09', caminho: 'assets/avatars/avatar-009.webp' },
  { id: 'avatar_010', nome: 'Avatar 10', caminho: 'assets/avatars/avatar-010.webp' },
  { id: 'avatar_011', nome: 'Avatar 11', caminho: 'assets/avatars/avatar-011.webp' },
  { id: 'avatar_012', nome: 'Avatar 12', caminho: 'assets/avatars/avatar-012.webp' },
  { id: 'avatar_013', nome: 'Avatar 13', caminho: 'assets/avatars/avatar-013.webp' },
  { id: 'avatar_014', nome: 'Avatar 14', caminho: 'assets/avatars/avatar-014.webp' },
  { id: 'avatar_015', nome: 'Avatar 15', caminho: 'assets/avatars/avatar-015.webp' },
  { id: 'avatar_016', nome: 'Avatar 16', caminho: 'assets/avatars/avatar-016.webp' },
  { id: 'avatar_017', nome: 'Avatar 17', caminho: 'assets/avatars/avatar-017.webp' },
  { id: 'avatar_018', nome: 'Avatar 18', caminho: 'assets/avatars/avatar-018.webp' },
  { id: 'avatar_019', nome: 'Avatar 19', caminho: 'assets/avatars/avatar-019.webp' },
  { id: 'avatar_020', nome: 'Avatar 20', caminho: 'assets/avatars/avatar-020.webp' },
  { id: 'avatar_021', nome: 'Avatar 21', caminho: 'assets/avatars/avatar-021.webp' }
];

export const avatarPorId = (id: string | null | undefined): Avatar | undefined => AVATARES.find(a => a.id === id);
