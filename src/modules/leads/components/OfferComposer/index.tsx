import { useState } from 'react';
import { Mail } from 'lucide-react';
import type { Lead } from '../../types';
import { LeadSource } from '../../types';
import { PrepareOfferBtn } from './styles';
import { OfferComposerModal } from './OfferComposerModal';

interface OfferComposerProps {
  lead: Lead;
}

export function OfferComposer({ lead }: OfferComposerProps) {
  const [open, setOpen] = useState(false);

  if (lead.source !== LeadSource.EMAIL) return null;

  return (
    <>
      <PrepareOfferBtn onClick={() => setOpen(true)}>
        <Mail />
        Przygotuj ofertę
      </PrepareOfferBtn>
      {open && (
        <OfferComposerModal lead={lead} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
