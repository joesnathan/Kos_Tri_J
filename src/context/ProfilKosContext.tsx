'use client';

import React, { createContext, useContext, useState } from 'react';

interface ProfilKos {
  namaKos: string;
  nomorHp: string;
  alamat: string;
  kota: string;
  kodePos: string;
  website: string;
  logoUrl: string | null;
}

interface ProfilKosContextType {
  profil: ProfilKos;
  setProfil: (profil: ProfilKos) => void;
}

const ProfilKosContext = createContext<ProfilKosContextType | undefined>(undefined);

export function ProfilKosProvider({
  children,
  initialProfil,
}: {
  children: React.ReactNode;
  initialProfil: ProfilKos;
}) {
  const [profil, setProfil] = useState<ProfilKos>(initialProfil);
  return (
    <ProfilKosContext.Provider value={{ profil, setProfil }}>
      {children}
    </ProfilKosContext.Provider>
  );
}

export function useProfilKos() {
  const context = useContext(ProfilKosContext);
  if (context === undefined) {
    return {
      profil: {
        namaKos: 'Kos Tri J',
        nomorHp: '081234567890',
        alamat: 'Jl. Mawar No. 12, Kebayoran Baru',
        kota: 'Jakarta Selatan',
        kodePos: '12345',
        website: 'https://kosmaju.com',
        logoUrl: '/images/default-logo.png',
      },
      setProfil: () => {},
    };
  }
  return context;
}
